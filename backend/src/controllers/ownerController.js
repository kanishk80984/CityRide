const { pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { encrypt } = require('../utils/crypto');

const getOwnerStats = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const [driverCount] = await pool.execute('SELECT COUNT(*) as count FROM driver_owner_links WHERE owner_id = ?', [ownerId]);
    
    // For rides, we count rides belonging to drivers linked to this owner
    const [rideCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM rides r JOIN driver_owner_links dol ON r.driver_id = dol.driver_id WHERE dol.owner_id = ?', 
      [ownerId]
    );
    const [activeRides] = await pool.execute(
      'SELECT COUNT(*) as count FROM rides r JOIN driver_owner_links dol ON r.driver_id = dol.driver_id WHERE dol.owner_id = ? AND r.status IN ("STARTED", "ACCEPTED", "ARRIVED")', 
      [ownerId]
    );
    const [cancelledRides] = await pool.execute(
      'SELECT COUNT(*) as count FROM rides r JOIN driver_owner_links dol ON r.driver_id = dol.driver_id WHERE dol.owner_id = ? AND r.status = "CANCELLED"', 
      [ownerId]
    );
    const [completedRides] = await pool.execute(
      'SELECT COUNT(*) as count FROM rides r JOIN driver_owner_links dol ON r.driver_id = dol.driver_id WHERE dol.owner_id = ? AND r.status = "COMPLETED"', 
      [ownerId]
    );
    
    return successResponse(res, 200, 'Owner stats fetched', {
      totalDrivers: driverCount[0].count,
      totalRides: rideCount[0].count,
      activeRides: activeRides[0].count,
      completedRides: completedRides[0].count,
      cancelledRides: cancelledRides[0].count,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to fetch owner stats');
  }
};

const getOwnerDrivers = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const [drivers] = await pool.execute(
      `SELECT d.id, d.name, d.phone, d.status, d.is_online, d.created_at, vt.name as vehicle_type 
       FROM drivers d
       JOIN driver_owner_links dol ON d.id = dol.driver_id
       LEFT JOIN vehicles v ON d.id = v.driver_id
       LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
       WHERE dol.owner_id = ?
       ORDER BY d.created_at DESC`,
      [ownerId]
    );
    return successResponse(res, 200, 'Drivers fetched', drivers);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to fetch drivers');
  }
};

const getOwnerSettings = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const [rows] = await pool.execute('SELECT client_id, phone_number, client_secret_encrypted FROM owners WHERE id = ?', [ownerId]);
    
    if (rows.length === 0) return errorResponse(res, 404, 'Owner not found');
    
    const owner = rows[0];
    return successResponse(res, 200, 'Settings fetched', {
      client_id: owner.client_id || '',
      phone_number: owner.phone_number || '',
      has_secret: !!owner.client_secret_encrypted // don't expose raw secret
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to fetch settings');
  }
};

const updateOwnerSettings = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { client_id, client_secret, phone_number } = req.body;
    
    if (!client_id || !phone_number) {
      return errorResponse(res, 400, 'Client ID and Phone Number are required');
    }

    // Check unique client ID
    const [existing] = await pool.execute('SELECT id FROM owners WHERE client_id = ? AND id != ?', [client_id, ownerId]);
    if (existing.length > 0) {
      return errorResponse(res, 400, 'Client ID already exists.');
    }
    
    if (client_secret) {
      const encryptedSecret = encrypt(client_secret);
      await pool.execute(
        'UPDATE owners SET client_id = ?, phone_number = ?, client_secret_encrypted = ? WHERE id = ?',
        [client_id, phone_number, encryptedSecret, ownerId]
      );
    } else {
      await pool.execute(
        'UPDATE owners SET client_id = ?, phone_number = ? WHERE id = ?',
        [client_id, phone_number, ownerId]
      );
    }

    return successResponse(res, 200, 'Settings updated successfully');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to update settings');
  }
};

const getOwnerDriverDetails = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const driverId = req.params.id;
    
    // Check if driver belongs to this owner
    const [links] = await pool.execute('SELECT * FROM driver_owner_links WHERE owner_id = ? AND driver_id = ?', [ownerId, driverId]);
    if (links.length === 0) {
      return errorResponse(res, 403, 'Unauthorized access to this driver');
    }

    const [drivers] = await pool.execute(
      `SELECT d.id, d.name, d.phone, d.status, d.is_online, d.created_at, vt.name as vehicle_type 
       FROM drivers d
       LEFT JOIN vehicles v ON d.id = v.driver_id
       LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
       WHERE d.id = ?`,
      [driverId]
    );

    if (drivers.length === 0) return errorResponse(res, 404, 'Driver not found');
    const driver = drivers[0];

    // Stats queries
    const [ridesToday] = await pool.execute('SELECT COUNT(*) as total, SUM(CASE WHEN status = "COMPLETED" THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = "CANCELLED" THEN 1 ELSE 0 END) as rejected FROM rides WHERE driver_id = ? AND DATE(created_at) = CURDATE()', [driverId]);
    const [ridesWeek] = await pool.execute('SELECT COUNT(*) as total, SUM(CASE WHEN status = "COMPLETED" THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = "CANCELLED" THEN 1 ELSE 0 END) as rejected FROM rides WHERE driver_id = ? AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)', [driverId]);
    const [ridesMonth] = await pool.execute('SELECT COUNT(*) as total, SUM(CASE WHEN status = "COMPLETED" THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = "CANCELLED" THEN 1 ELSE 0 END) as rejected FROM rides WHERE driver_id = ? AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())', [driverId]);
    const [ridesTotal] = await pool.execute('SELECT COUNT(*) as total, SUM(CASE WHEN status = "COMPLETED" THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status = "CANCELLED" THEN 1 ELSE 0 END) as rejected FROM rides WHERE driver_id = ?', [driverId]);

    const [earningsToday] = await pool.execute('SELECT SUM(final_fare) as total, SUM(tip_amount) as tips FROM rides WHERE driver_id = ? AND status = "COMPLETED" AND DATE(created_at) = CURDATE()', [driverId]);
    const [earningsWeek] = await pool.execute('SELECT SUM(final_fare) as total FROM rides WHERE driver_id = ? AND status = "COMPLETED" AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)', [driverId]);
    const [earningsMonth] = await pool.execute('SELECT SUM(final_fare) as total FROM rides WHERE driver_id = ? AND status = "COMPLETED" AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())', [driverId]);

    const [walletResult] = await pool.execute('SELECT balance FROM driver_wallets WHERE driver_id = ?', [driverId]);
    const walletBalance = walletResult.length > 0 ? walletResult[0].balance : 0;

    const [ridesHistory] = await pool.execute('SELECT id, pickup_address, drop_address, status, final_fare, distance_km, DATE_FORMAT(created_at, "%d/%m/%Y %h:%i %p") as date, created_at as raw_date FROM rides WHERE driver_id = ? ORDER BY created_at DESC LIMIT 200', [driverId]);

    const stats = {
      ridesToday: { received: ridesToday[0].total || 0, completed: ridesToday[0].completed || 0, rejected: ridesToday[0].rejected || 0 },
      ridesWeek: { received: ridesWeek[0].total || 0, completed: ridesWeek[0].completed || 0, rejected: ridesWeek[0].rejected || 0 },
      ridesMonth: { received: ridesMonth[0].total || 0, completed: ridesMonth[0].completed || 0, rejected: ridesMonth[0].rejected || 0 },
      ridesTotal: { received: ridesTotal[0].total || 0, completed: ridesTotal[0].completed || 0, rejected: ridesTotal[0].rejected || 0 },
      todayEarnings: earningsToday[0].total || 0,
      weeklyEarnings: earningsWeek[0].total || 0,
      monthlyEarnings: earningsMonth[0].total || 0,
      tipsAmount: earningsToday[0].tips || 0,
      walletBalance: walletBalance
    };

    return successResponse(res, 200, 'Driver details fetched', { driver, stats, ridesHistory });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, 'Failed to fetch driver details');
  }
};

module.exports = {
  getOwnerStats,
  getOwnerDrivers,
  getOwnerDriverDetails,
  getOwnerSettings,
  updateOwnerSettings
};
