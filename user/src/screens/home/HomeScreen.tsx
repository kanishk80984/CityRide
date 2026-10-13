import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, ScrollView, ActivityIndicator, Alert, Image, Animated, PanResponder, BackHandler, Linking, Platform, AppState, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store/store';
import { setPickupLocation, setDropLocation, setSelectedVehicle, setSelectedRideType, setEstimatedFare, setMapSelectionMode, setIsParcel, setParcelDetails, setTripType, setMapTheme } from '../../store/rideSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../services/apiClient';
import EagleMap from '../../components/map/EagleMap';
import { locationService, LocationData } from '../../services/locationService';
import { useSocket } from '../../context/SocketContext';
import VehicleSelectionSheet from '../../components/VehicleSelectionSheet';
import ParcelBookingSheet from '../../components/ParcelBookingSheet';
import CustomAlertModal from '../../components/CustomAlertModal';
import PaymentModal from '../../components/PaymentModal';
import { promptForEnableLocationIfNeeded, isLocationEnabled as checkDeviceLocationEnabled } from 'react-native-android-location-enabler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getApiUrl } from '../../config/url';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#11704B',
  primaryLight: '#E3F5EC',
  danger: '#E53935',
  bg: '#EAF5F0', // Map background fallback
  textTitle: '#1A1A1A',
  textSub: '#757575',
  border: '#E0E0E0'
};

const HomeScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [allPopularLocations, setAllPopularLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // Map loads instantly now
  const [booking, setBooking] = useState(false);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState<any | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number, durationMinutes: number } | null>(null);
  const driverLocationRef = useRef<LocationData | null>(null);
  const [routeTrigger, setRouteTrigger] = useState(0);
  const [bookingStep, setBookingStep] = useState<'LOCATION' | 'VEHICLE' | 'PARCEL'>('LOCATION');
  const bookingStepRef = useRef(bookingStep);

  const [manualSelectedLocation, setManualSelectedLocation] = useState<LocationData | null>(null);
  const [panToCoordinate, setPanToCoordinate] = useState<[number, number] | null>(null);
  const [isManualSelectionLoading, setIsManualSelectionLoading] = useState(false);
  const manualSelectionReqIdRef = useRef(0);

  // Sync ref with state
  useEffect(() => {
    bookingStepRef.current = bookingStep;
  }, [bookingStep]);

  const [isHydrating, setIsHydrating] = useState(true);

  const [rideStatus, setRideStatus] = useState<'IDLE' | 'SEARCHING' | 'ACCEPTED' | 'STARTED'>('IDLE');
  const rideStatusRef = useRef(rideStatus);

  useEffect(() => {
    rideStatusRef.current = rideStatus;

    if (rideStatus === 'ACCEPTED' || rideStatus === 'STARTED') {
      // Keep other state sync or navigation if necessary, but don't navigate away for SEARCHING
    }
  }, [rideStatus]);

  const lastRoutedPhase = useRef<string>('');
  const lastRouteFetchDriverLocRef = useRef<{ latitude: number, longitude: number } | null>(null);
  const routeRequestSeq = useRef<number>(0);
  const lastRouteRequestTimeRef = useRef<number>(0);
  const currentRouteGeometryRef = useRef<any | null>(null);
  const isRouteFetchingRef = useRef<boolean>(false);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const toRad = (val: number) => (val * Math.PI) / 180;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = toRad(lat2 - lat1);
    const deltaLambda = toRad(lon2 - lon1);
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const getDistanceToRoute = (lat: number, lng: number, geometry: any) => {
    if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) return 0;
    let minDist = Infinity;
    for (let i = 0; i < geometry.coordinates.length; i++) {
      const coord = geometry.coordinates[i];
      const dist = getDistance(lat, lng, coord[1], coord[0]); // GeoJSON is [lng, lat]
      if (dist < minDist) {
        minDist = dist;
      }
    }
    return minDist;
  };
  const [otp, setOtp] = useState<string | null>(null);
  const activeRideIdRef = useRef<string | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [completedFare, setCompletedFare] = useState(0);
  const [isLocationEnabled, setIsLocationEnabled] = useState(true);
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, title: '', message: '', type: 'info' });
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOtherText, setCancelOtherText] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Two-Way Waiting State
  const [twoWayStage, setTwoWayStage] = useState<'OUTWARD' | 'WAITING' | 'RETURN'>('OUTWARD');
  const [userWaitingSeconds, setUserWaitingSeconds] = useState(0);
  const [userWaitingCharge, setUserWaitingCharge] = useState(0);
  const [userWaitingFreeLimit, setUserWaitingFreeLimit] = useState(0);
  const userWaitingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { socket } = useSocket();

  const CANCEL_REASONS = [
    'Driver is taking too long',
    'I changed my plans',
    'Pickup location is incorrect',
    'Found another option',
    'Booked by mistake',
    'Other'
  ];

  const { pickupLocation, dropLocation, selectedVehicleType, selectedRideType, isMapSelectionMode, mapSelectionIsPickup, isParcel, parcelDetails, tripType, mapTheme } = useSelector((state: RootState) => state.ride) || {};
  const { user } = useSelector((state: RootState) => state.auth) || {};
  const pickupLocationRef = useRef(pickupLocation);
  const prevPickupRef = useRef(pickupLocation);
  const prevDropRef = useRef(dropLocation);
  const intentionalCancelReasonRef = useRef<string | null>(null);
  const pendingSearchRestartRef = useRef(false);

  useEffect(() => {
    console.log("MAP THEME AFTER LOGIN:", mapTheme);
    pickupLocationRef.current = pickupLocation;
  }, [pickupLocation, mapTheme]);

  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const [mapBottomPadding, setMapBottomPadding] = useState(height * 0.4);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const popularLocations = useMemo(() => {
    const referenceLoc = pickupLocation || currentLocation;
    if (!referenceLoc || allPopularLocations.length === 0) return [];

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    return allPopularLocations
      .map((p: any) => ({ ...p, distance: getDistance(referenceLoc.latitude, referenceLoc.longitude, p.latitude, p.longitude) }))
      .filter((p: any) => p.distance < 50)
      .sort((a, b) => a.distance - b.distance);
  }, [allPopularLocations, pickupLocation, currentLocation]);


  const sheetHeight = useRef(new Animated.Value(height * 0.4)).current;
  const sheetHeightValue = useRef(height * 0.4);

  useEffect(() => {
    const id = sheetHeight.addListener(({ value }) => {
      sheetHeightValue.current = value;
    });
    return () => sheetHeight.removeListener(id);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Allow dragging in all steps now, including VEHICLE and SEARCHING
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        sheetHeight.stopAnimation();
        sheetHeight.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        let newVal = -gestureState.dy;
        sheetHeight.setValue(newVal);
      },
      onPanResponderRelease: (_, gestureState) => {
        sheetHeight.flattenOffset();
        const currentH = sheetHeightValue.current;

        // Determine target snap point
        let targetH = currentH;
        const maxH = height - insets.top - 82;

        if (bookingStepRef.current === 'VEHICLE') {
          const maxTarget = height * 0.78; // allow full expansion for both states

          if (gestureState.dy > 50) {
            targetH = height * 0.45; // lower height for vehicle step
          } else if (gestureState.dy < -50) {
            targetH = maxTarget;
          } else {
            const d45 = Math.abs(currentH - (height * 0.45));
            const dMax = Math.abs(currentH - maxTarget);
            targetH = d45 < dMax ? height * 0.45 : maxTarget;
          }
        } else {
          if (gestureState.dy > 50) {
            if (currentH > maxH - 50) {
              targetH = height * 0.75;
            } else {
              targetH = height * 0.4;
            }
          } else if (gestureState.dy < -50) {
            if (currentH < height * 0.6) {
              targetH = height * 0.75;
            } else {
              targetH = maxH;
            }
          } else {
            const d40 = Math.abs(currentH - (height * 0.4));
            const d75 = Math.abs(currentH - (height * 0.75));
            const dMax = Math.abs(currentH - maxH);
            if (d40 <= d75 && d40 <= dMax) targetH = height * 0.4;
            else if (d75 <= d40 && d75 <= dMax) targetH = height * 0.75;
            else targetH = maxH;
          }
        }

        Animated.spring(sheetHeight, { toValue: targetH, useNativeDriver: false }).start();
        setMapBottomPadding(targetH);
        setIsSheetExpanded(targetH > height * 0.5);
      }
    })
  ).current;

  const checkLocationStatus = () => {
    if (Platform.OS === 'android') {
      try {
        promptForEnableLocationIfNeeded({
          interval: 10000
        })
          .then((data: any) => {
            setIsLocationEnabled(true);
          })
          .catch((err: any) => {
            setIsLocationEnabled(false);
          });
      } catch (error) {
        setIsLocationEnabled(true); // Fallback if module not linked yet
      }
    } else {
      setIsLocationEnabled(true);
    }
  };

  useEffect(() => {
    checkLocationStatus();
    fetchInitialData();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkLocationStatus();
      }
    });

    const locationInterval = setInterval(async () => {
      if (Platform.OS === 'android') {
        try {
          const enabled = await checkDeviceLocationEnabled();
          setIsLocationEnabled(enabled);
        } catch (e) {
          // Silent catch
        }
      }
    }, 3000);

    return () => {
      subscription.remove();
      clearInterval(locationInterval);
    };
  }, []);

  // Refetch data when location is enabled after being unavailable due to GPS
  useEffect(() => {
    if (isLocationEnabled && pickupLocation?.address?.includes('Check GPS')) {
      fetchInitialData();
    }
  }, [isLocationEnabled]); // Removed pickupLocation?.address to prevent infinite retry loops


  // Authoritative Synchronized Two-Way Waiting Timer
  const startUserWaitingTimer = useCallback((data: any) => {
    if (userWaitingTimerRef.current) clearInterval(userWaitingTimerRef.current);

    const freeM = Number(data.freeMinutes ?? data.waiting_settings?.freeMinutes ?? 0);
    const rate = Number(data.ratePerMin ?? data.waiting_settings?.ratePerMin ?? 0);
    const max = Number(data.maxCharge ?? data.waiting_settings?.maxCharge ?? 0);
    const enabled = (data.enabled ?? data.waiting_settings?.enabled) !== false;

    setUserWaitingFreeLimit(freeM);

    const clientReceivedAt = Date.now();
    const serverTime = data.server_time || clientReceivedAt;
    const serverOffset = clientReceivedAt - serverTime;
    const startMs = typeof data.waiting_started_at === 'number'
      ? data.waiting_started_at
      : new Date(data.waiting_started_at || Date.now()).getTime();

    const updateWaitingTick = () => {
      const currentServerMs = Date.now() - serverOffset;
      const elapsed = Math.max(0, Math.floor((currentServerMs - startMs) / 1000));
      setUserWaitingSeconds(elapsed);

      const freeTotalSecs = freeM * 60;
      if (enabled && elapsed > freeTotalSecs) {
        const extraSecs = elapsed - freeTotalSecs;
        const chargeableMins = Math.ceil(extraSecs / 60);
        let chg = chargeableMins * rate;
        if (max > 0 && chg > max) chg = max;
        setUserWaitingCharge(Math.round(chg));
      } else {
        setUserWaitingCharge(0);
      }
    };

    updateWaitingTick();
    userWaitingTimerRef.current = setInterval(updateWaitingTick, 1000);
  }, []);

  // Fetch active ride on mount and reconnect
  const fetchActiveRide = useCallback(async () => {
    try {
      const res = await apiClient.get('/rides/current');
      if (res.data?.success && res.data.activeRide) {
        const ride = res.data.activeRide;
        setBooking(false);

        if (ride.pickup) {
          dispatch(setPickupLocation({ ...ride.pickup, isManual: true }));
        }
        if (ride.drop) {
          dispatch(setDropLocation({ ...ride.drop, isManual: true }));
        }

        if (ride.is_parcel || ride.isParcel) {
          dispatch(setIsParcel(true));
          dispatch(setParcelDetails({
            recipientName: ride.recipient_name || '',
            recipientPhone: ride.recipient_phone || '',
            parcelDescription: ride.parcel_description || ''
          }));
        } else {
          dispatch(setIsParcel(false));
          dispatch(setParcelDetails(null));
        }

        if (ride.status === 'SEARCHING') {
          setRideStatus('SEARCHING');
          setBooking(true);
          activeRideIdRef.current = ride.rideId;
        } else if (ride.status === 'ACCEPTED') {
          setRideStatus('ACCEPTED');
          setOtp(ride.otp);
          if (ride.driver) setDriverInfo(ride.driver);
          activeRideIdRef.current = ride.rideId;
        } else if (ride.status === 'STARTED') {
          setRideStatus('STARTED');
          setOtp(null);
          if (ride.driver) setDriverInfo(ride.driver);
          activeRideIdRef.current = ride.rideId;

          if (ride.trip_type === 'TWO_WAY' && ride.trip_stage === 'WAITING' && ride.waiting_started_at) {
            setTwoWayStage('WAITING');
            startUserWaitingTimer(ride);
          } else if (ride.trip_type === 'TWO_WAY' && ride.trip_stage === 'RETURN') {
            setTwoWayStage('RETURN');
            setUserWaitingCharge(ride.waiting_charge || 0);
          }
        } else if (ride.status === 'COMPLETED') {
          setRideStatus('IDLE');
          setBooking(false);
          setRouteGeometry(null);
          setDriverInfo(null);
          dispatch(setDropLocation(null));
          dispatch(setIsParcel(false));
          dispatch(setParcelDetails(null));
          dispatch(setTripType('ONE_WAY'));
          setBookingStep('LOCATION');

          if (activeRideIdRef.current && socket) {
            socket.emit('ride:payment_complete', { rideId: activeRideIdRef.current });
          }
          activeRideIdRef.current = null;
          setPaymentModalVisible(false);

          setTimeout(() => {
            setAlertConfig({ visible: true, title: 'Ride Completed', message: 'Successfully completed ride', type: 'success' });
          }, 500);

          return;
        }

        navigation.navigate('HomeTab');
      }
    } catch (e) {
      console.log('Error fetching active ride:', e);
    } finally {
      setIsHydrating(false);
    }
  }, [dispatch, navigation, socket]);

  // Initial Hydration
  useEffect(() => {
    fetchActiveRide();
  }, [fetchActiveRide]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('User connected to socket:', socket.id);
      fetchActiveRide(); // hydrate on reconnect
    };

    socket.on('connect', handleConnect);

    const handleLocationUpdate = (data: any) => {
      console.log('Received driver location update:', data);
      driverLocationRef.current = { latitude: data.latitude, longitude: data.longitude, heading: data.heading };

      if (rideStatusRef.current === 'ACCEPTED' || rideStatusRef.current === 'STARTED') {
        if (lastRoutedPhase.current !== rideStatusRef.current) {
          setRouteTrigger(prev => prev + 1);
        } else if (currentRouteGeometryRef.current) {
          const distToRoute = getDistanceToRoute(data.latitude, data.longitude, currentRouteGeometryRef.current);
          if (distToRoute > 100) {
            const now = Date.now();
            if (now - lastRouteRequestTimeRef.current > 30000 && !isRouteFetchingRef.current) {
              setRouteTrigger(prev => prev + 1);
            }
          }
        } else {
          setRouteTrigger(prev => prev + 1);
        }
      }
    };

    const handleOffline = (data: any) => {
      console.log('Driver went offline:', data);
      driverLocationRef.current = null;
    };

    const handleAccepted = (data: any) => {
      setBooking(false);
      setRideStatus('ACCEPTED');
      if (data.otp) setOtp(data.otp);
      if (data.driver) setDriverInfo(data.driver);
      if (data.rideId) activeRideIdRef.current = data.rideId;
      if (data.driverLocation) {
        driverLocationRef.current = data.driverLocation;
        setRouteTrigger(prev => prev + 1);
      }
      setAlertConfig({ visible: true, title: 'Driver Found!', message: data.message, type: 'success' });
    };

    const handleDriverArrived = (data: any) => {
      setAlertConfig({ visible: true, title: 'Driver Arrived', message: data.message || 'Your driver has arrived at the pickup location.', type: 'info' });
    };

    const handleStarted = (data: any) => {
      setRideStatus('STARTED');
      setTwoWayStage('OUTWARD');
      setOtp(null);
      if (data.rideId) activeRideIdRef.current = data.rideId;
      setAlertConfig({ visible: true, title: 'Trip Started!', message: data.message, type: 'success' });
    };

    const handleIntermediateArrived = (data: any) => {
      setTwoWayStage('WAITING');
      startUserWaitingTimer(data);

      // Swap pickup and drop
      if (data.pickup && data.drop) {
        dispatch(setPickupLocation({ ...data.pickup, isManual: true }));
        dispatch(setDropLocation({ ...data.drop, isManual: true }));
      }
      setAlertConfig({ visible: true, title: 'Reached Destination', message: 'You have arrived. Driver is waiting for your return trip.', type: 'info' });
    };

    const handleReturnStarted = (data: any) => {
      if (userWaitingTimerRef.current) {
        clearInterval(userWaitingTimerRef.current);
        userWaitingTimerRef.current = null;
      }
      setTwoWayStage('RETURN');
      setUserWaitingCharge(data.waiting_charge || 0);

      if (data.pickup && data.drop) {
        dispatch(setPickupLocation({ ...data.pickup, isManual: true }));
        dispatch(setDropLocation({ ...data.drop, isManual: true }));
      }
      setRouteTrigger(prev => prev + 1);
      setAlertConfig({ visible: true, title: 'Return Trip Started', message: 'Heading back to your pickup location!', type: 'success' });
    };

    const handleCompleted = (data: any) => {
      setAlertConfig(prev => ({ ...prev, visible: false }));
      if (data.rideId) activeRideIdRef.current = data.rideId;

      // Auto complete on the client side without showing payment screen
      if (activeRideIdRef.current && socket) {
        socket.emit('ride:payment_complete', { rideId: activeRideIdRef.current });
      }

      activeRideIdRef.current = null;
      setPaymentModalVisible(false);
      setRideStatus('IDLE');
      setRouteGeometry(null);
      currentRouteGeometryRef.current = null;
      setDriverInfo(null);
      dispatch(setDropLocation(null));
      dispatch(setIsParcel(false));
      dispatch(setParcelDetails(null));
      dispatch(setTripType('ONE_WAY'));
      setBookingStep('LOCATION');
      handleRecenter();

      setTimeout(() => {
        setAlertConfig({ visible: true, title: 'Ride Completed', message: 'Successfully completed ride', type: 'success' });
      }, 500);
    };

    const handleFailed = (data: any) => {
      setBooking(false);
      setRideStatus('IDLE');
      setOtp(null);
      setAlertConfig({
        visible: true,
        title: 'Drivers Busy',
        message: data?.message || 'All nearby drivers are currently busy with other rides. Please try again shortly.',
        type: 'error'
      });
    };

    const handleCancelled = (data: any) => {
      if (intentionalCancelReasonRef.current === 'LOCATION_UPDATE') {
        intentionalCancelReasonRef.current = null;
        setAlertConfig({ visible: true, title: 'Ride Updated', message: 'Location updated successfully. Re-searching...', type: 'success' });
        return;
      }
      if (intentionalCancelReasonRef.current === 'TIP_UPDATE') {
        intentionalCancelReasonRef.current = null;
        setAlertConfig({ visible: true, title: 'Ride Updated', message: 'Tip amount added to your ride.', type: 'success' });
        return;
      }

      setBooking(false);
      setRideStatus('IDLE');
      setOtp(null);
      setBookingStep('LOCATION');
      setAlertConfig({ visible: true, title: 'Ride Cancelled', message: data.message, type: 'info' });
    };

    socket.on('connect', handleConnect);
    socket.on('driver:location_update', handleLocationUpdate);
    socket.on('driver:offline', handleOffline);
    socket.on('ride:accepted', handleAccepted);
    socket.on('ride:driver_arrived', handleDriverArrived);
    socket.on('ride:started', handleStarted);
    socket.on('ride:intermediate_arrived', handleIntermediateArrived);
    socket.on('ride:return_started', handleReturnStarted);
    socket.on('ride:completed', handleCompleted);
    socket.on('ride:failed', handleFailed);
    socket.on('ride:cancelled', handleCancelled);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('driver:location_update', handleLocationUpdate);
      socket.off('driver:offline', handleOffline);
      socket.off('ride:accepted', handleAccepted);
      socket.off('ride:driver_arrived', handleDriverArrived);
      socket.off('ride:started', handleStarted);
      socket.off('ride:intermediate_arrived', handleIntermediateArrived);
      socket.off('ride:return_started', handleReturnStarted);
      socket.off('ride:completed', handleCompleted);
      socket.off('ride:failed', handleFailed);
      socket.off('ride:cancelled', handleCancelled);
    };
  }, [socket]);

  // Handle map padding and sheet height based on current mode
  useEffect(() => {
    if (isMapSelectionMode) {
      // When in map selection mode, only the small confirm modal is shown at the bottom
      Animated.spring(sheetHeight, { toValue: 180, useNativeDriver: false }).start();
      setMapBottomPadding(180);
      setIsSheetExpanded(false);
    } else if (bookingStep === 'LOCATION') {
      Animated.spring(sheetHeight, { toValue: height * 0.4, useNativeDriver: false }).start();
      setMapBottomPadding(height * 0.4);
      setIsSheetExpanded(false);
    } else {
      Animated.spring(sheetHeight, { toValue: height * 0.78, useNativeDriver: false }).start();
      setMapBottomPadding(height * 0.78);
      setIsSheetExpanded(false);
    }
  }, [bookingStep, isMapSelectionMode, height, sheetHeight]);

  // Initialize manual selection marker
  useEffect(() => {
    if (isMapSelectionMode) {
      setManualSelectedLocation(prev => {
        if (prev) return prev; // Do not overwrite if already set by map tap!

        if (mapSelectionIsPickup && pickupLocation) {
          setPanToCoordinate([pickupLocation.longitude, pickupLocation.latitude]);
          return { ...pickupLocation };
        } else if (!mapSelectionIsPickup && dropLocation) {
          setPanToCoordinate([dropLocation.longitude, dropLocation.latitude]);
          return { ...dropLocation };
        }
        return null;
      });
    } else {
      setManualSelectedLocation(null);
    }
  }, [isMapSelectionMode]);

  // Auto-transition to VEHICLE step when drop location is set
  useEffect(() => {
    if (dropLocation && bookingStep === 'LOCATION') {
      setBookingStep('VEHICLE');
    }
  }, [dropLocation, bookingStep]);

  useEffect(() => {
    if (!socket || (bookingStep !== 'VEHICLE' && bookingStep !== 'PARCEL') || !pickupLocation) {
      setNearbyDrivers([]);
      return;
    }

    const fetchNearby = () => {
      socket.emit('user:get_nearby_drivers', {
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
        vehicle_type_id: selectedVehicleType,
        isParcel: bookingStep === 'PARCEL'
      });
    };

    fetchNearby();
    const interval = setInterval(fetchNearby, 5000);

    const handleNearby = (drivers: any[]) => {
      setNearbyDrivers(drivers);
    };

    socket.on('user:nearby_drivers', handleNearby);

    return () => {
      clearInterval(interval);
      socket.off('user:nearby_drivers', handleNearby);
      setNearbyDrivers([]);
    };
  }, [socket, bookingStep, pickupLocation, selectedVehicleType]);

  // Handle hardware back button to return to LOCATION step instead of exiting app
  useEffect(() => {
    const onBackPress = () => {
      if (bookingStep === 'VEHICLE') {
        dispatch(setDropLocation(null));
        setBookingStep('LOCATION');
        return true; // prevent default behavior (exit app)
      }
      return false; // allow default behavior
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [bookingStep]);



  // Unified route fetching logic
  useEffect(() => {
    let targetPhase = '';
    let startLoc: any = null;
    let endLoc: any = null;

    if (rideStatus === 'IDLE' || rideStatus === 'SEARCHING') {
      if (pickupLocation && dropLocation) {
        // Re-calculate if pickup/drop changes in IDLE or SEARCHING
        targetPhase = `${rideStatus}_${pickupLocation.latitude}_${pickupLocation.longitude}_${dropLocation.latitude}_${dropLocation.longitude}`;
        startLoc = pickupLocation;
        endLoc = dropLocation;
      } else {
        setRouteGeometry(null);
        currentRouteGeometryRef.current = null;
        setRouteInfo(null);
        lastRoutedPhase.current = '';
        return;
      }
    } else if (rideStatus === 'ACCEPTED') {
      const driverLoc = driverLocationRef.current;
      if (driverLoc && pickupLocation) {
        targetPhase = 'ACCEPTED';
        startLoc = driverLoc;
        endLoc = pickupLocation;
      }
    } else if (rideStatus === 'STARTED') {
      const driverLoc = driverLocationRef.current;
      if (driverLoc && dropLocation) {
        targetPhase = 'STARTED';
        startLoc = driverLoc;
        endLoc = dropLocation;
      }
    }

    if (targetPhase && (targetPhase !== lastRoutedPhase.current || rideStatus === 'ACCEPTED' || rideStatus === 'STARTED')) {
      if (
        startLoc && endLoc &&
        typeof startLoc.latitude === 'number' && typeof startLoc.longitude === 'number' &&
        typeof endLoc.latitude === 'number' && typeof endLoc.longitude === 'number' &&
        !isNaN(startLoc.latitude) && !isNaN(startLoc.longitude) &&
        !isNaN(endLoc.latitude) && !isNaN(endLoc.longitude)
      ) {
        // Prevent multiple simultaneous requests only during live tracking (ACCEPTED/STARTED)
        if (isRouteFetchingRef.current && (rideStatus === 'ACCEPTED' || rideStatus === 'STARTED')) {
          return;
        }

        lastRoutedPhase.current = targetPhase;
        routeRequestSeq.current += 1;
        const seq = routeRequestSeq.current;

        isRouteFetchingRef.current = true;
        lastRouteRequestTimeRef.current = Date.now();

        const p = { latitude: startLoc.latitude, longitude: startLoc.longitude };
        const d = { latitude: endLoc.latitude, longitude: endLoc.longitude };

        apiClient.post('/maps/route', { pickup: p, drop: d })
          .then(res => {
            if (seq === routeRequestSeq.current) {
              isRouteFetchingRef.current = false;
            }
            // Race condition check: Ignore if a newer request was made
            if (seq === routeRequestSeq.current && res.data.success) {
              setRouteGeometry(res.data.route.geometry);
              currentRouteGeometryRef.current = res.data.route.geometry;
              setRouteInfo({
                distanceKm: res.data.route.distanceKm,
                durationMinutes: res.data.route.durationMinutes
              });
              if (rideStatus === 'ACCEPTED' || rideStatus === 'STARTED') {
                lastRouteFetchDriverLocRef.current = { latitude: startLoc.latitude, longitude: startLoc.longitude };
              }
            }
          })
          .catch(err => {
            if (seq === routeRequestSeq.current) {
              isRouteFetchingRef.current = false;
            }
            console.warn('Failed to fetch route:', err);
            // Allow retry if this was the latest attempt
            if (seq === routeRequestSeq.current) {
              lastRoutedPhase.current = '';
            }
          });
      }
    }
  }, [pickupLocation, dropLocation, rideStatus, routeTrigger]);

  const getDynamicFare = (vehicle: any) => {
    if (!routeInfo) return Math.round(Number(vehicle.base_fare));
    const billableDistance = Math.max(0, routeInfo.distanceKm - 1);
    const fare = Number(vehicle.base_fare) + (billableDistance * Number(vehicle.per_km_rate));
    if (tripType === 'TWO_WAY') {
      return Math.round(fare * 2);
    }
    return Math.round(fare);
  };

  // If the user changes location while actively searching, cancel the search and restart flow
  useEffect(() => {
    if (rideStatus === 'SEARCHING') {
      const pickupChanged = prevPickupRef.current && pickupLocation && (prevPickupRef.current.latitude !== pickupLocation.latitude || prevPickupRef.current.longitude !== pickupLocation.longitude);
      const dropChanged = prevDropRef.current && dropLocation && (prevDropRef.current.latitude !== dropLocation.latitude || prevDropRef.current.longitude !== dropLocation.longitude);

      if (pickupChanged || dropChanged) {
        intentionalCancelReasonRef.current = 'LOCATION_UPDATE';
        if (socket) socket.emit('ride:cancel');
        pendingSearchRestartRef.current = true;
      }
    }
    prevPickupRef.current = pickupLocation;
    prevDropRef.current = dropLocation;
  }, [pickupLocation, dropLocation, rideStatus, socket]);

  // Trigger search restart when the new route information is available
  useEffect(() => {
    if (pendingSearchRestartRef.current && routeInfo) {
      pendingSearchRestartRef.current = false;
      handleConfirmBooking();
    }
  }, [routeInfo]);

  const fetchInitialData = async () => {
    try {
      // Optimistic UI for locating
      if (!pickupLocationRef.current?.isManual) {
        dispatch(setPickupLocation({
          latitude: 11.3410, // Default to Erode roughly
          longitude: 77.7172,
          address: 'Please wait, getting location...',
          isManual: false
        }));
      }

      const [vehiclesRes, popularRes] = await Promise.all([
        apiClient.get('/vehicle-types'),
        apiClient.get('/maps/popular-locations')
      ]);
      setVehicles(vehiclesRes.data.data);

      // Select defaults
      if (vehiclesRes.data.data.length > 0) {
        dispatch(setSelectedVehicle(vehiclesRes.data.data[0].id));
      }

      // Request Location Permission & Get GPS
      const hasPermission = await locationService.requestPermission();
      if (hasPermission) {
        try {
          const loc = await locationService.getCurrentLocation();
          setCurrentLocation(loc);
          setPanToCoordinate([loc.longitude, loc.latitude]); // PANS MAP TO GPS!

          // Reverse geocode to get address string
          const address = await locationService.reverseGeocode(loc.latitude, loc.longitude);

          // Set as initial pickup location
          if (!pickupLocationRef.current?.isManual) {
            dispatch(setPickupLocation({
              latitude: loc.latitude,
              longitude: loc.longitude,
              address: address,
              isManual: false
            }));
          }

          // Set all popular locations (will be filtered by useMemo)
          if (popularRes.data?.success && popularRes.data.popularLocations) {
            setAllPopularLocations(popularRes.data.popularLocations);
          }

        } catch (locErr) {
          console.warn('Failed to get location completely', locErr);
          const fallbackLoc = { latitude: 11.0168, longitude: 76.9558, heading: 0, speed: 0, accuracy: 0 };
          setCurrentLocation(fallbackLoc);
          setPanToCoordinate([fallbackLoc.longitude, fallbackLoc.latitude]);

          if (!pickupLocationRef.current?.isManual) {
            dispatch(setPickupLocation({
              latitude: 11.0168,
              longitude: 76.9558,
              address: 'Location Unavailable (Check GPS)',
              isManual: false
            }));
          }
        }
      } else {
        if (!pickupLocationRef.current?.isManual) {
          dispatch(setPickupLocation({
            latitude: 11.0168,
            longitude: 76.9558,
            address: 'Permission Denied',
            isManual: false
          }));
        }
      }
    } catch (error) {
      console.error("Error loading data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDropSelection = () => {
    navigation.navigate('LocationSearch', { isPickup: false });
  };

  const handlePickupSelection = () => {
    navigation.navigate('LocationSearch', { isPickup: true });
  };

  const handleMapPress = useCallback(async (e: any) => {
    if (e?.action === 'edit_pickup') {
      dispatch(setMapSelectionMode({ isActive: true, isPickup: true }));
      setIsMapExpanded(true);
      return;
    }
    if (e?.action === 'edit_drop') {
      dispatch(setMapSelectionMode({ isActive: true, isPickup: false }));
      setIsMapExpanded(true);
      return;
    }

    let coords = null;
    if (e?.nativeEvent?.coordinate) {
      coords = [e.nativeEvent.coordinate.longitude, e.nativeEvent.coordinate.latitude];
    } else if (e?.geometry?.coordinates) {
      coords = e.geometry.coordinates; // [longitude, latitude] GeoJSON style
    } else if (e?.nativeEvent?.lngLat) {
      coords = e.nativeEvent.lngLat; // [longitude, latitude] NativeSyntheticEvent style
    } else if (e?.lngLat) {
      coords = e.lngLat; // [longitude, latitude] Direct style
    } else if (e?.coordinates) {
      coords = e.coordinates;
    }

    if (coords && Array.isArray(coords) && coords.length >= 2) {
      const lon = coords[0];
      const lat = coords[1];
      if (typeof lat === 'number' && typeof lon === 'number' && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        if (!isMapSelectionMode) {
          if (bookingStep === 'LOCATION') {
            dispatch(setMapSelectionMode({ isActive: true, isPickup: true }));
          } else {
            return;
          }
        }

        setPanToCoordinate([lon, lat]);
        setManualSelectedLocation({ latitude: lat, longitude: lon, address: 'Finding location...' });
        setIsManualSelectionLoading(true);

        if (debouncedRegionRef.current) clearTimeout(debouncedRegionRef.current);

        debouncedRegionRef.current = setTimeout(async () => {
          const lastCoords = lastReverseGeocodedCoordsRef.current;
          if (lastCoords) {
            // Removed distance check to avoid stuck "Finding location..." text
          }

          lastReverseGeocodedCoordsRef.current = { lat, lon };
          const reqId = ++manualSelectionReqIdRef.current;
          try {
            const address = await locationService.reverseGeocode(lat, lon);
            if (reqId === manualSelectionReqIdRef.current) {
              setManualSelectedLocation({ latitude: lat, longitude: lon, address });
              setIsManualSelectionLoading(false);
            }
          } catch (err) {
            if (reqId === manualSelectionReqIdRef.current) {
              setManualSelectedLocation({ latitude: lat, longitude: lon, address: 'Unable to identify this location' });
              setIsManualSelectionLoading(false);
            }
          }
        }, 800);
      }
    }
  }, [dispatch, isMapSelectionMode, bookingStep, pickupLocation]);
  const debouncedRegionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReverseGeocodedCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const isUserDraggingMapRef = useRef(false);

  const handleRegionChangeStart = useCallback(() => {
    isUserDraggingMapRef.current = true;
    if (isMapSelectionMode) {
      if (manualSelectedLocation?.address !== 'Finding location...') {
        setManualSelectedLocation(prev => prev ? { ...prev, address: 'Finding location...' } : null);
      }
    }
  }, [isMapSelectionMode, manualSelectedLocation]);

  const handleRegionChange = useCallback((loc: LocationData) => {
    if (!isUserDraggingMapRef.current) return;

    const lat = loc.latitude;
    const lon = loc.longitude;

    if (isMapSelectionMode) {
      setManualSelectedLocation({ ...loc, address: 'Finding location...' });
    } else {
      isUserDraggingMapRef.current = false;
      return;
    }

    setIsManualSelectionLoading(true);

    if (debouncedRegionRef.current) clearTimeout(debouncedRegionRef.current);

    debouncedRegionRef.current = setTimeout(async () => {
      isUserDraggingMapRef.current = false;
      const lastCoords = lastReverseGeocodedCoordsRef.current;
      if (lastCoords) {
        // Removed distance check to avoid stuck "Finding location..." text
      }

      lastReverseGeocodedCoordsRef.current = { lat, lon };
      const reqId = ++manualSelectionReqIdRef.current;
      try {
        const address = await locationService.reverseGeocode(lat, lon);
        if (reqId === manualSelectionReqIdRef.current) {
          if (isMapSelectionMode) {
            setManualSelectedLocation({ latitude: lat, longitude: lon, address });
          }
          setIsManualSelectionLoading(false);
        }
      } catch (err) {
        if (reqId === manualSelectionReqIdRef.current) {
          if (isMapSelectionMode) {
            setManualSelectedLocation({ latitude: lat, longitude: lon, address: 'Unable to identify this location' });
          }
          setIsManualSelectionLoading(false);
        }
      }
    }, 800);
  }, [isMapSelectionMode, bookingStep, dispatch]);

  const handleBookRide = () => {
    if (!pickupLocation || !dropLocation) {
      Alert.alert('Missing Details', 'Please select pickup and drop locations.');
      return;
    }

    // Automatically select the first vehicle if not selected
    if (!selectedVehicleType && vehicles.length > 0) {
      dispatch(setSelectedVehicle((vehicles[0] as any).id));
    }

    setBookingStep('VEHICLE');
  };

  const handleConfirmBooking = async (tipAmount: number = 0) => {
    const selectedVehicle = vehicles.find((v: any) => v.id === selectedVehicleType);
    if (selectedVehicle?.name?.toLowerCase() === 'parcel') {
      setBookingStep('PARCEL');

      Animated.spring(sheetHeight, {
        toValue: height * 0.85,
        useNativeDriver: false,
        friction: 8
      }).start();
      setMapBottomPadding(height * 0.85);
      setIsSheetExpanded(true);

      return;
    }

    if (tripType !== 'ONE_WAY' && tripType !== 'TWO_WAY') {
      Alert.alert("Error", "Please select a valid Trip Type (One Way or Two Way).");
      return;
    }

    setBooking(true);
    setRideStatus('SEARCHING');

    // Automatically expand the sheet so they can see everything without scrolling
    Animated.spring(sheetHeight, {
      toValue: height * 0.76,
      useNativeDriver: false,
      friction: 8
    }).start();
    setMapBottomPadding(height * 0.76);
    setIsSheetExpanded(true);

    // We emit directly via socket for the matching engine
    if (socket) {
      socket.emit('ride:request', {
        pickup: {
          latitude: pickupLocation!.latitude,
          longitude: pickupLocation!.longitude,
          address: pickupLocation!.address
        },
        drop: {
          latitude: dropLocation!.latitude,
          longitude: dropLocation!.longitude,
          address: dropLocation!.address
        },
        vehicle_type_id: selectedVehicleType,
        vehicle_name: vehicles.find((v: any) => v.id === selectedVehicleType)?.name || 'Bike',
        estimated_fare: getDynamicFare(vehicles.find((v: any) => v.id === selectedVehicleType) || vehicles[0]),
        tip: tipAmount,
        distance: routeInfo?.distanceKm ? routeInfo.distanceKm.toFixed(1) : '0',
        duration: routeInfo?.durationMinutes ? Math.round(routeInfo.durationMinutes) : '0',
        passengers: vehicles.find((v: any) => v.id === selectedVehicleType)?.name?.toLowerCase() === 'bike' ? 1 : (vehicles.find((v: any) => v.id === selectedVehicleType)?.name?.toLowerCase() === 'auto' ? 3 : 4),
        trip_type: tripType
      });
    } else {
      Alert.alert("Error", "Not connected to server.");
      setBooking(false);
      setRideStatus('IDLE');
    }
  };

  const handlePlaceParcelOrder = (details: { recipientName: string, recipientPhone: string, parcelDescription: string }) => {
    setBooking(true);
    setRideStatus('SEARCHING');

    if (socket) {
      socket.emit('ride:request', {
        pickup: {
          latitude: pickupLocation!.latitude,
          longitude: pickupLocation!.longitude,
          address: pickupLocation!.address
        },
        drop: {
          latitude: dropLocation!.latitude,
          longitude: dropLocation!.longitude,
          address: dropLocation!.address
        },
        vehicle_type_id: selectedVehicleType,
        vehicle_name: vehicles.find((v: any) => v.id === selectedVehicleType)?.name || 'Parcel',
        estimated_fare: getDynamicFare(vehicles.find((v: any) => v.id === selectedVehicleType) || vehicles[0]),
        tip: 0,
        distance: routeInfo?.distanceKm ? routeInfo.distanceKm.toFixed(1) : '0',
        duration: routeInfo?.durationMinutes ? Math.round(routeInfo.durationMinutes) : '0',
        passengers: 0,
        isParcel: true,
        recipient_name: details.recipientName,
        recipient_phone: details.recipientPhone,
        parcel_description: details.parcelDescription
      });
    } else {
      Alert.alert("Error", "Not connected to server.");
      setBooking(false);
      setRideStatus('IDLE');
    }
  };

  const handleCancelBooking = (intentionalReason?: string) => {
    if (intentionalReason && typeof intentionalReason === 'string') {
      intentionalCancelReasonRef.current = intentionalReason;
    }

    if (rideStatus === 'ACCEPTED') {
      setCancelReason('');
      setCancelOtherText('');
      setCancelError('');
      setCancelModalVisible(true);
      return;
    }

    // For SEARCHING, cancel directly without reason
    if (socket) {
      socket.emit('ride:cancel', {});
    }
    setBooking(false);
    setRideStatus('IDLE');
    setOtp(null);
    setBookingStep('VEHICLE'); // Keep them on the vehicle step so they can pick another one quickly

    Animated.spring(sheetHeight, {
      toValue: height * 0.78,
      useNativeDriver: false,
      friction: 8
    }).start();
    setMapBottomPadding(height * 0.78);
    setIsSheetExpanded(false);
  };

  const submitCancelReason = () => {
    if (cancelReason === 'Other' && !cancelOtherText.trim()) {
      setCancelError('Please enter a reason.');
      return;
    }
    const finalReason = cancelReason === 'Other' ? cancelOtherText.trim() : cancelReason;
    if (socket) {
      socket.emit('ride:cancel', { reason: finalReason });
    }
    setCancelModalVisible(false);
    setBooking(false);
    setRideStatus('IDLE');
    setOtp(null);
    setBookingStep('VEHICLE');

    Animated.spring(sheetHeight, {
      toValue: height * 0.78,
      useNativeDriver: false,
      friction: 8
    }).start();
    setMapBottomPadding(height * 0.78);
    setIsSheetExpanded(false);

    setAlertConfig({ visible: true, title: 'Ride cancelled', message: 'Your ride was successfully cancelled.', type: 'info' });
  };

  const handleRecenter = async () => {
    try {
      const loc = await locationService.getCurrentLocation();
      setCurrentLocation(loc);
      setRecenterTrigger(Date.now());

      if (bookingStepRef.current === 'LOCATION') {
        const address = await locationService.reverseGeocode(loc.latitude, loc.longitude);
        dispatch(setPickupLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: address,
          isManual: false
        }));
      }
    } catch (err) {
      console.warn('Failed to recenter GPS', err);
    }
  };

  if (isHydrating) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#11704B" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading ride state...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Location Disabled Modal */}
      {!isLocationEnabled && (
        <View style={styles.locationModalOverlay}>
          <View style={styles.locationModalContent}>
            <View style={styles.locationIconWrapper}>
              <Icon name="map-marker-off" size={50} color="#E53935" />
            </View>
            <Text style={styles.locationModalTitle}>Location is Disabled</Text>
            <Text style={styles.locationModalDesc}>
              We need your location to find nearby rides and track your journey. Please enable location services to continue.
            </Text>
            <TouchableOpacity
              style={styles.locationEnableBtn}
              onPress={checkLocationStatus}
            >
              <Text style={styles.locationEnableBtnText}>Turn On Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Interactive Map */}
      <Animated.View style={[
        styles.mapExpanded,
        (rideStatus === 'ACCEPTED' || rideStatus === 'STARTED') ? { height: height * 0.75, marginTop: 0 } : {
          height: height * 0.85, // Increased map height to close the gap
          marginTop: -25,
          transform: [{
            translateY: sheetHeight.interpolate({
              inputRange: [height * 0.4, height * 0.6],
              outputRange: [0, -(height * 0.1)],
              extrapolate: 'clamp'
            })
          }]
        }
      ]}>
        <EagleMap
          mapBottomPadding={mapBottomPadding}
          isSheetExpanded={isSheetExpanded}
          currentLocation={currentLocation}
          selectedVehicleName={vehicles.find(v => v.id === selectedVehicleType)?.name}
          pickupLocation={pickupLocation}
          dropLocation={dropLocation}
          routeGeometry={routeGeometry}
          recenterTrigger={recenterTrigger}
          onMapPress={handleMapPress}
          isSelectingLocation={isMapSelectionMode || (rideStatus === 'IDLE' && bookingStep === 'LOCATION')}
          onRegionChange={handleRegionChange}
          onRegionChangeStart={handleRegionChangeStart}
          isMapSelectionMode={isMapSelectionMode}
          manualSelectedLocation={manualSelectedLocation}
          followDriver={rideStatus === 'ACCEPTED' || rideStatus === 'STARTED'}
          mapSelectionIsPickup={isMapSelectionMode ? mapSelectionIsPickup : true}
          nearbyDrivers={nearbyDrivers}
          panToCoordinate={panToCoordinate}
          mapTheme={mapTheme}
        />



      </Animated.View>

      {/* Current Location Button */}
      {(rideStatus === 'IDLE' || rideStatus === 'SEARCHING') && (bookingStep === 'LOCATION' || isMapSelectionMode) && (
        <Animated.View style={[
          styles.currentLocationButton,
          {
            transform: [{
              translateY: sheetHeight.interpolate({
                inputRange: [height * 0.4, height * 0.6],
                outputRange: [-(height * 0.42), -(height * 0.62)],
                extrapolate: 'clamp'
              })
            }]
          }
        ]}>
          <TouchableOpacity
            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
            onPress={async () => {
              if (currentLocation) {
                setPanToCoordinate([currentLocation.longitude, currentLocation.latitude]);
                let actualAddress = 'Current Location';
                try {
                  const fetchedAddress = await locationService.reverseGeocode(currentLocation.latitude, currentLocation.longitude);
                  if (fetchedAddress) {
                    actualAddress = fetchedAddress;
                  }
                } catch (err) {
                  console.log("Reverse Geocoding failed:", err);
                }

                if (isMapSelectionMode) {
                  setManualSelectedLocation({ ...currentLocation, address: actualAddress });
                } else if (bookingStep === 'LOCATION') {
                  dispatch(setPickupLocation({ ...currentLocation, address: actualAddress, isManual: false }));
                }
              }
            }}
          >
            <Icon name="crosshairs-gps" size={24} color="#11704B" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Map Theme Toggle Button */}
      {(rideStatus === 'IDLE' || rideStatus === 'SEARCHING') && !isMapSelectionMode && (
        <View style={[styles.currentLocationButton, { top: insets.top + 60, bottom: 'auto' }]}>
          <TouchableOpacity
            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => {
              const newTheme = mapTheme === 'light' ? 'dark' : 'light';
              dispatch(setMapTheme(newTheme));
              AsyncStorage.setItem('mapTheme', newTheme);
            }}
          >
            <Icon name={mapTheme === 'light' ? 'weather-night' : 'weather-sunny'} size={24} color="#11704B" />
          </TouchableOpacity>
        </View>
      )}



      {/* Floating Address Pill */}
      {(rideStatus === 'IDLE' || rideStatus === 'SEARCHING') && bookingStep === 'LOCATION' && !isMapSelectionMode && (
        <Animated.View style={[
          styles.floatingPillContainer,
          { bottom: Animated.add(sheetHeight, 25) }
        ]}>
          <View style={styles.floatingAddressPill}>
            <View style={styles.greenRing}>
              <View style={styles.greenInnerDot} />
            </View>
            <Text style={styles.floatingAddressText} numberOfLines={1}>
              {pickupLocation?.address || 'Locating...'}
            </Text>
          </View>
          {isSheetExpanded && (
            <>
              <View style={styles.centerPinTriangle} />
              <View style={styles.centerPinDotWrapper}>
                <View style={styles.centerPinInnerDot} />
              </View>
            </>
          )}
        </Animated.View>
      )}

      {/* MAP SELECTION MODE BOTTOM SHEET */}
      {isMapSelectionMode && (
        <View style={[styles.bottomSheet, { height: 'auto', paddingBottom: 30, paddingHorizontal: 20 }]}>
          <View style={{ paddingVertical: 4, alignItems: 'center' }}>
            <View style={styles.dragHandle} />
          </View>

          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 15 }}>
            Select {mapSelectionIsPickup ? 'Pickup' : 'Drop'} Location
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 15, borderRadius: 10, marginBottom: 20 }}>
            <Icon name="map-marker-outline" size={24} color={mapSelectionIsPickup ? "#11704B" : "#E53935"} />
            <Text style={{ fontSize: 14, color: '#333', marginLeft: 10, flex: 1 }} numberOfLines={2}>
              {manualSelectedLocation ? manualSelectedLocation.address : 'Tap anywhere on the map to select a location'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#F3F4F6' }]}
              onPress={() => {
                dispatch(setMapSelectionMode({ isActive: false, isPickup: false }));
                setManualSelectedLocation(null);
              }}
            >
              <Text style={{ color: '#000', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: manualSelectedLocation && !isManualSelectionLoading ? '#11704B' : '#A5D6A7' }]}
              disabled={!manualSelectedLocation || isManualSelectionLoading}
              onPress={() => {
                if (manualSelectedLocation) {
                  if (mapSelectionIsPickup) {
                    dispatch(setPickupLocation({ ...manualSelectedLocation, isManual: true }));
                    // Auto-navigate to drop location search if it's not set yet
                    if (!dropLocation) {
                      setTimeout(() => {
                        navigation.navigate('LocationSearch', { isPickup: false });
                      }, 300);
                    }
                  } else {
                    dispatch(setDropLocation({ ...manualSelectedLocation, isManual: true }));
                  }
                  dispatch(setMapSelectionMode({ isActive: false, isPickup: false }));
                  setManualSelectedLocation(null);
                  if (bookingStep === 'VEHICLE') {
                    handleBookRide();
                  }
                }
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                {isManualSelectionLoading ? 'Locating...' : 'Confirm Location'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* BOTTOM SHEET */}
      {(rideStatus === 'IDLE' || rideStatus === 'SEARCHING') && !isMapSelectionMode && (
        <Animated.View {...panResponder.panHandlers} style={[styles.bottomSheet, { height: sheetHeight }]}>
          <View style={{ paddingVertical: 4, alignItems: 'center' }}>
            <View style={styles.dragHandle} />
          </View>

          {bookingStep === 'LOCATION' && (
            <ScrollView scrollEnabled={false} showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.sheetScroll}>
              <>
                {/* Search Bar */}
                <View style={styles.searchBarWrapper}>
                  <TouchableOpacity style={styles.searchBarContainer} onPress={handleDropSelection}>
                    <Icon name="magnify" size={24} color="#000" />
                    <Text style={styles.searchBarText}>Where do you want to go?</Text>
                  </TouchableOpacity>
                </View>

                {/* History List */}
                <View style={styles.historyList}>
                  {popularLocations && popularLocations.length > 0 ? (
                    popularLocations.slice(0, 3).map((loc, index) => (
                      <React.Fragment key={`popular-loc-${index}`}>
                        <TouchableOpacity style={styles.historyItem} onPress={() => {
                          dispatch(setDropLocation({
                            latitude: parseFloat(loc.latitude),
                            longitude: parseFloat(loc.longitude),
                            address: loc.address || loc.name,
                            isManual: true
                          }));
                          setBookingStep('VEHICLE');
                        }}>
                          <Icon name="history" size={24} color="#666" />
                          <View style={styles.historyDetails}>
                            <Text style={styles.historyTitle}>{loc.name || loc.address?.split(',')[0]}</Text>
                            <Text style={styles.historySubtitle} numberOfLines={1}>{loc.address}</Text>
                          </View>
                          <Icon name="heart-outline" size={24} color="#666" />
                        </TouchableOpacity>
                        {index < popularLocations.length - 1 && <View style={styles.historyDivider} />}
                      </React.Fragment>
                    ))
                  ) : (
                    <Text style={{ textAlign: 'center', padding: 20, color: '#888' }}>Loading popular locations...</Text>
                  )}
                </View>

                {/* Popular Locations */}
                <View style={styles.popularSection}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 15 }}>Popular Locations</Text>
                  <View style={styles.popularGrid}>
                    {!currentLocation ? (
                      // Skeleton Cards
                      [1, 2, 3, 4].map((key) => (
                        <View key={key} style={[styles.popularCard, styles.skeletonCard]}>
                          <View style={styles.skeletonImage} />
                          <View style={styles.skeletonText} />
                          <View style={[styles.skeletonText, { width: '60%', marginTop: 5 }]} />
                        </View>
                      ))
                    ) : popularLocations.length > 0 ? (
                      popularLocations.map((loc) => (
                        <TouchableOpacity
                          key={loc.id}
                          style={styles.popularCard}
                          onPress={() => {
                            dispatch(setDropLocation({ latitude: parseFloat(loc.latitude), longitude: parseFloat(loc.longitude), address: `${loc.title}, ${loc.address}` }));
                            setBookingStep('VEHICLE');
                          }}
                        >
                          <Image source={{ uri: loc.image_url?.startsWith('http') ? loc.image_url : getApiUrl(loc.image_url) }} style={styles.popularImage} />
                          <Text style={styles.popularText} numberOfLines={2}>{loc.title}</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={{ color: '#666', marginTop: 10 }}>No popular locations nearby.</Text>
                    )}
                  </View>
                </View>
              </>
            </ScrollView>
          )}
          {(bookingStep === 'VEHICLE' && !booking) && (
            <View style={{ paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.greenRing}><View style={styles.greenInnerDot} /></View>
                <Text style={{ marginLeft: 10, fontSize: 14, color: '#111827', flex: 1, fontWeight: '500' }} numberOfLines={1}>{pickupLocation?.address || 'Pickup'}</Text>
              </View>
              <View style={{ height: 16, width: 2, backgroundColor: '#E5E7EB', marginLeft: 6, marginVertical: 2 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.orangeRing}><View style={styles.orangeDot} /></View>
                <Text style={{ marginLeft: 10, fontSize: 14, color: '#111827', flex: 1, fontWeight: '500' }} numberOfLines={1}>{dropLocation?.address || 'Drop'}</Text>
              </View>
            </View>
          )}
          {bookingStep === 'VEHICLE' && (
            <VehicleSelectionSheet
              vehicles={vehicles}
              selectedVehicleType={selectedVehicleType}
              routeInfo={routeInfo}
              booking={booking}
              onSelectVehicle={(id) => dispatch(setSelectedVehicle(id))}
              onConfirmBooking={handleConfirmBooking}
              onCancelBooking={handleCancelBooking}
              getDynamicFare={getDynamicFare}
              tripType={tripType}
              onSelectTripType={(type) => dispatch(setTripType(type))}
              isSheetExpanded={isSheetExpanded}
            />
          )}
          {bookingStep === 'PARCEL' && (
            <ParcelBookingSheet
              pickupLocation={pickupLocation}
              dropLocation={dropLocation}
              fareAmount={getDynamicFare(vehicles.find((v: any) => v.id === selectedVehicleType) || vehicles[0])}
              onEditPickup={() => navigation.navigate('LocationSearch', { isPickup: true })}
              onEditDrop={() => navigation.navigate('LocationSearch', { isPickup: false })}
              onPlaceOrder={handlePlaceParcelOrder}
              onBack={() => setBookingStep('VEHICLE')}
              booking={booking}
            />
          )}
        </Animated.View>
      )}

      {/* ACTIVE RIDE BOTTOM SHEET */}
      {(rideStatus === 'ACCEPTED' || rideStatus === 'STARTED') && (
        <View style={styles.activeRideSheet}>
          {rideStatus === 'ACCEPTED' ? (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Icon name="lock" size={20} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>Share this OTP with driver</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Driver will ask for this OTP to start the ride</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {String(otp || '0000').split('').map((digit, index) => (
                    <View key={index} style={{ width: 50, height: 50, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>{digit}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
                  <Icon name="copy" size={16} color="#059669" />
                  <Text style={{ color: '#059669', fontWeight: 'bold', marginLeft: 4 }}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ marginBottom: 20 }}>
              <View style={{ alignItems: 'center', marginBottom: tripType === 'TWO_WAY' && twoWayStage === 'WAITING' ? 12 : 0 }}>
                <Text style={{ color: '#059669', fontSize: 22, fontWeight: 'bold' }}>
                  {tripType === 'TWO_WAY' 
                    ? (twoWayStage === 'WAITING' ? 'Waiting for your Return ⏳' : twoWayStage === 'RETURN' ? 'Returning to Pickup Point 🔄' : 'Heading to Destination')
                    : 'Enjoy your ride!'}
                </Text>
              </View>

              {tripType === 'TWO_WAY' && twoWayStage === 'WAITING' && (() => {
                const freeTotalSecs = (Number(userWaitingFreeLimit) || 0) * 60;
                const remainingSecs = freeTotalSecs - userWaitingSeconds;
                const isOvertime = remainingSecs < 0;

                let timeString = '';
                if (!isOvertime) {
                  const displayMins = Math.floor(remainingSecs / 60);
                  const displaySecs = remainingSecs % 60;
                  timeString = `${displayMins}m ${displaySecs < 10 ? '0' : ''}${displaySecs}s`;
                } else {
                  const extraSecs = userWaitingSeconds - freeTotalSecs;
                  const displayMins = Math.floor(extraSecs / 60);
                  const displaySecs = extraSecs % 60;
                  timeString = `-${displayMins}m ${displaySecs < 10 ? '0' : ''}${displaySecs}s`;
                }

                return (
                  <View style={{ backgroundColor: isOvertime ? '#FEF2F2' : '#FEF3C7', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: isOvertime ? '#FCA5A5' : '#FDE68A' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: isOvertime ? '#991B1B' : '#92400E' }}>
                        {isOvertime ? 'Extra Waiting Time' : 'Free Waiting Time Left'}
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: isOvertime ? '#DC2626' : '#B45309' }}>
                        {timeString}
                      </Text>
                    </View>
                    <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: isOvertime ? '#7F1D1D' : '#78350F' }}>
                        Free limit: {userWaitingFreeLimit} mins
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: userWaitingCharge > 0 ? '#DC2626' : '#059669' }}>
                        Waiting Charge: ₹{userWaitingCharge}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          )}

          <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 20 }} />

          {/* Driver Info Profile */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#C8E6C9', overflow: 'hidden' }}>
              <Image
                source={{ uri: driverInfo?.photo?.startsWith('http') ? driverInfo.photo : getApiUrl(driverInfo?.photo || '/uploads/default-avatar.png') }}
                style={{ width: '100%', height: '100%' }}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>{driverInfo?.name || 'Driver Assigned'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 10 }}>
                  <Icon name="star" size={12} color="#059669" />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#059669', marginLeft: 4 }}>4.8</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Icon name="phone" size={14} color="#059669" />
                <Text style={{ fontSize: 14, color: '#374151', marginLeft: 5, fontWeight: '500' }}>{driverInfo?.phone || '+91 98765 43210'}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 }}
              onPress={() => { if (driverInfo?.phone) Linking.openURL(`tel:${driverInfo.phone}`) }}
            >
              <Icon name="phone" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Vehicle Info Box */}
          <View style={{ padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 100, height: 70, justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
              <Image
                source={
                  (driverInfo?.vehicleName || vehicles.find((v: any) => v.id === selectedVehicleType)?.name || '').toLowerCase() === 'auto'
                    ? require('../../assets/images/auto.png')
                    : (driverInfo?.vehicleName || vehicles.find((v: any) => v.id === selectedVehicleType)?.name || '').toLowerCase() === 'bike'
                      ? { uri: 'https://cdn-icons-png.flaticon.com/512/3721/3721619.png' }
                      : (driverInfo?.vehicleName || vehicles.find((v: any) => v.id === selectedVehicleType)?.name || '').toLowerCase() === 'parcel'
                        ? { uri: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' }
                        : { uri: 'https://cdn-icons-png.flaticon.com/512/741/741407.png' }
                }
                style={{ width: 100, height: 70 }}
                resizeMode="contain"
              />
            </View>
            <View style={{ flex: 1, paddingVertical: 2 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>
                {driverInfo?.make ? `${driverInfo.make} ${driverInfo.model}` : 'Vehicle Model'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Icon name="car" size={14} color="#6B7280" />
                <Text style={{ fontSize: 13, color: '#6B7280', marginLeft: 6 }}>
                  {driverInfo?.vehicleName || vehicles.find(v => v.id === selectedVehicleType)?.name || 'Car'} • {driverInfo?.color || 'White'}
                </Text>
              </View>
              <View style={{ backgroundColor: '#F3F4F6', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#374151', letterSpacing: 0.5 }}>
                  {driverInfo?.registrationNumber || 'TN 33 AB 1234'}
                </Text>
              </View>
            </View>
          </View>

          {/* Parcel Info Box */}
          {isParcel && parcelDetails && (
            <View style={{ padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Icon name="package-variant-closed" size={20} color="#059669" />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827', marginLeft: 8 }}>Parcel Delivery</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                <Icon name="account-outline" size={16} color="#6B7280" />
                <Text style={{ fontSize: 14, color: '#374151', marginLeft: 6 }}>{parcelDetails.recipientName}</Text>
              </View>
              {parcelDetails.recipientPhone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                  <Icon name="phone-outline" size={16} color="#6B7280" />
                  <Text style={{ fontSize: 14, color: '#374151', marginLeft: 6 }}>{parcelDetails.recipientPhone}</Text>
                </View>
              ) : null}
              {parcelDetails.parcelDescription ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 5 }}>
                  <Icon name="text-box-outline" size={16} color="#6B7280" style={{ marginTop: 2 }} />
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 6, flex: 1 }}>{parcelDetails.parcelDescription}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Cancel button placed below, styled as a subtle text link to match the clean design */}
          {rideStatus === 'ACCEPTED' && (
            <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => handleCancelBooking()}>
              <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 14 }}>Cancel Ride</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />

      <PaymentModal
        visible={paymentModalVisible}
        fare={completedFare}
        driverInfo={driverInfo}
        onPaymentComplete={(method) => {
          if (socket && activeRideIdRef.current) {
            socket.emit('ride:payment_complete', { rideId: activeRideIdRef.current });
          }
          activeRideIdRef.current = null;
          setPaymentModalVisible(false);
          setRideStatus('IDLE');
          setRouteGeometry(null);
          setDriverInfo(null);
          dispatch(setDropLocation(null));
          dispatch(setIsParcel(false));
          dispatch(setParcelDetails(null));
          dispatch(setTripType('ONE_WAY'));
          setBookingStep('LOCATION');
          // Reset to current location
          if (currentLocation) {
            dispatch(setPickupLocation({
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              address: 'Locating...',
              isManual: false
            }));
          }
          handleRecenter();
          // Show success alert
          setTimeout(() => {
            setAlertConfig({ visible: true, title: 'Payment Successful', message: `Paid via ${method}. Thank you for riding with CityRide!`, type: 'success' });
          }, 500);
        }}
      />

      {cancelModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>CANCEL RIDE</Text>
            <Text style={{ fontSize: 16, color: '#333', marginBottom: 15 }}>Why are you cancelling?</Text>

            <ScrollView style={{ maxHeight: 250, marginBottom: 15 }}>
              {CANCEL_REASONS.map((reason, index) => (
                <TouchableOpacity
                  key={index}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}
                  onPress={() => { setCancelReason(reason); setCancelError(''); }}
                >
                  <View style={{ height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: cancelReason === reason ? '#11704B' : '#ccc', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    {cancelReason === reason && <View style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: '#11704B' }} />}
                  </View>
                  <Text style={{ fontSize: 14, color: '#333' }}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {cancelReason === 'Other' && (
              <View style={{ marginBottom: 15 }}>
                <TextInput
                  style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 14, color: '#000' }}
                  placeholder="Enter your reason"
                  value={cancelOtherText}
                  onChangeText={(text: string) => { setCancelOtherText(text); setCancelError(''); }}
                  multiline
                />
                {cancelError ? <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{cancelError}</Text> : null}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]} onPress={() => setCancelModalVisible(false)}>
                <Text style={{ color: '#374151', fontWeight: 'bold' }}>Keep Ride</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#DC2626', opacity: cancelReason ? 1 : 0.5 }]}
                onPress={submitCancelReason}
                disabled={!cancelReason}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  locationModalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 99999,
    elevation: 9999,
  },
  locationModalContent: {
    backgroundColor: '#fff', width: '75%', padding: 25,
    borderRadius: 20, alignItems: 'center', elevation: 10,
  },
  locationIconWrapper: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  locationModalTitle: {
    fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 10,
  },
  locationModalDesc: {
    fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 25, lineHeight: 20,
  },
  locationEnableBtn: {
    backgroundColor: '#11704B', paddingVertical: 14, paddingHorizontal: 30,
    borderRadius: 30, width: '100%', alignItems: 'center',
  },
  locationEnableBtnText: {
    color: '#fff', fontSize: 16, fontWeight: 'bold',
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: COLORS.bg },
  map: { flex: 1, height: height * 0.5 },
  mapExpanded: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 },
  dummyMap: { backgroundColor: COLORS.bg },
  centerMapContainer: { position: 'absolute', top: '40%', alignSelf: 'center', alignItems: 'center' },
  blueDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(33, 150, 243, 0.2)', justifyContent: 'center', alignItems: 'center' },
  blueDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2196F3' },
  mapCityText: { fontSize: 16, fontWeight: 'bold', color: '#000', marginTop: 5 },
  gpsButton: { display: 'none' },

  otpBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 25,
    elevation: 10,
  },
  otpBannerText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  otpHighlight: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', letterSpacing: 2 },

  floatingPillContainer: { position: 'absolute', width: '100%', alignItems: 'center', zIndex: 10 },
  floatingAddressPill: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 30, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 6, maxWidth: '85%' },
  floatingAddressText: { fontSize: 14, color: '#333', fontWeight: '500', flexShrink: 1 },
  centerPinTriangle: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff', marginTop: -1 },
  centerPinDotWrapper: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(17, 112, 75, 0.15)', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  centerPinInnerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#11704B' },


  greenRing: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  greenInnerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  orangeRing: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#C66C38', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDECE4' },
  orangeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C66C38' },

  searchBarWrapper: {
    backgroundColor: '#facc15', // Gold/Yellow
    borderRadius: 30,
    paddingLeft: 4,
    paddingBottom: 2,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 30, paddingHorizontal: 15, paddingVertical: 15 },
  searchBarText: { fontSize: 16, fontWeight: 'bold', color: '#4b5563', marginLeft: 10 },
  historyList: { marginTop: 10 },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  historyDetails: { flex: 1, marginLeft: 15 },
  historyTitle: { fontSize: 15, fontWeight: 'bold', color: '#000' },
  historySubtitle: { fontSize: 13, color: '#777', marginTop: 3 },
  historyDivider: { height: 1, backgroundColor: '#EEE', marginVertical: 0, marginLeft: 50 },

  popularSection: { marginTop: 20 },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  popularCard: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginBottom: 15,
    overflow: 'hidden',
  },
  popularImage: {
    width: '100%',
    height: 70,
    resizeMode: 'cover',
  },
  popularText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#444',
    textAlign: 'center',
    padding: 8,
    minHeight: 50,
  },
  popularSearchIconWrapper: {
    width: '100%',
    height: 70,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  rightHeader: { flexDirection: 'row', alignItems: 'center' },
  notifyBtn: { marginRight: 15 },
  notifyBadge: { position: 'absolute', top: 0, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.danger },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },

  greetingHeader: { marginTop: 15, paddingHorizontal: 5 },
  helloText: { fontSize: 14, color: COLORS.textSub },
  nameText: { fontSize: 24, fontWeight: 'bold', color: COLORS.textTitle },
  whereText: { fontSize: 14, color: COLORS.textSub, marginTop: 4 },

  promoRow: { flexDirection: 'row', marginTop: 20, justifyContent: 'space-between', alignItems: 'stretch' },
  locationBubble: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, marginRight: 10 },
  locBubbleTextCol: { flex: 1, marginLeft: 8 },
  locTitle: { fontSize: 11, color: COLORS.textSub },
  locSubtitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textTitle },
  promoBubble: { backgroundColor: '#E3F5EC', borderRadius: 12, padding: 12, width: 120, justifyContent: 'center', paddingRight: 25 },
  promoText: { fontSize: 10, color: COLORS.primary },
  promoTextBold: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },

  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#F7F8FA', borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 15, zIndex: 20 },
  dragHandle: { width: 40, height: 4, backgroundColor: COLORS.primary, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 10 },
  sheetScroll: { paddingHorizontal: 20, paddingBottom: 40 },

  centerPinAnchor: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    zIndex: 10,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultPinWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 120,
    height: 80,
    bottom: -8, // Centers the 16x16 dot exactly at 0,0
  },
  expandedPinWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 320,
    height: 100,
    bottom: -8, // Centers the 16x16 map dot exactly at 0,0
  },
  expandedPinBubble: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    maxWidth: 320,
  },
  expandedPinText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    flexShrink: 1,
  },
  expandedPinTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    marginBottom: 4,
  },
  expandedPinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#11704B',
  },
  centerPinBubble: {
    backgroundColor: '#11704B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  centerPinText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },

  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textTitle },
  mapBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  mapBtnText: { fontSize: 12, fontWeight: 'bold', color: COLORS.textTitle, marginLeft: 5 },

  timelineContainer: { flexDirection: 'row', backgroundColor: '#F9F9F9', borderRadius: 16, padding: 15, marginBottom: 20 },
  timelineLeft: { alignItems: 'center', marginRight: 15, paddingTop: 5 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: { width: 2, flex: 1, backgroundColor: '#E0E0E0', marginVertical: 4 },
  timelineRight: { flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  locInputLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  locInputText: { fontSize: 16, color: '#000', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10, marginLeft: 0 },
  routeInfoContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 8, backgroundColor: COLORS.primaryLight, borderRadius: 6 },
  routeInfoText: { marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: COLORS.primary },

  currentLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: 20, // Adjust based on bottom sheet
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  vehicleSection: { marginTop: 15 },
  vehicleCard: { flex: 1, height: 110, backgroundColor: '#fff', borderRadius: 12, padding: 5, marginHorizontal: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F0F0F0' },
  vehicleSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  vImage: { width: 60, height: 40, marginBottom: 8 },
  vName: { fontSize: 15, fontWeight: 'bold', color: COLORS.textTitle },
  vDesc: { fontSize: 11, color: COLORS.textSub, marginTop: 2 },

  rideTypeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textTitle, marginLeft: 8 },
  learnMore: { fontSize: 12, color: COLORS.textSub, marginLeft: 4 },

  rideTypeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  rTypeCard: { flex: 0.48, flexDirection: 'row', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  rTypeSelected: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  rName: { fontSize: 14, fontWeight: 'bold', color: COLORS.textTitle },
  rDesc: { fontSize: 11, color: COLORS.textSub },

  bookBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  bookBtnDisabled: { backgroundColor: '#A5D6C1' },
  bookBtnText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },

  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  quickActionItem: { alignItems: 'center', width: 65 },
  quickActionIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 11, color: COLORS.textTitle, textAlign: 'center' },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '85%',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: COLORS.primary, textAlign: 'center' },
  modalLocContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  modalLocText: { fontSize: 14, color: '#333', marginLeft: 10, flex: 1 },
  modalLine: { height: 15, width: 2, backgroundColor: '#ccc', marginLeft: 5, marginVertical: 2 },
  modalFare: { fontSize: 22, fontWeight: 'bold', color: '#000', marginVertical: 20, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },

  verticalVehicleList: { marginTop: 0 },
  vehicleRowCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#fff', marginBottom: 10, backgroundColor: '#fff' },
  vehicleRowSelected: { borderColor: '#1E3A8A', backgroundColor: '#F0F8FF' },
  vrImage: { width: 50, height: 40, marginRight: 15 },
  vrDetails: { flex: 1 },
  vrName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textTitle },
  vrDesc: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  vrCapacityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  vrCapacity: { fontSize: 12, color: '#666', marginLeft: 2 },
  vrPrice: { fontSize: 18, fontWeight: 'bold', color: COLORS.textTitle },

  optionsRow2: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5, marginTop: 10, marginBottom: 15 },
  optionBtn2: { flex: 0.48, flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 10 },
  optionText2: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#000', marginLeft: 8 },
  optionDivider2: { width: 1 },

  finalBookBtn: { backgroundColor: '#FBC02D', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 5 },

  activeRideSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F7F8FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  activeOtpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151'
  },
  activeOtpCode: {
    fontSize: 32,
    fontWeight: '900',
    color: '#11704B',
    letterSpacing: 4
  },
  activeDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 15
  },
  driverProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10
  },
  driverPic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6'
  },
  driverInfo: {
    flex: 1,
    marginLeft: 15
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827'
  },
  vehicleName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  callBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#11704B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5
  },
  skeletonCard: { backgroundColor: '#fff', borderColor: '#f0f0f0' },
  skeletonImage: { width: '100%', height: 70, backgroundColor: '#E5E7EB' },
  skeletonText: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 4, marginHorizontal: 8, marginTop: 8, marginBottom: 2 }
});

export default HomeScreen;
