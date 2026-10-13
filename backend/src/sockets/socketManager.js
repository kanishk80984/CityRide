const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const googleProvider = require('../services/maps/googleProvider');
const fareService = require('../services/fareService');
const walletService = require('../services/walletService');

let io;

// In-memory registries
const activeDrivers = new Map(); // driverId -> { socketId, latitude, longitude, isAvailable, isReconnecting }
const pendingRides = new Map(); // rideId -> { userId, status, timeout }
const driverDisconnectTimers = new Map(); // driverId -> { timer, sessionId, generationToken, disconnectedAt }
const driverSessions = new Map(); // driverId -> { sessionId, generationToken, socketId }

// Utility to calculate distance (Haversine formula in km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
].filter(Boolean);

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
        return callback(null, true); // Fallback to true to ensure mobile apps don't break
      },
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    if (socket.handshake.query && socket.handshake.query.token) {
      jwt.verify(socket.handshake.query.token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.decoded = decoded; // Contains id and possibly role
        next();
      });
    }
    else {
      next(new Error('Authentication error'));
    }
  }).on('connection', (socket) => {
    const userId = socket.decoded.id;
    const userRole = socket.decoded.role || 'USER';
    console.log(`User connected: ${userId} (${userRole})`);

    socket.join(`user_${userId}`);

    // Track Driver Sessions
    let sessionId = null;

    if (userRole === 'DRIVER') {
      const currentGenToken = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      socket.driverGenToken = currentGenToken;

      // Check if driver is reconnecting within the grace period
      if (driverDisconnectTimers.has(userId)) {
        const pending = driverDisconnectTimers.get(userId);
        clearTimeout(pending.timer);
        driverDisconnectTimers.delete(userId);
        sessionId = pending.sessionId;

        driverSessions.set(userId, {
          sessionId,
          generationToken: currentGenToken,
          socketId: socket.id
        });

        console.log(`[Socket] Driver ${userId} reconnected within grace period. Restored session ${sessionId}`);

        // Update active driver socket id if present
        if (activeDrivers.has(userId)) {
          const cached = activeDrivers.get(userId);
          cached.socketId = socket.id;
          cached.isReconnecting = false;
        }
      } else {
        // Fresh online connection
        pool.execute('UPDATE drivers SET is_online = 1 WHERE id = ?', [userId]).catch(err => console.error(err));

        pool.execute('INSERT INTO driver_sessions (driver_id) VALUES (?)', [userId]).then(([result]) => {
          sessionId = result.insertId;
          driverSessions.set(userId, {
            sessionId,
            generationToken: currentGenToken,
            socketId: socket.id
          });
          console.log(`Started session ${sessionId} for driver ${userId}`);
        }).catch(err => console.error('Error starting driver session:', err));
      }

      pool.execute(`
        SELECT d.parcel_orders_enabled, d.short_ride_enabled, d.long_ride_enabled, d.one_way_enabled, d.two_way_enabled, v.vehicle_type_id, ds.status as sub_status, ds.expires_at, ds.free_short_rides_remaining, ds.free_long_rides_remaining, ds.free_one_way_rides_remaining, ds.free_two_way_rides_remaining
        FROM drivers d 
        LEFT JOIN vehicles v ON d.id = v.driver_id 
        LEFT JOIN driver_subscriptions ds ON d.id = ds.driver_id
        WHERE d.id = ? 
        ORDER BY ds.id DESC LIMIT 1
      `, [userId])
        .then(([rows]) => {
          if (rows.length > 0) {
            const r = rows[0];
            const isSubActive = r.sub_status === 'ACTIVE' && new Date() < new Date(r.expires_at);
            socket.driverMeta = {
              parcel_orders_enabled: !!r.parcel_orders_enabled,
              vehicle_type_id: r.vehicle_type_id,
              short_ride_enabled: !!r.short_ride_enabled,
              long_ride_enabled: !!r.long_ride_enabled,
              one_way_enabled: !!r.one_way_enabled,
              two_way_enabled: !!r.two_way_enabled,
            };
          }
        }).catch(err => console.error('Error fetching driver meta:', err));
    }

    // Automatically re-join active ride rooms on reconnect
    for (const [rideId, rideState] of pendingRides.entries()) {
      if (userRole === 'USER' && rideState.userId === userId) {
        socket.join(rideId);
        console.log(`User ${userId} automatically rejoined room ${rideId}`);
      } else if (userRole === 'DRIVER' && rideState.driverId === userId) {
        socket.join(rideId);
        console.log(`Driver ${userId} automatically rejoined room ${rideId}`);
      }
    }

    // --- DRIVER LOCATION TRACKING ---
    socket.on('driver:location', (data) => {
      // Validate GPS data
      if (
        typeof data.latitude !== 'number' || typeof data.longitude !== 'number' ||
        data.latitude < -90 || data.latitude > 90 ||
        data.longitude < -180 || data.longitude > 180
      ) {
        console.warn(`Invalid location data from driver ${userId}`);
        return;
      }

      // If there was a pending disconnect timer for this driver, cancel it
      if (driverDisconnectTimers.has(userId)) {
        const pending = driverDisconnectTimers.get(userId);
        clearTimeout(pending.timer);
        driverDisconnectTimers.delete(userId);
      }

      // Verify if driver is currently assigned to an active ride
      let assignedRideId = null;
      for (const [rideId, rideState] of pendingRides.entries()) {
        if (rideState.driverId === userId && (rideState.status === 'ACCEPTED' || rideState.status === 'STARTED')) {
          assignedRideId = rideId;
          break;
        }
      }

      // Save/update driver location in memory
      activeDrivers.set(userId, {
        socketId: socket.id,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading || 0,
        speed: data.speed || 0,
        rideId: assignedRideId,
        timestamp: Date.now(),
        isAvailable: assignedRideId === null,
        isReconnecting: false,
        parcel_orders_enabled: socket.driverMeta ? socket.driverMeta.parcel_orders_enabled : false,
        vehicle_type_id: socket.driverMeta ? socket.driverMeta.vehicle_type_id : null,
        short_ride_enabled: socket.driverMeta ? socket.driverMeta.short_ride_enabled : false,
        long_ride_enabled: socket.driverMeta ? socket.driverMeta.long_ride_enabled : false,
        one_way_enabled: socket.driverMeta ? socket.driverMeta.one_way_enabled : false,
        two_way_enabled: socket.driverMeta ? socket.driverMeta.two_way_enabled : false
      });

      if (assignedRideId) {
        // Securely emit ONLY to the correct ride room
        io.to(assignedRideId).emit('driver:location_update', {
          driverId: userId,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading || 0,
          speed: data.speed || 0,
          timestamp: Date.now()
        });
      }
    });

    // --- DRIVER EXPLICIT OFFLINE ---
    socket.on('driver:offline', async () => {
      if (userRole !== 'DRIVER') return;
      console.log(`[Socket] Driver ${userId} explicitly requested offline.`);

      if (driverDisconnectTimers.has(userId)) {
        const pending = driverDisconnectTimers.get(userId);
        clearTimeout(pending.timer);
        driverDisconnectTimers.delete(userId);
      }

      const sessionInfo = driverSessions.get(userId);
      driverSessions.delete(userId);
      activeDrivers.delete(userId);
      io.emit('driver:offline', { driverId: userId });

      try {
        await pool.execute('UPDATE drivers SET is_online = 0 WHERE id = ?', [userId]);
        const sId = sessionInfo ? sessionInfo.sessionId : sessionId;
        if (sId) {
          await pool.execute(
            `UPDATE driver_sessions SET logout_time = NOW(), session_duration_minutes = TIMESTAMPDIFF(MINUTE, login_time, NOW()) WHERE id = ?`,
            [sId]
          );
          console.log(`Explicit offline: Ended session ${sId} for driver ${userId}`);
        }
      } catch (err) {
        console.error('Error handling explicit driver offline:', err);
      }
    });

    socket.on('user:get_nearby_drivers', (data) => {
      const { latitude, longitude, vehicle_type_id, isParcel } = data;
      if (!latitude || !longitude) return;

      const nearbyDrivers = [];
      for (const [dId, driverObj] of activeDrivers.entries()) {
        if (!driverObj.isAvailable) continue;
        
        if (isParcel) {
          if (!driverObj.parcel_orders_enabled) continue;
        } else {
          if (vehicle_type_id && driverObj.vehicle_type_id != vehicle_type_id) continue;
        }
        
        const dist = calculateDistance(latitude, longitude, driverObj.latitude, driverObj.longitude);
        if (dist <= 2) { // within 2 km
          nearbyDrivers.push({
            id: dId,
            latitude: driverObj.latitude,
            longitude: driverObj.longitude,
            heading: driverObj.heading,
            vehicle_type_id: driverObj.vehicle_type_id
          });
        }
      }
      socket.emit('user:nearby_drivers', nearbyDrivers);
    });

    // --- USER REQUESTS A RIDE ---
    socket.on('ride:request', async (data) => {
      console.log('Ride requested by user:', userId, data);

      const rideId = `ride_${Date.now()}_${userId}`;
      const { pickup, drop, vehicle_type_id, estimated_fare } = data;

      // Customer securely joins the specific ride room
      socket.join(rideId);
      console.log(`User ${userId} joined room ${rideId}`);

      const isParcel = Boolean(data.isParcel);
      
      let finalTripType = null;
      if (!isParcel) {
        if (data.trip_type !== 'ONE_WAY' && data.trip_type !== 'TWO_WAY') {
          socket.emit('ride:error', { message: 'Invalid or missing trip_type. Must be ONE_WAY or TWO_WAY.' });
          return;
        }
        finalTripType = data.trip_type;
      }
      
      let finalDistanceType = null;
      let serverRouteDistanceKm = 0;
      if (!isParcel) {
        try {
          const routeResult = await googleProvider.route(pickup, drop);
          serverRouteDistanceKm = routeResult.distanceKm;

          // Obtain threshold
          const [configRows] = await pool.query("SELECT setting_value FROM global_settings WHERE setting_key = 'short_ride_max_distance' OR setting_key = 'short_ride_max_distance_km' LIMIT 1");
          
          if (configRows.length === 0 || !configRows[0].setting_value || isNaN(parseFloat(configRows[0].setting_value))) {
            socket.emit('ride:error', { message: 'Ride configuration unavailable. Please try again later.' });
            return;
          }
          
          const threshold = parseFloat(configRows[0].setting_value);

          if (serverRouteDistanceKm <= threshold) {
            finalDistanceType = 'SHORT';
          } else {
            finalDistanceType = 'LONG';
          }
        } catch (error) {
          socket.emit('ride:error', { message: 'Unable to calculate route.' });
          return;
        }
      }

      const searchSessionId = `session_${Date.now()}`;

      const rideState = {
        userId,
        status: 'SEARCHING',
        pickup,
        drop,
        vehicle_type_id,
        estimated_fare,
        isParcel,
        recipient_name: data.recipient_name || null,
        recipient_phone: data.recipient_phone || null,
        parcel_description: data.parcel_description || null,
        notifiedDriverIds: new Set(),
        searchSessionId,
        timers: [],
        trip_type: finalTripType,
        distance_type: finalDistanceType,
        ...data,
        // MUST be assigned AFTER ...data to prevent client spoofing
        serverRouteDistanceKm: serverRouteDistanceKm
      };
      pendingRides.set(rideId, rideState);

      const SEARCH_STAGES = [
        { stage: 1, minRadiusKm: 0, maxRadiusKm: 2 },
        { stage: 2, minRadiusKm: 1, maxRadiusKm: 4 },
        { stage: 3, minRadiusKm: 1, maxRadiusKm: 8 },
      ];

      // Helper to find drivers in a specific distance ring excluding already notified
      const findDriversInRange = (minKm, maxKm, notifiedSet) => {
        const matchingDrivers = [];
        for (const [dId, driverObj] of activeDrivers.entries()) {
          if (!driverObj.isAvailable) continue;
          if (notifiedSet.has(dId)) continue;

          if (isParcel) {
            if (!driverObj.parcel_orders_enabled) continue;
          } else {
            if (driverObj.vehicle_type_id != vehicle_type_id) continue;
            // Distance matching
            const noDistancePreference = !driverObj.short_ride_enabled && !driverObj.long_ride_enabled;
            if (!noDistancePreference) {
              if (finalDistanceType === 'SHORT' && !driverObj.short_ride_enabled) continue;
              if (finalDistanceType === 'LONG' && !driverObj.long_ride_enabled) continue;
            }
            
            // Trip Type matching
            const noTripPreference = !driverObj.one_way_enabled && !driverObj.two_way_enabled;
            if (!noTripPreference) {
              if (finalTripType === 'ONE_WAY' && !driverObj.one_way_enabled) continue;
              if (finalTripType === 'TWO_WAY' && !driverObj.two_way_enabled) continue;
            }
          }

          const dist = calculateDistance(pickup.latitude, pickup.longitude, driverObj.latitude, driverObj.longitude);
          if (dist >= minKm && dist <= maxKm) {
            matchingDrivers.push({ id: dId, socketId: driverObj.socketId, distance: dist });
          }
        }
        return matchingDrivers;
      };

      const executeSearchStage = (stageIndex) => {
        const state = pendingRides.get(rideId);
        if (!state || state.status !== 'SEARCHING' || state.searchSessionId !== searchSessionId) return;

        if (stageIndex >= SEARCH_STAGES.length) {
          console.log(`Ride ${rideId} failed. Drivers busy or unavailable.`);
          io.to(`user_${userId}`).emit('ride:failed', { message: 'All drivers are currently busy. Please try again in a few moments.' });
          pendingRides.delete(rideId);
          return;
        }

        const stageConfig = SEARCH_STAGES[stageIndex];

        io.to(`user_${userId}`).emit('ride:search_stage', {
          rideId,
          stage: stageConfig.stage,
          totalStages: SEARCH_STAGES.length,
          minRadiusKm: stageConfig.minRadiusKm,
          maxRadiusKm: stageConfig.maxRadiusKm
        });

        const drivers = findDriversInRange(stageConfig.minRadiusKm, stageConfig.maxRadiusKm, state.notifiedDriverIds);
        console.log(`[RideSearch] rideId=${rideId} stage=${stageConfig.stage} range=${stageConfig.minRadiusKm}-${stageConfig.maxRadiusKm}km newDriversNotified=${drivers.length}`);

        if (drivers.length > 0) {
          drivers.forEach(d => {
            state.notifiedDriverIds.add(d.id);
            const payload = { 
              rideId, 
              isParcel, 
              pickup, 
              drop, 
              estimated_fare,
              vehicle_name: state.vehicle_name || 'Car',
              tip: state.tip || 0,
              distance: state.distance || 0,
              duration: state.duration || 0,
              driver_distance: d.distance ? d.distance.toFixed(1) : 0,
              trip_type: state.trip_type || 'ONE_WAY'
            };
            if (isParcel) {
              payload.parcel_description = data.parcel_description;
              payload.recipient_name = data.recipient_name;
            }
            io.to(d.socketId).emit('ride:new_request', payload);
          });
        }

        const timer = setTimeout(() => {
          executeSearchStage(stageIndex + 1);
        }, 10000); // 10 seconds per stage

        state.timers.push(timer);
      };

      executeSearchStage(0);
    });

    // --- DRIVER ACCEPTS A RIDE ---
    socket.on('ride:accept', async (data) => {
      const { rideId } = data;
      const rideState = pendingRides.get(rideId);

      // Async wallet eligibility check before claiming the ride
      let walletSufficient = true;
      if (rideState && rideState.status === 'SEARCHING' && !rideState.isParcel) {
         try {
           const fareResult = await fareService.calculateFare(rideState.vehicle_type_id || 1, rideState.serverRouteDistanceKm, rideState.trip_type, 0);
           
           let tipAmount = 0;
           if (rideState.tip && !isNaN(rideState.tip) && Number(rideState.tip) > 0) {
             tipAmount = Number(rideState.tip);
           }
           
           const commissions = await fareService.calculateCommission(fareResult.finalFare, rideState.distance_type, tipAmount);
           let requiredCommission = commissions.totalCommission;
           
           // Check for Free Trial
           const [subs] = await pool.query(
             `SELECT * FROM driver_subscriptions 
              WHERE driver_id = ? AND status = 'ACTIVE' 
              ORDER BY id DESC LIMIT 1`,
             [userId]
           );
           
           if (subs.length > 0) {
             let distanceCol = rideState.distance_type === 'SHORT' ? 'free_short_rides_remaining' : 'free_long_rides_remaining';
             if (subs[0][distanceCol] > 0) {
               requiredCommission = 0;
             }
           }
           
           const [walletRows] = await pool.query('SELECT balance FROM driver_wallets WHERE driver_id = ?', [userId]);
           const walletBalance = walletRows.length > 0 ? Number(walletRows[0].balance) : 0;
           
           if (walletBalance < requiredCommission) {
             walletSufficient = false;
           }
         } catch (e) {
             walletSufficient = false;
             console.error("[RideAccept] Error checking wallet eligibility:", e);
         }
      }

      // Atomic check in Node.js single-threaded memory
      if (rideState && rideState.status === 'SEARCHING') {
        if (!walletSufficient) {
          console.log(`[RideAccept] rideId=${rideId} driverId=${userId} result=REJECTED_INSUFFICIENT_WALLET`);
          socket.emit('driver:ride_accept_rejected', {
            rideId,
            reason: 'INSUFFICIENT_WALLET',
            message: 'Insufficient wallet balance. Please recharge your wallet to accept this ride.'
          });
          return;
        }

        // Concurrency protection: verify driver hasn't accepted another ride while we were checking wallet
        let isAlreadyAssigned = false;
        for (const [rId, state] of pendingRides.entries()) {
          if (state.driverId === userId && (state.status === 'ACCEPTED' || state.status === 'STARTED')) {
            isAlreadyAssigned = true;
            break;
          }
        }
        
        if (isAlreadyAssigned) {
          console.log(`[RideAccept] rideId=${rideId} driverId=${userId} result=REJECTED_ALREADY_ASSIGNED`);
          socket.emit('ride:error', { message: 'You are already assigned to an active ride.' });
          return;
        }

        console.log(`[RideAccept] rideId=${rideId} driverId=${userId} result=WINNER`);

        // Driver won the ride!
        rideState.status = 'ACCEPTED';
        rideState.driverId = userId;
        rideState.searchSessionId = null; // invalidates any pending search callbacks

        // Clear pending search timers
        if (rideState.timers && rideState.timers.length > 0) {
          rideState.timers.forEach(t => clearTimeout(t));
          rideState.timers = [];
        }

        // Notify all other drivers immediately
        if (rideState.notifiedDriverIds) {
          rideState.notifiedDriverIds.forEach(dId => {
            if (dId !== userId) {
              const otherDriver = activeDrivers.get(dId);
              if (otherDriver) {
                io.to(otherDriver.socketId).emit('ride:accepted_by_other', { rideId, driverId: userId });
              }
            }
          });
          // Cleanup notification tracking
          rideState.notifiedDriverIds.clear();
        }

        // Fetch user ride_otp from users table (persistent per user)
        let otp;
        const [userOtpRows] = await pool.query('SELECT ride_otp FROM users WHERE id = ?', [rideState.userId]);
        if (userOtpRows.length > 0 && userOtpRows[0].ride_otp) {
          otp = userOtpRows[0].ride_otp.toString();
        } else {
          // If not yet generated, create a 4-digit OTP and save in users table
          otp = Math.floor(1000 + Math.random() * 9000).toString();
          await pool.query('UPDATE users SET ride_otp = ? WHERE id = ?', [otp, rideState.userId]);
        }
        rideState.otp = otp;

        // Driver securely joins the specific ride room
        socket.join(rideId);
        console.log(`Driver ${userId} joined room ${rideId} and accepted ride ${rideId} with user persistent OTP ${otp}`);

        // Fetch driver details
        const [driverRows] = await pool.query('SELECT name, phone, profile_photo FROM drivers WHERE id = ?', [userId]);
        const [vehicleRows] = await pool.query('SELECT v.registration_number, v.make, v.model, v.color, vt.name as category FROM vehicles v JOIN vehicle_types vt ON v.vehicle_type_id = vt.id WHERE v.driver_id = ?', [userId]);

        const driverData = {
          name: driverRows[0]?.name || 'Driver Assigned',
          phone: driverRows[0]?.phone || '',
          photo: driverRows[0]?.profile_photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          vehicleName: vehicleRows[0]?.category || 'Vehicle',
          registrationNumber: vehicleRows[0]?.registration_number || '',
          make: vehicleRows[0]?.make || '',
          model: vehicleRows[0]?.model || '',
          color: vehicleRows[0]?.color || ''
        };

        rideState.driver = driverData;

        const driverObj = activeDrivers.get(userId);
        const driverLocation = driverObj ? {
          latitude: driverObj.latitude,
          longitude: driverObj.longitude,
          heading: driverObj.heading || 0
        } : null;

        // Notify the User that a driver accepted and send the OTP
        io.to(`user_${rideState.userId}`).emit('ride:accepted', {
          rideId,
          driverId: userId,
          otp,
          message: 'Your driver is on the way!',
          driver: driverData,
          driverLocation
        });
        // Fetch user details to provide phone number to the driver
        const [userRows] = await pool.query('SELECT phone FROM users WHERE id = ?', [rideState.userId]);
        const userPhone = userRows[0]?.phone || '';

        rideState.user_phone = userPhone;

        // Confirm to the winning Driver
        const driverConfirmationPayload = {
          rideId,
          success: true,
          user_phone: userPhone,
          trip_type: rideState.trip_type || 'ONE_WAY',
        };
        if (rideState.isParcel) {
          driverConfirmationPayload.recipient_phone = rideState.recipient_phone;
          driverConfirmationPayload.recipient_name = rideState.recipient_name;
        }

        // Insert or link initial ride record in DB with ride_session_id
        try {
          await pool.query('SET FOREIGN_KEY_CHECKS = 0');
          await pool.execute(
            `INSERT INTO rides 
            (ride_session_id, user_id, driver_id, vehicle_type_id, ride_type_id, pickup_lat, pickup_lng, pickup_address, drop_lat, drop_lng, drop_address, distance_km, estimated_fare, status, is_parcel, recipient_name, recipient_phone, parcel_description, trip_type, distance_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACCEPTED', ?, ?, ?, ?, ?, ?)`,
            [
              rideId,
              rideState.userId,
              userId,
              rideState.vehicle_type_id || 1,
              1,
              rideState.pickup?.latitude || 0,
              rideState.pickup?.longitude || 0,
              rideState.pickup?.address || 'Unknown Pickup',
              rideState.drop?.latitude || 0,
              rideState.drop?.longitude || 0,
              rideState.drop?.address || 'Unknown Drop',
              rideState.serverRouteDistanceKm || 0,
              rideState.estimated_fare || 50,
              rideState.isParcel || false,
              rideState.recipient_name || null,
              rideState.recipient_phone || null,
              rideState.parcel_description || null,
              rideState.trip_type || 'ONE_WAY',
              rideState.distance_type || 'SHORT'
            ]
          );
          await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (dbErr) {
          console.warn('Initial ride insertion on accept:', dbErr.message);
        }

        socket.emit('ride:confirmed', driverConfirmationPayload);
        // Mark driver as busy
        if (driverObj) driverObj.isAvailable = false;

      } else {
        console.log(`[RideAccept] rideId=${rideId} driverId=${userId} result=ALREADY_ACCEPTED`);
        socket.emit('ride:already_accepted', { rideId, message: 'This ride was accepted by another driver.' });
      }
    });

    // --- DRIVER ARRIVES AT PICKUP ---
    socket.on('ride:arrived', (data) => {
      const { rideId } = data;
      const rideState = pendingRides.get(rideId);

      if (!rideState) {
        socket.emit('ride:error', { message: 'Ride not found.' });
        return;
      }

      if (rideState.driverId !== userId) {
        socket.emit('ride:error', { message: 'Not authorized for this ride.' });
        return;
      }

      if (rideState.status !== 'ACCEPTED') {
        socket.emit('ride:error', { message: `Cannot mark arrived. Ride is in state: ${rideState.status}` });
        return;
      }
      
      // Idempotency: if already arrived, just return existing timestamp
      if (rideState.arrived_at) {
        socket.emit('ride:arrived_success', { rideId, arrived_at: rideState.arrived_at });
        return;
      }

      // Server creates authoritative timestamp
      rideState.arrived_at = Date.now();
      
      console.log(`[RideArrived] rideId=${rideId} driverId=${userId} arrived_at=${rideState.arrived_at}`);

      // Emit success to driver
      socket.emit('ride:arrived_success', { rideId, arrived_at: rideState.arrived_at });
      
      // Notify passenger
      io.to(`user_${rideState.userId}`).emit('ride:driver_arrived', { 
        rideId, 
        message: 'Your driver has arrived!' 
      });
    });

    // --- DRIVER VERIFIES OTP TO START RIDE ---
    socket.on('ride:verify_otp', (data) => {
      const { rideId, otp } = data;
      const rideState = pendingRides.get(rideId);

      if (rideState && rideState.status === 'ACCEPTED' && rideState.driverId === userId) {
        if (rideState.otp === otp) {
          // OTP matched!
          rideState.status = 'STARTED';
          if (!rideState.started_at) {
            rideState.started_at = Date.now();
          }
          console.log(`Ride ${rideId} STARTED by driver ${userId} at ${rideState.started_at}`);

          // Notify both Driver and User
          const payloadDriver = { rideId, success: true };
          if (rideState.isParcel) {
            payloadDriver.recipient_phone = rideState.recipient_phone;
          }

          socket.emit('ride:started', payloadDriver);
          io.to(`user_${rideState.userId}`).emit('ride:started', { rideId, message: 'Your ride has started!' });
        } else {
          // Invalid OTP
          socket.emit('ride:otp_failed', { rideId, message: 'Invalid OTP. Please check with the user.' });
        }
      } else {
        socket.emit('ride:otp_failed', { rideId, message: 'Ride not found or invalid state.' });
      }
    });

    // --- TWO-WAY RIDE: DRIVER ARRIVES AT INTERMEDIATE DROP LOCATION (START WAITING) ---
    socket.on('ride:intermediate_drop', async (data) => {
      const { rideId } = data;
      const rideState = pendingRides.get(rideId);

      if (rideState && rideState.status === 'STARTED' && rideState.driverId === userId && rideState.trip_type === 'TWO_WAY') {
        rideState.trip_stage = 'WAITING';
        rideState.waiting_started_at = Date.now();

        // Swap coordinates: Drop becomes new Pickup, original Pickup becomes new Drop
        const originalPickup = rideState.pickup;
        const originalDrop = rideState.drop;
        rideState.pickup = originalDrop;
        rideState.drop = originalPickup;

        // Fetch global waiting settings
        const [settingsRows] = await pool.execute(
          'SELECT setting_key, setting_value FROM global_settings WHERE setting_key IN ("free_waiting_minutes", "waiting_charge_per_minute", "max_waiting_charge", "waiting_charge_enabled", "waiting_time_km_tiers")'
        );
        const settings = {};
        settingsRows.forEach(row => {
          settings[row.setting_key] = row.setting_value;
        });

        // Dynamic tiered free waiting minutes calculation
        let freeMinutes = Number(settings['free_waiting_minutes']) || 0;
        const distanceKm = Number(rideState.serverRouteDistanceKm ?? rideState.distance_km ?? rideState.distance ?? 0);

        if (settings['waiting_time_km_tiers']) {
          try {
            const tiers = typeof settings['waiting_time_km_tiers'] === 'string'
              ? JSON.parse(settings['waiting_time_km_tiers'])
              : settings['waiting_time_km_tiers'];

            if (tiers && typeof tiers === 'object') {
              if (distanceKm <= 5 && tiers['1_5'] !== undefined && tiers['1_5'] !== '') {
                freeMinutes = Number(tiers['1_5']);
              } else if (distanceKm <= 10 && tiers['5_10'] !== undefined && tiers['5_10'] !== '') {
                freeMinutes = Number(tiers['5_10']);
              } else if (distanceKm <= 20 && tiers['10_20'] !== undefined && tiers['10_20'] !== '') {
                freeMinutes = Number(tiers['10_20']);
              } else if (distanceKm <= 50 && tiers['20_50'] !== undefined && tiers['20_50'] !== '') {
                freeMinutes = Number(tiers['20_50']);
              } else if (distanceKm <= 100 && tiers['50_100'] !== undefined && tiers['50_100'] !== '') {
                freeMinutes = Number(tiers['50_100']);
              } else if (distanceKm > 100) {
                // 100km+ rule: base 100km waiting time + extra km beyond 100
                const base100 = (tiers['100_base'] !== undefined && tiers['100_base'] !== '') ? Number(tiers['100_base']) : 100;
                freeMinutes = base100 + Math.floor(distanceKm - 100);
              }
            }
          } catch (e) {
            console.error('Error parsing waiting_time_km_tiers in intermediate_drop:', e);
          }
        }

        const ratePerMin = Number(settings['waiting_charge_per_minute']) || 0;
        const maxCharge = Number(settings['max_waiting_charge']) || 0;
        const enabled = settings['waiting_charge_enabled'] === 'true';

        rideState.waiting_settings = { freeMinutes, ratePerMin, maxCharge, enabled };

        // Save server timestamp to DB for persistence and authoritative audit
        try {
          const startDate = new Date(rideState.waiting_started_at);
          await pool.query(
            'UPDATE rides SET waiting_started_at = ? WHERE ride_session_id = ?',
            [startDate, rideId]
          );
        } catch (dbErr) {
          console.warn('Could not update waiting_started_at in rides table:', dbErr.message);
        }

        const payload = {
          rideId,
          message: 'Arrived at destination. Waiting for user return...',
          waiting_started_at: rideState.waiting_started_at,
          server_time: Date.now(),
          freeMinutes,
          ratePerMin,
          maxCharge,
          enabled,
          pickup: rideState.pickup,
          drop: rideState.drop,
          trip_stage: 'WAITING'
        };

        socket.emit('ride:intermediate_arrived', payload);
        io.to(`user_${rideState.userId}`).emit('ride:intermediate_arrived', payload);
        console.log(`[TwoWay] Ride ${rideId} reached intermediate drop. FreeLimit=${freeMinutes}m, ServerTime=${rideState.waiting_started_at}`);
      }
    });

    // --- TWO-WAY RIDE: DRIVER STARTS RETURN TRIP ---
    socket.on('ride:start_return', async (data) => {
      const { rideId } = data;
      const rideState = pendingRides.get(rideId);

      if (rideState && rideState.trip_stage === 'WAITING' && rideState.driverId === userId && rideState.trip_type === 'TWO_WAY') {
        rideState.trip_stage = 'RETURN';
        rideState.waiting_ended_at = Date.now();

        // Save server end timestamp to DB
        try {
          const endDate = new Date(rideState.waiting_ended_at);
          await pool.query(
            'UPDATE rides SET waiting_ended_at = ? WHERE ride_session_id = ?',
            [endDate, rideId]
          );
        } catch (dbErr) {
          console.warn('Could not update waiting_ended_at in rides table:', dbErr.message);
        }

        let totalWaitMs = Math.max(0, rideState.waiting_ended_at - (rideState.waiting_started_at || rideState.waiting_ended_at));
        let totalWaitSecs = Math.floor(totalWaitMs / 1000);
        let waitMinutes = Math.floor(totalWaitSecs / 60);
        rideState.total_waiting_minutes = waitMinutes;

        const wSettings = rideState.waiting_settings || { freeMinutes: 0, ratePerMin: 0, maxCharge: 0, enabled: true };
        let charge = 0;
        if (wSettings.enabled) {
          const freeSecs = (Number(wSettings.freeMinutes) || 0) * 60;
          if (totalWaitSecs > freeSecs) {
            const extraSecs = totalWaitSecs - freeSecs;
            const chargeableMins = Math.ceil(extraSecs / 60);
            charge = chargeableMins * (Number(wSettings.ratePerMin) || 0);
            if (wSettings.maxCharge > 0 && charge > wSettings.maxCharge) {
              charge = wSettings.maxCharge;
            }
          }
        }
        rideState.waiting_charge = Math.round(charge);

        // Also update waiting_minutes and waiting_charge in DB
        try {
          await pool.query(
            'UPDATE rides SET waiting_minutes = ?, waiting_charge = ? WHERE ride_session_id = ?',
            [waitMinutes, rideState.waiting_charge, rideId]
          );
        } catch (dbErr) {
          console.warn('Could not update waiting_charge in rides table:', dbErr.message);
        }

        const payload = {
          rideId,
          message: 'Returning to pickup point!',
          trip_stage: 'RETURN',
          total_waiting_minutes: waitMinutes,
          waiting_charge: rideState.waiting_charge,
          pickup: rideState.pickup,
          drop: rideState.drop
        };

        socket.emit('ride:return_started', payload);
        io.to(`user_${rideState.userId}`).emit('ride:return_started', payload);
        console.log(`[TwoWay] Ride ${rideId} return trip started. Waiting: ${waitMinutes} mins, Charge: ₹${rideState.waiting_charge}`);
      }
    });

    // --- DRIVER ENDS THE RIDE ---
    socket.on('ride:complete', async (data) => {
      const { rideId, finalFare, paymentMethod } = data;
      const rideState = pendingRides.get(rideId);

      if (rideState && rideState.status === 'STARTED' && rideState.driverId === userId) {
        rideState.status = 'COMPLETED';
        let connection;
        let paymentSource = null;
        let authoritativeFare = 0;
        let waitingChargeApplied = 0;
        let waitingMinutesApplied = 0;
        let commissionAmount = 0;
        let entitlementSubs = null;

        try {
          connection = await pool.getConnection();
          await connection.beginTransaction();

          let actualDriverId = rideState.driverId;
          const rideTypeId = 1; // Default to standard ride type

          const isParcel = rideState.isParcel === true;
          const distanceType = rideState.distance_type;
          const tripType = rideState.trip_type;

          if (!isParcel && distanceType && tripType) {
            let tipAmount = 0;
            if (rideState.tip && !isNaN(rideState.tip) && Number(rideState.tip) > 0) {
              tipAmount = Number(rideState.tip);
            }

            // Lock driver subscription row
            const [subs] = await connection.execute(
              `SELECT * FROM driver_subscriptions 
               WHERE driver_id = ? AND status = 'ACTIVE' 
               ORDER BY id DESC LIMIT 1
               FOR UPDATE`,
              [actualDriverId]
            );
            
            let distanceCol = distanceType === 'SHORT' ? 'free_short_rides_remaining' : 'free_long_rides_remaining';

            if (subs.length > 0 && subs[0][distanceCol] > 0) {
              paymentSource = 'FREE_ENTITLEMENT';
              entitlementSubs = subs[0];
            } else {
              paymentSource = 'PAYABLE';
            }
          }

          if (isParcel) {
            authoritativeFare = finalFare || rideState.estimated_fare || 50;
            paymentSource = null;
          } else if (paymentSource === 'PAYABLE' || paymentSource === 'FREE_ENTITLEMENT') {
            if (rideState.serverRouteDistanceKm === undefined || rideState.serverRouteDistanceKm === null) {
              throw new Error('Authoritative server route distance is missing.');
            }
            
            let waitingMinutes = 0;
            if (tripType === 'TWO_WAY') {
              if (rideState.total_waiting_minutes !== undefined) {
                waitingMinutes = rideState.total_waiting_minutes;
              } else if (rideState.waiting_started_at) {
                const now = rideState.waiting_ended_at || Date.now();
                waitingMinutes = Math.floor(Math.max(0, now - rideState.waiting_started_at) / 60000);
              } else if (rideState.arrived_at && rideState.started_at) {
                const waitingDurationMs = Math.max(0, rideState.started_at - rideState.arrived_at);
                waitingMinutes = Math.round(waitingDurationMs / 60000);
              }
            }
            
            const fareResult = await fareService.calculateFare(rideState.vehicle_type_id || 1, rideState.serverRouteDistanceKm, tripType, waitingMinutes);
            authoritativeFare = fareResult.finalFare;
            waitingChargeApplied = fareResult.waitingCharge;
            waitingMinutesApplied = waitingMinutes;
          }

          if (paymentSource === 'PAYABLE') {
            let tipAmount = 0;
            if (rideState.tip && !isNaN(rideState.tip) && Number(rideState.tip) > 0) {
              tipAmount = Number(rideState.tip);
            }
            const commissions = await fareService.calculateCommission(authoritativeFare, distanceType, tipAmount);
            commissionAmount = commissions.totalCommission;
            if (commissions.rideCommission > 0) {
              await walletService.debitDriverWallet(actualDriverId, commissions.rideCommission, 'RIDE_FARE', 'Ride commission deduction', {
                strict: true,
                connection: connection,
                rideId: rideId
              });
            }
            if (commissions.tipCommission > 0) {
              await walletService.debitDriverWallet(actualDriverId, commissions.tipCommission, 'TIP_COMMISSION', 'Tip commission deduction', {
                strict: true,
                connection: connection,
                rideId: rideId
              });
            }
          }

          // Save the ride to the database
          await connection.query('SET FOREIGN_KEY_CHECKS = 0');
          let tipAmountForDb = 0;
          if (rideState.tip && !isNaN(rideState.tip) && Number(rideState.tip) > 0) {
            tipAmountForDb = Number(rideState.tip);
          }
          const waitingStartedDate = rideState.waiting_started_at ? new Date(rideState.waiting_started_at) : null;
          const waitingEndedDate = rideState.waiting_ended_at ? new Date(rideState.waiting_ended_at) : null;

          const [rideResult] = await connection.execute(
            `INSERT INTO rides 
            (ride_session_id, user_id, driver_id, vehicle_type_id, ride_type_id, pickup_lat, pickup_lng, pickup_address, drop_lat, drop_lng, drop_address, distance_km, estimated_fare, final_fare, status, is_parcel, recipient_name, recipient_phone, parcel_description, trip_type, distance_type, payment_source, waiting_minutes, waiting_charge, tip_amount, waiting_started_at, waiting_ended_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            final_fare = VALUES(final_fare), status = 'COMPLETED', payment_source = VALUES(payment_source), waiting_minutes = VALUES(waiting_minutes), waiting_charge = VALUES(waiting_charge), tip_amount = VALUES(tip_amount), waiting_started_at = VALUES(waiting_started_at), waiting_ended_at = VALUES(waiting_ended_at)`,
            [
              rideId,
              rideState.userId,
              actualDriverId,
              rideState.vehicle_type_id || 1,
              rideTypeId,
              rideState.pickup?.latitude || 0,
              rideState.pickup?.longitude || 0,
              rideState.pickup?.address || 'Unknown Pickup',
              rideState.drop?.latitude || 0,
              rideState.drop?.longitude || 0,
              rideState.drop?.address || 'Unknown Drop',
              rideState.serverRouteDistanceKm || 0,
              rideState.estimated_fare || 50,
              authoritativeFare,
              rideState.isParcel || false,
              rideState.recipient_name || null,
              rideState.recipient_phone || null,
              rideState.parcel_description || null,
              rideState.trip_type || null,
              rideState.distance_type || null,
              paymentSource,
              waitingMinutesApplied,
              waitingChargeApplied,
              tipAmountForDb,
              waitingStartedDate,
              waitingEndedDate
            ]
          );
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');

          const dbRideId = rideResult.insertId;

          if (paymentSource === 'FREE_ENTITLEMENT' && entitlementSubs) {
            let distanceCol = distanceType === 'SHORT' ? 'free_short_rides_remaining' : 'free_long_rides_remaining';
            
            // Deduct distance balance atomically
            const [updateRes] = await connection.execute(
              `UPDATE driver_subscriptions
               SET ${distanceCol} = ${distanceCol} - 1
               WHERE id = ? AND ${distanceCol} > 0`,
              [entitlementSubs.id]
            );
            
            if (updateRes.affectedRows !== 1) {
              throw new Error('Failed to update subscription balances or zero balance reached.');
            }

            // Record transaction idempotency records (only for distance type)
            await connection.execute(
              `INSERT IGNORE INTO driver_entitlement_transactions (driver_id, ride_id, entitlement_type, quantity) VALUES (?, ?, ?, ?)`,
              [actualDriverId, dbRideId, distanceType, 1]
            );
          }

          await connection.commit();
          console.log(`Ride ${rideId} COMPLETED by driver ${userId}`);

          if (!isParcel) {
            // Update socket meta safely without blocking
            updateDriverSocketMeta(actualDriverId).catch(err => console.error('Socket meta sync error:', err));
          }
        } catch (err) {
          if (connection) await connection.rollback();
          console.error('Failed to complete ride:', err);
          rideState.status = 'STARTED'; // Revert in-memory state
          socket.emit('ride:error', { message: err.message || 'Failed to complete ride.' });
          return;
        } finally {
          if (connection) connection.release();
        }

        // Notify both Driver and User
        socket.emit('ride:completed', { 
          rideId, 
          success: true, 
          fare: authoritativeFare,
          waiting_minutes: waitingMinutesApplied,
          waiting_charge: waitingChargeApplied,
          commission: commissionAmount
        });
        io.to(`user_${rideState.userId}`).emit('ride:completed', {
          rideId,
          message: 'You have reached your destination!',
          fare: authoritativeFare,
          waiting_minutes: waitingMinutesApplied,
          waiting_charge: waitingChargeApplied,
          paymentMethod: paymentMethod || 'CASH'
        });

        // Save fare info so user can fetch it on reconnect
        rideState.finalFare = authoritativeFare;
        rideState.paymentMethod = paymentMethod || 'CASH';

        // Mark driver as available again
        const driverObj = activeDrivers.get(userId);
        if (driverObj) driverObj.isAvailable = true;

        // Do NOT delete the ride yet, wait for the user to complete payment!
      }
    });

    socket.on('ride:payment_complete', (data) => {
      const { rideId } = data;
      const rideState = pendingRides.get(rideId);
      if (rideState && rideState.status === 'COMPLETED') {
        pendingRides.delete(rideId);
        console.log(`Ride ${rideId} deleted after payment completion.`);
      }
    });

    // --- USER OR DRIVER CANCELS THE RIDE ---
    socket.on('ride:cancel', async (data) => {
      let rideId = data?.rideId;
      if (!rideId) {
        for (const [rId, state] of pendingRides.entries()) {
          if (state.userId === userId) {
            rideId = rId;
            break;
          }
        }
      }

      if (!rideId) return;

      const rideState = pendingRides.get(rideId);

      if (rideState) {
        console.log(`Ride ${rideId} CANCELLED by ${userId}`);

        // Notify User
        io.to(`user_${rideState.userId}`).emit('ride:cancelled', {
          rideId,
          message: 'Ride has been cancelled.'
        });

        // Cleanup pending timers and session
        if (rideState.timers && rideState.timers.length > 0) {
          rideState.timers.forEach(t => clearTimeout(t));
          rideState.timers = [];
        }
        rideState.searchSessionId = null;

        // Notify Driver if assigned
        if (rideState.driverId) {
          const driverObj = activeDrivers.get(rideState.driverId);
          if (driverObj) {
            io.to(driverObj.socketId).emit('ride:cancelled', {
              rideId,
              message: data?.reason ? `Ride was cancelled: ${data.reason}` : 'Ride was cancelled by the user.',
              reason: data?.reason || null
            });
            driverObj.isAvailable = true; // Free up the driver
          }
        } else {
          // Notify only drivers who were actually offered the ride
          if (rideState.notifiedDriverIds) {
            rideState.notifiedDriverIds.forEach(dId => {
              const driverObj = activeDrivers.get(dId);
              if (driverObj) {
                io.to(driverObj.socketId).emit('ride:cancelled', {
                  rideId,
                  message: 'Ride was cancelled by the user.'
                });
              }
            });
            rideState.notifiedDriverIds.clear();
          }
        }

        // Save the cancelled ride to the database
        try {
          await pool.query('SET FOREIGN_KEY_CHECKS = 0');
          await pool.execute(
            `INSERT INTO rides 
            (user_id, driver_id, vehicle_type_id, ride_type_id, pickup_lat, pickup_lng, pickup_address, drop_lat, drop_lng, drop_address, estimated_fare, status, cancelled_by, cancellation_reason, is_parcel, recipient_name, recipient_phone, parcel_description, trip_type, distance_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CANCELLED', ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              rideState.userId,
              rideState.driverId || null,
              rideState.vehicle_type_id || 1,
              1,
              rideState.pickup?.latitude || 0,
              rideState.pickup?.longitude || 0,
              rideState.pickup?.address || 'Unknown Pickup',
              rideState.drop?.latitude || 0,
              rideState.drop?.longitude || 0,
              rideState.drop?.address || 'Unknown Drop',
              rideState.estimated_fare || 0,
              userRole,
              data?.reason || null,
              rideState.isParcel || false,
              rideState.recipient_name || null,
              rideState.recipient_phone || null,
              rideState.parcel_description || null,
              rideState.trip_type || null,
              rideState.distance_type || null
            ]
          );
          await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (dbErr) {
          console.error('Failed to save cancelled ride to DB:', dbErr);
        }

        // Remove from pending rides
        pendingRides.delete(rideId);
      }
    });

    // --- TICKETING / HELP SUPPORT CHAT ---
    socket.on('ticket:join', (data) => {
      const { ticketId } = data;
      if (ticketId) {
        socket.join(`ticket_${ticketId}`);
        console.log(`User/Admin ${userId} joined ticket chat ${ticketId}`);
      }
    });

    socket.on('ticket:message', async (data) => {
      const { ticketId, message, senderType } = data; // senderType = 'USER' | 'ADMIN'
      if (!ticketId || !message) return;
      try {
        // Save to DB
        const [result] = await pool.execute(
          'INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message) VALUES (?, ?, ?, ?)',
          [ticketId, senderType || 'USER', userId, message]
        );

        const newMessage = {
          id: result.insertId,
          ticket_id: ticketId,
          sender_type: senderType || 'USER',
          sender_id: userId,
          message,
          created_at: new Date()
        };

        // Broadcast to everyone in the ticket room
        io.to(`ticket_${ticketId}`).emit('ticket:receive_message', newMessage);
      } catch (err) {
        console.error('Error saving ticket message:', err);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${userId} (${userRole}), reason: ${reason}`);

      if (userRole === 'DRIVER') {
        const currentSession = driverSessions.get(userId);
        // If this disconnect event is from a stale/superseded socket, ignore it
        if (currentSession && currentSession.socketId !== socket.id) {
          console.log(`[Socket] Ignoring stale disconnect for driver ${userId} (active socket: ${currentSession.socketId}, disconnected: ${socket.id})`);
          return;
        }

        // Mark driver as temporarily unavailable while disconnected so no dead socket receives ride requests
        if (activeDrivers.has(userId)) {
          const cached = activeDrivers.get(userId);
          cached.isAvailable = false;
          cached.isReconnecting = true;
        }

        const activeGenToken = currentSession ? currentSession.generationToken : socket.driverGenToken;
        const currentSessionId = currentSession ? currentSession.sessionId : sessionId;

        // Clear any pre-existing timer for safety
        if (driverDisconnectTimers.has(userId)) {
          clearTimeout(driverDisconnectTimers.get(userId).timer);
        }

        console.log(`[Socket] Driver ${userId} disconnected. Starting 35-second grace period...`);

        const timer = setTimeout(async () => {
          driverDisconnectTimers.delete(userId);
          const latestSession = driverSessions.get(userId);
          // Confirm that no new reconnection has replaced this token
          if (latestSession && latestSession.generationToken === activeGenToken) {
            console.log(`[Socket] Grace period expired for driver ${userId}. Setting offline.`);
            driverSessions.delete(userId);
            activeDrivers.delete(userId);
            io.emit('driver:offline', { driverId: userId });

            try {
              await pool.execute('UPDATE drivers SET is_online = 0 WHERE id = ?', [userId]);
              if (latestSession.sessionId) {
                await pool.execute(
                  `UPDATE driver_sessions SET logout_time = NOW(), session_duration_minutes = TIMESTAMPDIFF(MINUTE, login_time, NOW()) WHERE id = ?`,
                  [latestSession.sessionId]
                );
                console.log(`Ended session ${latestSession.sessionId} for driver ${userId} after grace period`);
              }
            } catch (err) {
              console.error('Error ending driver session after grace period:', err);
            }
          }
        }, 35000); // 35 seconds grace period

        driverDisconnectTimers.set(userId, {
          timer,
          sessionId: currentSessionId,
          generationToken: activeGenToken,
          disconnectedAt: Date.now()
        });
      }
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const getActiveRideForDriver = (driverId) => {
  for (const [rideId, rideState] of pendingRides.entries()) {
    if (String(rideState.driverId) === String(driverId) && (rideState.status === 'ACCEPTED' || rideState.status === 'STARTED')) {
      return { rideId, ...rideState, server_time: Date.now() };
    }
  }
  return null;
};

const getActiveRideForUser = (userId) => {
  for (const [rideId, rideState] of pendingRides.entries()) {
    if (String(rideState.userId) === String(userId) && (rideState.status === 'ACCEPTED' || rideState.status === 'STARTED' || rideState.status === 'SEARCHING' || rideState.status === 'COMPLETED')) {
      return { rideId, ...rideState, server_time: Date.now() };
    }
  }
  return null;
};

const updateDriverSocketMeta = async (driverId) => {
  if (!io) return;
  try {
    const [rows] = await pool.execute(`
      SELECT d.parcel_orders_enabled, d.short_ride_enabled, d.long_ride_enabled, d.one_way_enabled, d.two_way_enabled, v.vehicle_type_id, ds.status as sub_status, ds.expires_at, ds.free_short_rides_remaining, ds.free_long_rides_remaining, ds.free_one_way_rides_remaining, ds.free_two_way_rides_remaining
      FROM drivers d 
      LEFT JOIN vehicles v ON d.id = v.driver_id 
      LEFT JOIN driver_subscriptions ds ON d.id = ds.driver_id
      WHERE d.id = ? 
      ORDER BY ds.id DESC LIMIT 1
    `, [driverId]);

    if (rows.length > 0) {
      const r = rows[0];
      const isSubActive = r.sub_status === 'ACTIVE' && new Date() < new Date(r.expires_at);
      const newMeta = {
        parcel_orders_enabled: !!r.parcel_orders_enabled,
        vehicle_type_id: r.vehicle_type_id,
        short_ride_enabled: !!r.short_ride_enabled,
        long_ride_enabled: !!r.long_ride_enabled,
        one_way_enabled: !!r.one_way_enabled,
        two_way_enabled: !!r.two_way_enabled,
      };

      const sockets = await io.in(`user_${driverId}`).fetchSockets();
      for (const socket of sockets) {
        socket.driverMeta = newMeta;
      }
      
      const cached = activeDrivers.get(driverId);
      if (cached) {
        Object.assign(cached, newMeta);
        activeDrivers.set(driverId, cached);
      }
    }
  } catch (error) {
    console.error('Failed to update driver socket meta:', error);
  }
};

module.exports = { initSocket, getIo, getActiveRideForDriver, getActiveRideForUser, updateDriverSocketMeta };
