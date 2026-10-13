import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Animated, Image, Linking, Platform, SafeAreaView, TextInput, ScrollView, Dimensions, PanResponder, AppState, Modal, DeviceEventEmitter } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Map, Camera, GeoJSONSource, Layer, Marker } from '@maplibre/maplibre-react-native';
import { promptForEnableLocationIfNeeded, isLocationEnabled as checkDeviceLocationEnabled } from 'react-native-android-location-enabler';
import {
  Bell, Radio, MapPin, MapPinOff, ChevronRight, Zap, Menu, Phone,
  CarFront, Bike, CarTaxiFront, Wallet, Clock, BarChart2, Home, Settings, X, Check, User, Info, Navigation, Maximize, Minimize
} from 'lucide-react-native';
import DriverSidebarModal from '../../components/DriverSidebarModal';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';

import { SOCKET_URL } from '../../config/env';
import api from '../../services/api';
import { BackgroundLocation, NativeLocationData } from '../../services/BackgroundLocation';


const SwipeToComplete = ({ onComplete }: { onComplete: () => void }) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [completed, setCompleted] = useState(false);

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const MAX_X = SCREEN_WIDTH - 105; // screen width - padding(50) - button width(55)

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gesture) => {
        // Prevent swiping left of starting point
        if (gesture.dx >= 0 && gesture.dx <= MAX_X) {
          Animated.event([null, { dx: pan.x }], { useNativeDriver: false })(e, gesture);
        }
      },
      onPanResponderRelease: (e, gesture) => {
        if (gesture.dx > MAX_X * 0.6) { // 60% threshold to complete
          Animated.spring(pan, { toValue: { x: MAX_X, y: 0 }, useNativeDriver: false }).start();
          if (!completed) {
            setCompleted(true);
            onComplete();
          }
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      }
    })
  ).current;

  const fillWidth = pan.x.interpolate({
    inputRange: [0, MAX_X],
    outputRange: [55, MAX_X + 55],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width: '100%', height: 55, backgroundColor: '#E2E8F0', borderRadius: 30, justifyContent: 'center', overflow: 'hidden', marginTop: 10 }}>
      {/* Dynamic Background Fill */}
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fillWidth, backgroundColor: '#FFD700', borderRadius: 30, zIndex: 0 }} />

      <Text style={{ position: 'absolute', alignSelf: 'center', color: '#64748b', fontWeight: 'bold', fontSize: 16, zIndex: 1 }}>
        {completed ? 'Completed' : 'Swipe to Complete ➔'}
      </Text>

      <Animated.View
        {...panResponder.panHandlers}
        style={[pan.getLayout(), { width: 55, height: 55, backgroundColor: '#FFD700', borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, zIndex: 2 }]}
      >
        <ChevronRight color="#000" size={30} />
      </Animated.View>
    </View>
  );
};

// Fetch Driver Rides
const DriverRidesScreen = () => {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/rides/driver');
      const data = response.data;
      if (data.success) {
        setRides(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRideItem = ({ item }: { item: any }) => (
    <View style={styles.rideCard}>
      <Text style={styles.rideDate}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}</Text>
      <View style={styles.rideRoute}>
        <Text numberOfLines={1} style={styles.rideAddress}>🟢 {item.pickup_address}</Text>
        <Text numberOfLines={1} style={styles.rideAddress}>🔴 {item.drop_address}</Text>
      </View>
      <View style={styles.rideFooter}>
        <Text style={styles.rideStatus}>{item.status}</Text>
        <Text style={styles.rideFare}>₹{item.estimated_fare}</Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <View style={[styles.header, { paddingBottom: 20 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Rides History</Text>
        </View>
      </View>
      <View style={[styles.ridesContainer, { paddingTop: 20 }]}>

        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : rides.length === 0 ? (
          <Text style={styles.loadingText}>No Past Rides</Text>
        ) : (
          <View style={{ flex: 1, width: '100%' }}>
            {rides.map((item, index) => (
              <React.Fragment key={index}>
                {renderRideItem({ item })}
              </React.Fragment>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};



const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const [isOnline, setIsOnline] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const isCheckingPermissionsRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'Home' | 'Rides' | 'Settings'>('Home');
  const [incomingRide, setIncomingRide] = useState<any>(null); // For ride request popup
  const incomingRideRef = useRef<any>(null); // Ref to access inside socket callbacks
  const rideTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [activeRide, setActiveRide] = useState<any>(null); // The accepted ride
  const [rideStatus, setRideStatus] = useState<'IDLE' | 'ACCEPTED' | 'ARRIVED' | 'STARTED'>('IDLE');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [routeGeometry, setRouteGeometry] = useState<any | null>(null);
  const [stats, setStats] = useState({ todayRides: 0, todayEarnings: 0, onlineTime: '0h 0m' });
  const [rideTimer, setRideTimer] = useState<number>(15);
  const [showRequestMap, setShowRequestMap] = useState<boolean>(false);
  
  const [requestRouteGeometry, setRequestRouteGeometry] = useState<any>(null);
  const [isFullMap, setIsFullMap] = useState<boolean>(false);
  const [showPaymentScreen, setShowPaymentScreen] = useState<boolean>(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState<boolean>(true);
  const [isMapActive, setIsMapActive] = useState<boolean>(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  // Two-Way Trip Waiting State
  const [tripStage, setTripStage] = useState<'OUTWARD' | 'WAITING' | 'RETURN'>('OUTWARD');
  const [waitingElapsedSeconds, setWaitingElapsedSeconds] = useState<number>(0);
  const [waitingCharge, setWaitingCharge] = useState<number>(0);
  const [waitingSettings, setWaitingSettings] = useState<{ freeMinutes: number, ratePerMin: number, maxCharge: number, enabled: boolean }>({ freeMinutes: 0, ratePerMin: 0, maxCharge: 0, enabled: true });
  const waitingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  useEffect(() => {
    return () => {
      if (rideTimerIntervalRef.current) {
        clearInterval(rideTimerIntervalRef.current);
      }
    };
  }, []);

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

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        checkLocationStatus();
        // If driver is currently marked online, verify that required permissions were not revoked in Android settings
        const validation = await BackgroundLocation.validateDriverOnlineRequirements();
        if (!validation.canGoOnline) {
          setIsOnline(currentOnline => {
            if (currentOnline) {
              console.warn('[Online] Required permission was revoked while online! Transitioning to offline.');
              Alert.alert(
                'Permission Revoked',
                'Location permission was disabled. Eagle Fly Driver has paused your online status.',
                [
                  { text: 'OK' },
                  { text: 'Open Settings', onPress: () => navigation.navigate('DriverPermissions') }
                ]
              );
              stopLocationUpdates();
              if (socketRef.current) {
                socketRef.current.emit('driver:offline');
                socketRef.current.disconnect();
                socketRef.current = null;
              }
              import('react-native').then(({ DeviceEventEmitter }) => {
                DeviceEventEmitter.emit('onlineStatusChanged', false);
              });
              return false;
            }
            return currentOnline;
          });
        }
      }
    });

    // Listen for toggle requests from Orders tab
    const l1 = DeviceEventEmitter.addListener('toggleOnlineRequest', (value: boolean) => {
      handleToggleOnline(value);
    });
    // Allow other tabs to query initial state
    const l2 = DeviceEventEmitter.addListener('queryOnlineStatus', () => {
      // Send current state back
      setIsOnline(current => {
        DeviceEventEmitter.emit('onlineStatusChanged', current);
        return current;
      });
    });
    const l5 = DeviceEventEmitter.addListener('queryPendingOrders', () => {
      if (incomingRideRef.current) {
        DeviceEventEmitter.emit('newRideRequest', incomingRideRef.current);
      }
    });
    // View specific ride request
    const l3 = DeviceEventEmitter.addListener('viewRideRequest', (data) => {
      setIncomingRide(data);
      incomingRideRef.current = data;
      
      // Start countdown safely
      if (rideTimerIntervalRef.current) {
        clearInterval(rideTimerIntervalRef.current);
      }
      let currentTimer = 15;
      setRideTimer(currentTimer);
      rideTimerIntervalRef.current = setInterval(() => {
        currentTimer -= 1;
        setRideTimer(currentTimer);
        if (currentTimer <= 0) {
          if (rideTimerIntervalRef.current) clearInterval(rideTimerIntervalRef.current);
          
          setIncomingRide(null);
          incomingRideRef.current = null;
          DeviceEventEmitter.emit('removeRideRequest', data.rideId);
        }
      }, 1000);
    });

    const l4 = DeviceEventEmitter.addListener('acceptSpecificRide', (data) => {
      setIncomingRide(data);
      incomingRideRef.current = data;
      if (socketRef.current) {
        socketRef.current.emit('ride:accept', { rideId: data.rideId });
        DeviceEventEmitter.emit('removeRideRequest', data.rideId);
      }
      
      navigation.navigate('HomeTab');

      // Immediately trigger active ride flow
      setActiveRide(data);
      activeRideRef.current = data;
      setRideStatus('ACCEPTED');
      if (data.pickup) fetchRoute(data.pickup);
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
      l1.remove();
      l2.remove();
      l3.remove();
      l4.remove();
      l5.remove();
    };
  }, []);

  // Fetch initial location on load with immediate cached fallback and fast acquisition
  useEffect(() => {
    // 1. Immediately read last saved location from AsyncStorage so map displays instantly without waiting
    AsyncStorage.getItem('driverLastLocation').then((cached) => {
      if (cached && currentLatRef.current === null) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.latitude && parsed.longitude) {
            setCurrentLat(parsed.latitude);
            setCurrentLng(parsed.longitude);
            currentLatRef.current = parsed.latitude;
            currentLngRef.current = parsed.longitude;
          }
        } catch (e) {}
      }
    });

    const setLoc = (pos: any) => {
      if (pos?.coords?.latitude && pos?.coords?.longitude) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        currentLatRef.current = lat;
        currentLngRef.current = lng;
        AsyncStorage.setItem('driverLastLocation', JSON.stringify({ latitude: lat, longitude: lng })).catch(() => {});
      }
    };

    const fetchInitialLoc = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Eagle Driver needs access to your location.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission denied.');
          return;
        }
      }

      // Try quick position with maximumAge allowing cached GPS fixes first
      Geolocation.getCurrentPosition(
        setLoc,
        () => {
          // Fallback to network / low accuracy if GPS fix is delayed indoors
          Geolocation.getCurrentPosition(
            setLoc,
            (err) => console.log('Init GPS Error:', err),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 15000 }
      );
    };

    fetchInitialLoc();
    const intervalId = setInterval(() => {
      if (currentLatRef.current === null) {
        fetchInitialLoc();
      } else {
        clearInterval(intervalId);
      }
    }, 2500);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Fetch route when incoming ride arrives
  useEffect(() => {
    if (incomingRide?.pickup && incomingRide?.drop) {
      const getRoute = async () => {
        try {
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${incomingRide.pickup.longitude},${incomingRide.pickup.latitude};${incomingRide.drop.longitude},${incomingRide.drop.latitude}?overview=full&geometries=geojson`);
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            setRequestRouteGeometry(data.routes[0].geometry);
          }
        } catch (error) {
          console.warn('Failed to fetch request route', error);
        }
      };
      getRoute();
    } else {
      setRequestRouteGeometry(null);
    }
  }, [incomingRide]);

  const socketRef = useRef<Socket | null>(null);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgLocationSubRef = useRef<{ remove: () => void } | null>(null);

  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const currentLatRef = useRef<number | null>(null);
  const currentLngRef = useRef<number | null>(null);
  const activeRideRef = useRef<any>(null);

  const [currentHeading, setCurrentHeading] = useState(0);
  const currentHeadingRef = useRef(0);
  const lastValidLocationRef = useRef<{latitude: number, longitude: number, timestamp: number} | null>(null);
  const lastRouteFetchLocationRef = useRef<{latitude: number, longitude: number} | null>(null);
  const currentRouteGeometryRef = useRef<any | null>(null);
  const lastRouteRecalculationTimeRef = useRef<number>(0);
  const isRouteFetchingRef = useRef<boolean>(false);

  const calculateBearing = (startLat: number, startLng: number, destLat: number, destLng: number) => {
    const toRad = (val: number) => (val * Math.PI) / 180;
    const toDeg = (val: number) => (val * 180) / Math.PI;
    const dLon = toRad(destLng - startLng);
    const y = Math.sin(dLon) * Math.cos(toRad(destLat));
    const x = Math.cos(toRad(startLat)) * Math.sin(toRad(destLat)) -
              Math.sin(toRad(startLat)) * Math.cos(toRad(destLat)) * Math.cos(dLon);
    let brng = toDeg(Math.atan2(y, x));
    return (brng + 360) % 360;
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const toRad = (val: number) => (val * Math.PI) / 180;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = toRad(lat2-lat1);
    const deltaLambda = toRad(lon2-lon1);
    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
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

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Sync activeRide with ref
  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  // Ride Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (incomingRide) {
      setRideTimer(15);
      setShowRequestMap(false);
      // timer = setInterval(() => {
      //   setRideTimer((prev) => {
      //     if (prev <= 1) {
      //       clearInterval(timer);
      //       handleIgnoreRide();
      //       return 0;
      //     }
      //     return prev - 1;
      //   });
      // }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [incomingRide]);

  const [vehicleCategory, setVehicleCategory] = useState<string>('car');

  useEffect(() => {
    fetchStats();
    
    // Auto-hydrate active ride and fetch vehicle category
    const hydrateOnMount = async () => {
      try {
        const userStr = await AsyncStorage.getItem('driverUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.vehicle_category) {
            setVehicleCategory(user.vehicle_category.toLowerCase());
          }
        }

        const token = await AsyncStorage.getItem('driverToken');
        if (!token) return;
        const res = await api.get('/api/rides/current');
        const data = res.data;
        if (data.success && data.data?.activeRide) {
          console.log('Found active ride on mount, forcing online state...');
          // Force online to establish socket, location updates, and restore ride UI
          handleToggleOnline(true);
        }
      } catch (err) {
        console.warn('Failed to hydrate on mount:', err);
      }
    };
    hydrateOnMount();

    return () => {
      stopLocationUpdates();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem('driverToken');
      const response = await api.get('/api/driver/stats');
      const data = response.data;
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch stats:', err);
    }
  };

  const handleToggleOnline = async (value: boolean) => {
    // Prevent going offline if there is an active ride
    if (!value && activeRideRef.current) {
      Alert.alert('Action Blocked', 'You cannot go offline while you have an active ride.');
      return;
    }

    if (value) {
      // Prevent duplicate or overlapping toggle taps
      if (isCheckingPermissionsRef.current) {
        console.log('[Online] Already checking permissions. Ignoring duplicate tap.');
        return;
      }
      isCheckingPermissionsRef.current = true;
      setIsCheckingPermissions(true);

      try {
        // Enforce genuine Android runtime permissions check (Fine/Coarse + Background Location)
        const validation = await BackgroundLocation.validateDriverOnlineRequirements();

        if (!validation.canGoOnline) {
          console.warn('[Online] Permission validation failed:', validation.missingPermissions);
          Alert.alert(
            "Required Permissions Missing",
            `Eagle Fly Driver requires ${validation.missingPermissions.join(' and ')} to receive ride requests and track routes.\n\nPlease enable them to go online.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Permissions",
                onPress: () => navigation.navigate("DriverPermissions")
              }
            ]
          );
          setIsOnline(false);
          import('react-native').then(({ DeviceEventEmitter }) => {
            DeviceEventEmitter.emit('onlineStatusChanged', false);
          });
          return;
        }

        const token = await AsyncStorage.getItem('driverToken');
        if (!token) {
          Alert.alert('Authentication Error', 'Driver login session not found. Please log in again.');
          setIsOnline(false);
          import('react-native').then(({ DeviceEventEmitter }) => {
            DeviceEventEmitter.emit('onlineStatusChanged', false);
          });
          return;
        }

        // Clean up previous socket if any
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
        }

        // Start native Foreground Service first and verify startup
        if (Platform.OS === 'android') {
          const serviceStarted = await BackgroundLocation.startService();
          if (!serviceStarted) {
            Alert.alert(
              "Service Startup Failed",
              "Unable to start the background location service. Please ensure location permissions are granted."
            );
            setIsOnline(false);
            import('react-native').then(({ DeviceEventEmitter }) => {
              DeviceEventEmitter.emit('onlineStatusChanged', false);
            });
            return;
          }
        }

        // Now update state to online
        setIsOnline(true);
        import('react-native').then(({ DeviceEventEmitter }) => {
          DeviceEventEmitter.emit('onlineStatusChanged', true);
        });

        const activeRideFetchedRef = { current: false };

        socketRef.current = io(SOCKET_URL, {
          auth: { token },
          query: { token },
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          randomizationFactor: 0.5,
          timeout: 20000,
          transports: ['websocket', 'polling']
        });

        const startWaitingTimer = (data: any) => {
          if (waitingTimerRef.current) clearInterval(waitingTimerRef.current);

          const freeM = Number(data.freeMinutes ?? data.waiting_settings?.freeMinutes ?? 0);
          const rate = Number(data.ratePerMin ?? data.waiting_settings?.ratePerMin ?? 0);
          const max = Number(data.maxCharge ?? data.waiting_settings?.maxCharge ?? 0);
          const enabled = (data.enabled ?? data.waiting_settings?.enabled) !== false;

          setWaitingSettings({
            freeMinutes: freeM,
            ratePerMin: rate,
            maxCharge: max,
            enabled: enabled
          });

          const clientReceivedAt = Date.now();
          const serverTime = data.server_time || clientReceivedAt;
          const serverOffset = clientReceivedAt - serverTime;
          const startMs = typeof data.waiting_started_at === 'number'
            ? data.waiting_started_at
            : new Date(data.waiting_started_at || Date.now()).getTime();

          const updateWaitingTick = () => {
            const currentServerMs = Date.now() - serverOffset;
            const elapsedSecs = Math.max(0, Math.floor((currentServerMs - startMs) / 1000));
            setWaitingElapsedSeconds(elapsedSecs);

            const freeTotalSecs = freeM * 60;
            if (enabled && elapsedSecs > freeTotalSecs) {
              const extraSecs = elapsedSecs - freeTotalSecs;
              const chargeableMins = Math.ceil(extraSecs / 60);
              let chg = chargeableMins * rate;
              if (max > 0 && chg > max) chg = max;
              setWaitingCharge(Math.round(chg));
            } else {
              setWaitingCharge(0);
            }
          };

          updateWaitingTick();
          waitingTimerRef.current = setInterval(updateWaitingTick, 1000);
        };

        const fetchActiveRide = async () => {
          if (activeRideFetchedRef.current) return;
          try {
            activeRideFetchedRef.current = true;
            const response = await api.get('/api/rides/current');
            const data = response.data;
            if (data.success && data.data?.activeRide) {
              const restoredRide = data.data.activeRide;
              setActiveRide(restoredRide);
              activeRideRef.current = restoredRide;
              setRideStatus(restoredRide.status);
              navigation.navigate('HomeTab'); // Ensure we are on the map screen for the active ride
              if (restoredRide.status === 'ACCEPTED' && restoredRide.pickup) {
                fetchRoute(restoredRide.pickup);
              } else if (restoredRide.status === 'STARTED' && restoredRide.drop) {
                fetchRoute(restoredRide.drop);
              }

              if (restoredRide.trip_type === 'TWO_WAY' && restoredRide.trip_stage === 'WAITING' && restoredRide.waiting_started_at) {
                setTripStage('WAITING');
                startWaitingTimer(restoredRide);
              } else if (restoredRide.trip_type === 'TWO_WAY' && restoredRide.trip_stage === 'RETURN') {
                setTripStage('RETURN');
                setWaitingCharge(restoredRide.waiting_charge || 0);
              }
            }
          } catch (err) {
            console.warn('Failed to fetch active ride:', err);
          } finally {
            activeRideFetchedRef.current = false;
          }
        };

        socketRef.current.on('connect', () => {
          console.log('Driver connected to socket:', socketRef.current?.id);
          startLocationUpdates();
          fetchActiveRide();
        });

        socketRef.current.on('connect_error', (error: any) => {
          console.warn('[Socket] Connection error:', error?.message);
          if (error?.message === 'Authentication error' || error?.message?.includes('jwt') || error?.message?.includes('token')) {
            Alert.alert('Authentication Failed', 'Your driver session has expired. Please log in again.');
            setIsOnline(false);
            import('react-native').then(({ DeviceEventEmitter }) => DeviceEventEmitter.emit('onlineStatusChanged', false));
          }
        });

        socketRef.current.io.on('reconnect', (attempt: number) => {
          console.log(`[Socket] Driver reconnected after ${attempt} attempts`);
          fetchActiveRide();
        });

        // Listen for incoming ride requests
        socketRef.current.on('ride:new_request', (data) => {
          console.log('Received new ride request!', data);
          
          // Do not show new request if we already have an active ride
          if (activeRideRef.current) {
            return;
          }
          
          // Do not show duplicate request modal for same ride
          if (incomingRideRef.current && incomingRideRef.current.rideId === data.rideId) {
            return;
          }

          setIncomingRide(data);
          incomingRideRef.current = data;
          
          // Show modal as fallback
          

          // Navigate to Orders Tab directly
          navigation.navigate('OrdersTab');

          if (rideTimerIntervalRef.current) {
            clearInterval(rideTimerIntervalRef.current);
          }

          let currentTimer = 15;
          setRideTimer(currentTimer);
          rideTimerIntervalRef.current = setInterval(() => {
            currentTimer -= 1;
            setRideTimer(currentTimer);
            if (currentTimer <= 0) {
              if (rideTimerIntervalRef.current) clearInterval(rideTimerIntervalRef.current);
              
              setIncomingRide(null);
              incomingRideRef.current = null;
              import('react-native').then(({ DeviceEventEmitter }) => {
                DeviceEventEmitter.emit('removeRideRequest', data.rideId);
              });
            }
          }, 1000);

          import('react-native').then(({ DeviceEventEmitter }) => {
            // Slight delay to ensure DriverOrdersScreen is mounted
            setTimeout(() => {
              DeviceEventEmitter.emit('newRideRequest', data);
            }, 100);
          });
        });

        socketRef.current.on('ride:confirmed', (data) => {
          Alert.alert('Ride Confirmed!', 'You have successfully accepted the ride. Follow the map to the pickup location.');
          const currentIncomingRide = incomingRideRef.current;
          if (currentIncomingRide) {
            const mergedRide = { ...currentIncomingRide, ...data };
            setActiveRide(mergedRide);
            activeRideRef.current = mergedRide;
            setRideStatus('ACCEPTED');
            fetchRoute(mergedRide.pickup);
          }
          setIncomingRide(null);
          incomingRideRef.current = null;
        });

        socketRef.current.on('ride:arrived_success', (data) => {
          setRideStatus('ARRIVED');
          if (activeRideRef.current) {
            const updatedRide = { ...activeRideRef.current, ...data };
            setActiveRide(updatedRide);
            activeRideRef.current = updatedRide;
          }
        });

        socketRef.current.on('ride:started', (data) => {
          Alert.alert('Trip Started!', 'Follow the map to the Drop Location.');
          setRideStatus('STARTED');
          setShowOtpModal(false);
          // Merging new data (e.g. recipient_phone) into activeRide
          const currentRide = activeRideRef.current || {};
          const updatedRide = { ...currentRide, ...data, status: 'STARTED' };
          setActiveRide(updatedRide);
          activeRideRef.current = updatedRide;
          setRouteGeometry(null);
          currentRouteGeometryRef.current = null;
          
          const dropCoord = updatedRide.drop || currentRide.drop;
          if (dropCoord?.latitude && dropCoord?.longitude) {
            fetchRoute(dropCoord);
          }
          setOtpInput(''); // Reset OTP input
        });

        socketRef.current.on('ride:otp_failed', (data) => {
          Alert.alert('Invalid OTP', data.message);
        });

        socketRef.current.on('ride:intermediate_arrived', (data) => {
          Alert.alert('Reached Destination', 'Two-Way: Drop location reached. Waiting timer has started.');
          setTripStage('WAITING');
          startWaitingTimer(data);

          // Update activeRide with swapped pickup/drop
          if (activeRideRef.current) {
            const updated = {
              ...activeRideRef.current,
              pickup: data.pickup,
              drop: data.drop,
              trip_stage: 'WAITING',
              waiting_started_at: data.waiting_started_at,
              waiting_settings: {
                freeMinutes: data.freeMinutes || 0,
                ratePerMin: data.ratePerMin || 0,
                maxCharge: data.maxCharge || 0,
                enabled: data.enabled !== false
              }
            };
            setActiveRide(updated);
            activeRideRef.current = updated;
          }
        });

        socketRef.current.on('ride:return_started', (data) => {
          Alert.alert('Return Trip Started', 'Navigating back to the original pickup location!');
          if (waitingTimerRef.current) {
            clearInterval(waitingTimerRef.current);
            waitingTimerRef.current = null;
          }
          setTripStage('RETURN');
          setWaitingCharge(data.waiting_charge || 0);

          if (activeRideRef.current) {
            const updated = {
              ...activeRideRef.current,
              pickup: data.pickup,
              drop: data.drop,
              trip_stage: 'RETURN',
              waiting_charge: data.waiting_charge
            };
            setActiveRide(updated);
            activeRideRef.current = updated;
          }

          // Fetch route to the new drop (which is the original pickup)
          setRouteGeometry(null);
          currentRouteGeometryRef.current = null;
          if (data.drop?.latitude && data.drop?.longitude) {
            fetchRoute(data.drop);
          }
        });

        socketRef.current.on('ride:completed', (data) => {
          Alert.alert('Trip Completed!', 'You have successfully dropped off the user.');
          if (waitingTimerRef.current) {
            clearInterval(waitingTimerRef.current);
            waitingTimerRef.current = null;
          }
          setTripStage('OUTWARD');
          setWaitingElapsedSeconds(0);
          setWaitingCharge(0);
          setRideStatus('IDLE');
          setActiveRide(null);
          setRouteGeometry(null);
          currentRouteGeometryRef.current = null;
          activeRideRef.current = null;
          fetchStats(); // refresh stats after trip
          // Driver stays online and available for new rides
        });

        socketRef.current.on('ride:cancelled', (data) => {
          let alertMsg = data.message || 'This ride was cancelled.';
          Alert.alert('Ride Cancelled', alertMsg);
          setIncomingRide(null);
          incomingRideRef.current = null;
          setRideStatus('IDLE');
          setActiveRide(null);
          setRouteGeometry(null);
          currentRouteGeometryRef.current = null;
          activeRideRef.current = null;
          setShowOtpModal(false);

          // Clear from Orders list immediately
          if (data.rideId) {
            DeviceEventEmitter.emit('removeRideRequest', data.rideId);
          }
        });

        socketRef.current.on('ride:accepted_by_other', (data) => {
          if (incomingRideRef.current?.rideId === data.rideId) {
            setIncomingRide(null);
            incomingRideRef.current = null;
          }
          if (data.rideId) {
            DeviceEventEmitter.emit('removeRideRequest', data.rideId);
          }
        });

        socketRef.current.on('ride:already_accepted', (data) => {
          Alert.alert('Ride Unavailable', data.message || 'This ride was accepted by another driver.');
          if (incomingRideRef.current?.rideId === data.rideId) {
            setIncomingRide(null);
            incomingRideRef.current = null;
          }
          if (data.rideId) {
            import('react-native').then(({ DeviceEventEmitter }) => DeviceEventEmitter.emit('removeRideRequest', data.rideId));
          }
        });

        socketRef.current.on('driver:ride_accept_rejected', (data) => {
          Alert.alert('Action Rejected', data.message || 'Could not accept this ride.');
          
          if (incomingRideRef.current?.rideId === data.rideId) {
            setIncomingRide(null);
            incomingRideRef.current = null;
          }
          
          if (activeRideRef.current?.rideId === data.rideId) {
            setActiveRide(null);
            activeRideRef.current = null;
            setRideStatus('IDLE');
          }
          
          if (data.rideId) {
            import('react-native').then(({ DeviceEventEmitter }) => DeviceEventEmitter.emit('removeRideRequest', data.rideId));
          }
        });

      } catch (error) {
        console.error('Error starting online status:', error);
        setIsOnline(false);
        import('react-native').then(({ DeviceEventEmitter }) => {
          DeviceEventEmitter.emit('onlineStatusChanged', false);
        });
      } finally {
        isCheckingPermissionsRef.current = false;
        setIsCheckingPermissions(false);
      }
    } else {
      setIsOnline(false);
      import('react-native').then(({ DeviceEventEmitter }) => {
        DeviceEventEmitter.emit('onlineStatusChanged', false);
      });
      stopLocationUpdates();
      if (socketRef.current) {
        socketRef.current.emit('driver:offline');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  };

  const startLocationUpdates = async () => {
    // 1. Clean up any existing subscriptions
    if (bgLocationSubRef.current) {
      bgLocationSubRef.current.remove();
      bgLocationSubRef.current = null;
    }
    if (locationInterval.current) {
      Geolocation.clearWatch(locationInterval.current);
      locationInterval.current = null;
    }

    const processLocationUpdate = (
      latitude: number,
      longitude: number,
      speed: number | null,
      rawHeading: number | null,
      timestamp: number
    ) => {
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        return;
      }

      let newHeading = currentHeadingRef.current;
      if (rawHeading !== null && rawHeading >= 0) {
        newHeading = rawHeading;
      } else if (lastValidLocationRef.current) {
        const dist = getDistance(lastValidLocationRef.current.latitude, lastValidLocationRef.current.longitude, latitude, longitude);
        if (dist > 5 && speed !== null && speed > 0.5) {
          newHeading = calculateBearing(lastValidLocationRef.current.latitude, lastValidLocationRef.current.longitude, latitude, longitude);
        }
      }

      // Shortest path interpolation for smooth map camera heading
      const diff = ((newHeading - currentHeadingRef.current + 540) % 360) - 180;
      const targetHeading = currentHeadingRef.current + diff;

      setCurrentHeading(targetHeading);
      currentHeadingRef.current = targetHeading;

      lastValidLocationRef.current = { latitude, longitude, timestamp };

      setCurrentLat(latitude);
      setCurrentLng(longitude);
      currentLatRef.current = latitude;
      currentLngRef.current = longitude;
      AsyncStorage.setItem('driverLastLocation', JSON.stringify({ latitude, longitude })).catch(() => {});

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('driver:location', {
          latitude,
          longitude,
          heading: targetHeading,
          speed: speed || 20
        });
      }

      // Check if route needs recalculation
      if (activeRideRef.current) {
        const dest = activeRideRef.current.status === 'STARTED' ? activeRideRef.current.drop : activeRideRef.current.pickup;
        if (dest) {
          if (currentRouteGeometryRef.current) {
            const distToRoute = getDistanceToRoute(latitude, longitude, currentRouteGeometryRef.current);
            if (distToRoute > 100) {
              const now = Date.now();
              if (now - lastRouteRecalculationTimeRef.current > 30000 && !isRouteFetchingRef.current) {
                fetchRoute(dest);
              }
            }
          } else {
            fetchRoute(dest);
          }
        }
      }
    };

    if (Platform.OS === 'android') {
      try {
        const fineGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (!fineGranted) {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }

        const started = await BackgroundLocation.startService();
        console.log('[GPS] Native Foreground Service started:', started);

        bgLocationSubRef.current = BackgroundLocation.onLocationUpdate((loc: NativeLocationData) => {
          processLocationUpdate(loc.latitude, loc.longitude, loc.speed, loc.heading, loc.timestamp);
        });
      } catch (err) {
        console.error('[GPS] Failed to start native background service:', err);
      }
    } else {
      locationInterval.current = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, heading } = position.coords;
          processLocationUpdate(latitude, longitude, speed, heading, position.timestamp);
        },
        (error) => {
          console.log('[GPS] Error:', error.code, error.message);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 2,
          interval: 3000,
          fastestInterval: 2000
        }
      );
    }
  };

  const stopLocationUpdates = async () => {
    if (bgLocationSubRef.current) {
      bgLocationSubRef.current.remove();
      bgLocationSubRef.current = null;
    }
    if (Platform.OS === 'android') {
      try {
        await BackgroundLocation.stopService();
      } catch (e) {
        console.warn('Error stopping native service:', e);
      }
    }
    if (locationInterval.current) {
      Geolocation.clearWatch(locationInterval.current);
      locationInterval.current = null;
    }
    console.log('[GPS] Foreground service and location watcher stopped.');
  };

  const fetchRoute = async (targetDest: { latitude: number, longitude: number }) => {
    if (!targetDest || typeof targetDest.latitude !== 'number' || typeof targetDest.longitude !== 'number') {
      console.warn('fetchRoute aborted: invalid targetDest', targetDest);
      return;
    }

    const startLat = currentLatRef.current;
    const startLng = currentLngRef.current;
    if (startLat === null || startLng === null) {
      console.warn('fetchRoute: Current location not ready, will retry on next GPS tick');
      return;
    }

    if (isRouteFetchingRef.current) return;
    
    lastRouteFetchLocationRef.current = { latitude: startLat, longitude: startLng };
    isRouteFetchingRef.current = true;
    lastRouteRecalculationTimeRef.current = Date.now();
    
    try {
      // 1. Try Backend Route API
      const response = await api.post('/api/maps/route', {
        pickup: { latitude: startLat, longitude: startLng },
        drop: { latitude: Number(targetDest.latitude), longitude: Number(targetDest.longitude) }
      });
      const data = response.data;
      if (data?.success && data.route?.geometry?.coordinates?.length) {
        setRouteGeometry(data.route.geometry);
        currentRouteGeometryRef.current = data.route.geometry;
        return;
      }
      throw new Error('Backend route empty or failed');
    } catch (err) {
      console.warn('Backend route failed, trying OSRM fallback:', err);
      // 2. Direct OSRM Fallback so driver route is NEVER blank
      try {
        const osrmRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${targetDest.longitude},${targetDest.latitude}?overview=full&geometries=geojson`
        );
        const osrmData = await osrmRes.json();
        if (osrmData?.routes && osrmData.routes.length > 0) {
          const geom = osrmData.routes[0].geometry;
          setRouteGeometry(geom);
          currentRouteGeometryRef.current = geom;
        }
      } catch (fallbackErr) {
        console.warn('OSRM fallback also failed:', fallbackErr);
      }
    } finally {
      isRouteFetchingRef.current = false;
    }
  };

  const renderHomeContent = () => (
    <View style={{ flex: 1 }}>
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerDecoration} />
        <View style={styles.headerContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setIsSidebarVisible(true)} style={{ padding: 8, marginRight: 8, backgroundColor: '#f8fafc', borderRadius: 20 }}>
              <Menu size={24} color="#0f172a" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Eagle Driver</Text>
              <Text style={styles.headerSubtitle}>Drive • Earn • Grow</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Bell size={22} color="#0f172a" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Status Pill Card (Inside Header) */}
        <View style={styles.statusPillCard}>
          <Text style={styles.statusPillText}>
            {isCheckingPermissions
              ? 'Verifying permissions...'
              : `You are ${isOnline ? 'Online' : 'Offline'}`}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            disabled={isCheckingPermissions}
            trackColor={{ false: '#d1d5db', true: '#a7f3d0' }}
            thumbColor={isOnline ? '#059669' : '#f8fafc'}
            style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
          />
        </View>
      </View>

      <View style={styles.mainContentWrapper}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} scrollEnabled={!isMapActive}>



          {/* Map Card */}

          <View
            style={styles.mapContainer}
            onTouchStart={() => setIsMapActive(true)}
            onTouchEnd={() => setIsMapActive(false)}
            onTouchCancel={() => setIsMapActive(false)}
          >
            {currentLat !== null && currentLng !== null ? (
              <Map
                style={styles.map}
                mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              >
                <Camera
                  initialViewState={{
                    zoom: 14,
                  }}
                  bearing={currentHeading}
                  center={[currentLng, currentLat]}
                  duration={2000}
                  easing="ease"
                />

                <Marker id="driverMarkerHome" lngLat={[currentLng, currentLat]}>
                  <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: `${currentHeading}deg` }] }}>
                    <Image 
                      source={
                        vehicleCategory === 'auto' ? require('../../assets/images/auto-5.png') :
                        vehicleCategory === 'bike' ? require('../../assets/images/bike.png') :
                        require('../../assets/images/car.png')
                      } 
                      style={{ width: 28, height: 28, resizeMode: 'contain' }}
                    />
                  </View>
                </Marker>
                {/* Active Ride Route */}
                {routeGeometry && (
                  <GeoJSONSource id="routeSource" data={{ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: routeGeometry, properties: {} }] }}>
                    <Layer
                      id="routeFill"
                      type="line"
                      style={{
                        lineColor: rideStatus === 'STARTED' ? '#1E88E5' : '#11704B', // Blue for trip, Green for pickup
                        lineWidth: 5,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                  </GeoJSONSource>
                )}

                {/* Active Ride Destination Marker */}
                {activeRide && (
                  <GeoJSONSource id="destSrc" data={({
                    type: 'FeatureCollection',
                    features: [{
                      type: 'Feature',
                      geometry: { type: 'Point', coordinates: rideStatus === 'STARTED' ? [activeRide.drop.longitude, activeRide.drop.latitude] : [activeRide.pickup.longitude, activeRide.pickup.latitude] },
                      properties: {}
                    }]
                  }) as any}>
                    <Layer id="destCircle" type="circle" style={{ circleRadius: 10, circleColor: rideStatus === 'STARTED' ? '#E53935' : '#11704B', circleStrokeWidth: 3, circleStrokeColor: '#ffffff' }} />
                  </GeoJSONSource>
                )}
              </Map>
            ) : (
              <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#64748b' }}>Locating you...</Text>
              </View>
            )}
          </View>

          {/* Earnings & Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statsHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.zapIconWrapper2, isOnline && { backgroundColor: '#dcfce7' }]}>
                  <Zap size={20} color={isOnline ? "#059669" : "#64748b"} fill={isOnline ? "#059669" : "#64748b"} />
                </View>
                <Text style={styles.statsMainText2}>You're {isOnline ? 'Online' : 'Offline'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.offlineBtn2, isOnline && { backgroundColor: '#fee2e2' }]}
                onPress={() => handleToggleOnline(!isOnline)}
              >
                <Zap size={16} color={isOnline ? "#dc2626" : "#059669"} />
                <Text style={[styles.offlineBtnText2, isOnline && { color: '#dc2626' }]}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsColumns}>
              <View style={styles.statCol}>
                <CarFront size={24} color="#059669" />
                <Text style={styles.statValue}>{stats.todayRides}</Text>
                <Text style={styles.statLabel}>Today's Rides</Text>
              </View>
              <View style={styles.statCol}>
                <Wallet size={24} color="#059669" />
                <Text style={styles.statValue}>₹{stats.todayEarnings}</Text>
                <Text style={styles.statLabel}>Today's Earnings</Text>
              </View>
              <View style={styles.statCol}>
                <Clock size={24} color="#059669" />
                <Text style={styles.statValue}>{stats.onlineTime}</Text>
                <Text style={styles.statLabel}>Online Time</Text>
              </View>
            </View>
          </View>

          {/* Tips Card */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsIconWrapper}>
              <BarChart2 size={24} color="#11704B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.tipsTitle}>More Rides, Higher Earnings!</Text>
              <Text style={styles.tipsDesc}>Stay in busy areas to get more ride requests.</Text>
            </View>
          </View>

          {/* Active Ride Controls */}
        </ScrollView>
      </View>
    </View>
  );

  const handleAcceptRide = () => {
    if (rideTimerIntervalRef.current) {
      clearInterval(rideTimerIntervalRef.current);
    }
    if (socketRef.current && incomingRide) {
      socketRef.current.emit('ride:accept', { rideId: incomingRide.rideId });
      import('react-native').then(({ DeviceEventEmitter }) => DeviceEventEmitter.emit('removeRideRequest', incomingRide.rideId));

      // Immediately trigger active ride flow
      setActiveRide(incomingRide);
      activeRideRef.current = incomingRide;
      setRideStatus('ACCEPTED');
      if (incomingRide.pickup) fetchRoute(incomingRide.pickup);
    }
    
    navigation.navigate('HomeTab'); // Ensure this matches your bottom tab route name
  };

  const handleIgnoreRide = () => {
    if (rideTimerIntervalRef.current) {
      clearInterval(rideTimerIntervalRef.current);
    }
    if (incomingRide) {
      if (socketRef.current) socketRef.current.emit('ride:reject', { rideId: incomingRide.rideId });
      import('react-native').then(({ DeviceEventEmitter }) => DeviceEventEmitter.emit('removeRideRequest', incomingRide.rideId));
    }
    setIncomingRide(null);
    incomingRideRef.current = null;
    
  };

  const handleCancelRide = () => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: () => {
          if (socketRef.current && activeRide) {
            socketRef.current.emit('ride:cancel', { rideId: activeRide.rideId });
          }
          setRideStatus('IDLE');
          setActiveRide(null);
          setRouteGeometry(null);
          currentRouteGeometryRef.current = null;
          activeRideRef.current = null;
        }
      }
    ]);
  };

  const handleVerifyOtp = () => {
    if (!otpInput || otpInput.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter a 4-digit OTP.');
      return;
    }
    if (socketRef.current && activeRide) {
      socketRef.current.emit('ride:verify_otp', {
        rideId: activeRide.rideId,
        otp: otpInput
      });
    }
  };

  const handleArrived = () => {
    if (socketRef.current && activeRide) {
      socketRef.current.emit('ride:arrived', {
        rideId: activeRide.rideId
      });
    }
  };

  const handleConfirmPayment = (method: string) => {
    if (socketRef.current && activeRide) {
      const finalFare = calculateFinalFare();
      socketRef.current.emit('ride:complete', {
        rideId: activeRide.rideId,
        finalFare,
        paymentMethod: method
      });
      setShowPaymentScreen(false);
      setRideStatus('IDLE');
      setActiveRide(null);
      setRouteGeometry(null);
      currentRouteGeometryRef.current = null;
      activeRideRef.current = null;
    }
  };

  const calculateFinalFare = () => {
    if (!activeRide) return 0;
    return (Number(activeRide.estimated_fare) || 0) + (Number(activeRide.tip) || 0) + (Number(waitingCharge) || 0);
  };

    const renderActiveTrip = () => {
    if (!activeRide) return null;

    if (showPaymentScreen) {
      const finalFare = calculateFinalFare();
      const baseFare = activeRide.estimated_fare || 0;
      const tips = Number(activeRide.tip) || 0;

      const vehicleName = activeRide.vehicle_name || 'Ride';
      const distance = activeRide.distance || '0';
      const duration = activeRide.duration || '0';
      const passengers = activeRide.passengers || '1';

      let imgSrc: any = { uri: 'https://cdn-icons-png.flaticon.com/512/741/741407.png' };
      if (vehicleName.toLowerCase().includes('bike')) {
        imgSrc = { uri: 'https://cdn-icons-png.flaticon.com/512/3721/3721619.png' };
      } else if (vehicleName.toLowerCase().includes('auto')) {
        imgSrc = require('../../assets/images/auto.png');
      }

      return (
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 25, paddingTop: 60 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Check size={50} color="#059669" />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 }}>Ride Completed</Text>
            <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 30, textAlign: 'center', paddingHorizontal: 20 }}>
              Please collect the payment from the customer to complete this trip.
            </Text>
          </View>

          {/* Ride Summary Card */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 20, marginBottom: 30, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }}>
            {/* Top Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                <Image source={imgSrc} style={{ width: 30, height: 30 }} resizeMode="contain" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 }}>{vehicleName}</Text>
                <Text style={{ fontSize: 13, color: '#94a3b8' }}>{distance} km • {duration} mins • {passengers} Passenger{Number(passengers) > 1 ? 's' : ''}</Text>
              </View>
            </View>

            {/* Middle Rows */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 14, color: '#64748b' }}>Base Fare</Text>
              <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: '500' }}>₹{baseFare}</Text>
            </View>
            {waitingCharge > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, color: '#64748b' }}>Waiting Charge</Text>
                <Text style={{ fontSize: 14, color: '#dc2626', fontWeight: '600' }}>+ ₹{waitingCharge}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: '#64748b' }}>Tips (Customer)</Text>
              <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: '500' }}>₹{tips}</Text>
            </View>

            {/* Bottom Total */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 15, borderRadius: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0f172a' }}>Total Amount to Collect</Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#059669' }}>₹{finalFare}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 }}>Select Payment Method</Text>

          {/* Cash Button */}
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#dcfce7' }} onPress={() => handleConfirmPayment('CASH')}>
            <View style={{ marginRight: 15 }}>
              <Wallet size={24} color="#059669" />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>Collected Cash</Text>
            <ChevronRight size={20} color="#0f172a" />
          </TouchableOpacity>

          {/* UPI Button */}
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f9ff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e0f2fe' }} onPress={() => handleConfirmPayment('UPI')}>
            <View style={{ marginRight: 15, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/12140/12140656.png' }} style={{ width: 24, height: 24 }} resizeMode="contain" />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>Paid via UPI</Text>
            <ChevronRight size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
        <View style={{ flex: 1 }}>
          {currentLat !== null && currentLng !== null ? (
            <Map style={styles.map} mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json">
              <Camera
                initialViewState={{ zoom: 14 }}
                center={[currentLng, currentLat]}
                duration={2000}
                easing="ease"
              />
              <Marker id="driverMarker" lngLat={[currentLng, currentLat]}>
                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: `${currentHeading}deg` }] }}>
                  <Image 
                    source={
                      vehicleCategory === 'auto' ? require('../../assets/images/auto-5.png') :
                      vehicleCategory === 'bike' ? require('../../assets/images/bike.png') :
                      require('../../assets/images/car.png')
                    } 
                    style={{ width: 28, height: 28, resizeMode: 'contain' }}
                  />
                </View>
              </Marker>

              {routeGeometry && (
                <GeoJSONSource id="routeSource" data={{ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: routeGeometry, properties: {} }] }}>
                  <Layer id="routeFill" type="line" style={{ lineColor: rideStatus === 'STARTED' ? '#1E88E5' : '#11704B', lineWidth: 5, lineCap: 'round', lineJoin: 'round' }} />
                </GeoJSONSource>
              )}

              <GeoJSONSource id="destSrc" data={({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: rideStatus === 'STARTED' ? [activeRide.drop.longitude, activeRide.drop.latitude] : [activeRide.pickup.longitude, activeRide.pickup.latitude] }, properties: {} }] }) as any}>
                <Layer id="destCircle" type="circle" style={{ circleRadius: 10, circleColor: rideStatus === 'STARTED' ? '#E53935' : '#11704B', circleStrokeWidth: 3, circleStrokeColor: '#ffffff' }} />
              </GeoJSONSource>
            </Map>
          ) : (
            <View style={[styles.map, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: '#64748b' }}>Locating you...</Text>
            </View>
          )}

          {/* Toggle Full Map Button */}
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, backgroundColor: '#fff', padding: 12, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2 }}
            onPress={() => setIsFullMap(!isFullMap)}
          >
            {isFullMap ? <Minimize size={24} color="#000" /> : <Maximize size={24} color="#000" />}
          </TouchableOpacity>
        </View>

        {!isFullMap && (
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, paddingBottom: 35, elevation: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginTop: -20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: rideStatus === 'STARTED' ? 15 : 5 }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0f172a' }}>
                {rideStatus === 'STARTED'
                  ? (activeRide.trip_type === 'TWO_WAY'
                      ? (tripStage === 'WAITING' ? 'Waiting at Destination ⏳' : tripStage === 'RETURN' ? 'Returning to Pickup 🔄' : 'Heading to Drop (Phase 1)')
                      : 'Trip Started')
                  : 'Driving to Pickup'}
              </Text>
              {activeRide.trip_type === 'TWO_WAY' && (
                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#C7D2FE' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4F46E5' }}>Two-Way 🔄</Text>
                </View>
              )}
            </View>

            {/* TWO-WAY LIVE WAITING TIMER CARD */}
            {activeRide.trip_type === 'TWO_WAY' && tripStage === 'WAITING' && (() => {
              const freeTotalSecs = (Number(waitingSettings.freeMinutes) || 0) * 60;
              const remainingSecs = freeTotalSecs - waitingElapsedSeconds;
              const isOvertime = remainingSecs < 0;

              let timeString = '';
              if (!isOvertime) {
                const displayMins = Math.floor(remainingSecs / 60);
                const displaySecs = remainingSecs % 60;
                timeString = `${displayMins}m ${displaySecs < 10 ? '0' : ''}${displaySecs}s`;
              } else {
                const extraSecs = waitingElapsedSeconds - freeTotalSecs;
                const displayMins = Math.floor(extraSecs / 60);
                const displaySecs = extraSecs % 60;
                timeString = `-${displayMins}m ${displaySecs < 10 ? '0' : ''}${displaySecs}s`;
              }

              return (
                <View style={{ backgroundColor: isOvertime ? '#FEF2F2' : '#FEF3C7', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: isOvertime ? '#FCA5A5' : '#FDE68A' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: isOvertime ? '#991B1B' : '#92400E' }}>
                      {isOvertime ? 'Extra Waiting Time (Billable)' : 'Free Waiting Time Left'}
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: isOvertime ? '#DC2626' : '#B45309' }}>
                      {timeString}
                    </Text>
                  </View>
                  <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: isOvertime ? '#7F1D1D' : '#78350F' }}>
                      Free Limit: {waitingSettings.freeMinutes} mins
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: waitingCharge > 0 ? '#DC2626' : '#059669' }}>
                      Waiting Fee: ₹{waitingCharge}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {rideStatus === 'STARTED' ? (
              <View style={{ marginBottom: 25 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669', marginRight: 12 }} />
                  <Text numberOfLines={1} style={{ fontSize: 14, color: '#64748b', flex: 1 }}>{activeRide.pickup.address}</Text>
                </View>
                <View style={{ position: 'absolute', left: 3, top: 12, bottom: 12, width: 2, backgroundColor: '#e2e8f0' }} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc2626', marginRight: 12 }} />
                  <Text numberOfLines={1} style={{ fontSize: 14, color: '#0f172a', fontWeight: '600', flex: 1 }}>{activeRide.drop.address}</Text>
                </View>

                {(activeRide.isParcel || activeRide.is_parcel) && activeRide.recipient_phone && (
                  <View style={{ marginTop: 15, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 'bold' }}>PARCEL DETAILS</Text>
                    <Text style={{ fontSize: 14, color: '#0f172a', marginBottom: 2 }}>Name: {activeRide.recipient_name || 'N/A'}</Text>
                    <Text style={{ fontSize: 14, color: '#0f172a', marginBottom: 2 }}>Phone: {activeRide.recipient_phone}</Text>
                    {activeRide.parcel_description ? (
                      <Text style={{ fontSize: 14, color: '#0f172a' }}>Items: {activeRide.parcel_description}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            ) : (
              <View style={{ marginBottom: 25 }}>
                <Text numberOfLines={2} style={{ fontSize: 15, color: '#64748b' }}>
                  {activeRide.pickup.address}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <View>
                    <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 'bold' }}>CUSTOMER PHONE</Text>
                    <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: '600' }}>
                      {activeRide.user_phone || activeRide.phone || 'N/A'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      const phone = activeRide.user_phone || activeRide.phone;
                      if (phone) Linking.openURL(`tel:${phone}`);
                    }}
                  >
                    <Phone size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Call</Text>
                  </TouchableOpacity>
                </View>
                {(activeRide.isParcel || activeRide.is_parcel) && (
                  <View style={{ marginTop: 10, padding: 10, backgroundColor: '#fef2f2', borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: 'bold' }}>PARCEL ORDER</Text>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Recipient details hidden until ride starts.</Text>
                  </View>
                )}
              </View>
            )}

            {rideStatus === 'ACCEPTED' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 15 }}>
                <TouchableOpacity style={[styles.reachedBtn, { flex: 1, paddingVertical: 14 }]} onPress={handleArrived}>
                  <Text style={styles.reachedBtnText}>Arrived</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reachedBtn, { paddingVertical: 14, backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 }]} onPress={handleCancelRide}>
                  <Text style={[styles.reachedBtnText, { color: '#DC2626' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {rideStatus === 'ARRIVED' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 15 }}>
                <TouchableOpacity style={[styles.reachedBtn, { flex: 1, paddingVertical: 14 }]} onPress={() => setShowOtpModal(true)}>
                  <Text style={styles.reachedBtnText}>Enter OTP to Start</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reachedBtn, { paddingVertical: 14, backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 }]} onPress={handleCancelRide}>
                  <Text style={[styles.reachedBtnText, { color: '#DC2626' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {rideStatus === 'STARTED' && (
              activeRide.trip_type === 'TWO_WAY' ? (
                tripStage === 'OUTWARD' ? (
                  <TouchableOpacity
                    style={[styles.reachedBtn, { backgroundColor: '#fdd763fd', paddingVertical: 16 }]}
                    onPress={() => {
                      if (socketRef.current && activeRide) {
                        socketRef.current.emit('ride:intermediate_drop', { rideId: activeRide.rideId });
                      }
                    }}
                  >
                    <Text style={[styles.reachedBtnText, { color: '#000000', fontWeight: 'bold' }]}>
                      Reached Drop (Start Waiting) ⏳
                    </Text>
                  </TouchableOpacity>
                ) : tripStage === 'WAITING' ? (
                  <TouchableOpacity
                    style={[styles.reachedBtn, { backgroundColor: '#059669', paddingVertical: 16 }]}
                    onPress={() => {
                      if (socketRef.current && activeRide) {
                        socketRef.current.emit('ride:start_return', { rideId: activeRide.rideId });
                      }
                    }}
                  >
                    <Text style={styles.reachedBtnText}>Start Return Trip ➔</Text>
                  </TouchableOpacity>
                ) : (
                  <SwipeToComplete onComplete={() => setShowPaymentScreen(true)} />
                )
              ) : (
                <SwipeToComplete onComplete={() => setShowPaymentScreen(true)} />
              )
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Location Disabled Modal */}
      {!isLocationEnabled && (
        <View style={styles.locationModalOverlay}>
          <View style={styles.locationModalContent}>
            <View style={styles.locationIconWrapper}>
              <MapPinOff size={40} color="#E53935" />
            </View>
            <Text style={styles.locationModalTitle}>Location is Disabled</Text>
            <Text style={styles.locationModalDesc}>
              We need your location to connect you with nearby riders. Please enable location services to use Eagle Driver.
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

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {activeRide ? renderActiveTrip() : renderHomeContent()}
      </View>

      

      {/* OTP Modal */}
      {showOtpModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.otpModalContent}>
            <Text style={styles.otpModalHeader}>Enter OTP</Text>
            <Text style={styles.otpModalDesc}>Ask the user for the 4-digit OTP shown on their screen to start the ride.</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="0000"
              keyboardType="number-pad"
              maxLength={4}
              value={otpInput}
              onChangeText={setOtpInput}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#ccc' }]} onPress={() => setShowOtpModal(false)}>
                <Text style={{ color: '#000', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#11704B' }]} onPress={handleVerifyOtp}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Verify & Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Driver Sidebar Modal */}
      <DriverSidebarModal
        visible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
        isOnline={isOnline}
        activeRide={activeRide}
        rideStatus={rideStatus}
        socketRef={socketRef}
      />
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

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

  // Header
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 25,
    position: 'relative',
    overflow: 'hidden'
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '500' },
  notificationBtn: { position: 'relative', padding: 8, backgroundColor: '#f8fafc', borderRadius: 20 },
  notificationBadge: { position: 'absolute', top: 6, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: '#fff' },
  headerDecoration: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#f0fdf4',
    zIndex: 1,
  },

  mainContentWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },

  scrollContent: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 100, // Space for footer
  },

  statusPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingVertical: 0,
    paddingHorizontal: 15,
    marginTop: 9, // add top margin since it's now in header
    gap: 10,
    zIndex: 2,
  },
  statusPillText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a'
  },


  // Map Container
  mapContainer: {
    height: height * 0.45,
    marginHorizontal: -15,
    marginTop: -10,
    marginBottom: 5,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  map: { width: '100%', height: '100%' },

  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginHorizontal: -10,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 0,
    borderColor: '#f1f5f9',
  },
  statsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  zapIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsMainText: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  statsSubText: { fontSize: 11, color: '#64748b', marginTop: 2, marginRight: 8 },
  offlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  offlineBtnText: { color: '#059669', fontWeight: 'bold', fontSize: 13, marginLeft: 4 },
  zapIconWrapper2: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  statsMainText2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  offlineBtn2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  offlineBtnText2: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6
  },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  statsColumns: { flexDirection: 'row', justifyContent: 'space-between' },
  statCol: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 6, marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#64748b' },

  // Tips Card
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7ef',
    borderRadius: 15,
    marginHorizontal: -10,
    padding: 15,
    marginBottom: 15,
  },
  tipsIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#a7f3d0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsTitle: { fontSize: 14, fontWeight: 'bold', color: '#000', marginBottom: 2 },
  tipsDesc: { fontSize: 12, color: '#555' },

  // Footer
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    justifyContent: 'space-around',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerTab: { alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative' },
  footerText: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 4 },
  footerTextActive: { color: '#059669' },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -10,
    width: 40,
    height: 3,
    backgroundColor: '#059669',
    borderRadius: 2
  },

  // Modals & Active Rides
  fullScreenModalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f8fafc', zIndex: 1000 },
  fullScreenContent: { padding: 20, alignItems: 'center' },
  newRideIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 30 },
  fullScreenModalHeader: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 30 },
  rideDetailsBox: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, marginBottom: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  locationText: { fontSize: 16, color: '#334155', flex: 1, lineHeight: 22 },
  locationLine: { width: 2, height: 30, backgroundColor: '#e2e8f0', marginLeft: 5, marginVertical: 4 },
  fareContainer: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, alignItems: 'center' },
  fareLabel: { fontSize: 14, color: '#64748b', marginBottom: 5 },
  fullScreenModalFare: { fontSize: 32, fontWeight: '900', color: '#059669' },
  fullScreenModalActions: { flexDirection: 'row', padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 15 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: '#fee2e2', alignItems: 'center' },
  cancelBtnText: { color: '#dc2626', fontWeight: 'bold', fontSize: 16 },
  pickupBtn: { flex: 2, paddingVertical: 16, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center' },
  pickupBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  activeRideCard: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  activeRideTitle: { fontSize: 16, fontWeight: 'bold', color: '#11704B', marginBottom: 5 },
  activeRideAddress: { fontSize: 14, color: '#333', marginBottom: 15 },
  reachedBtn: { backgroundColor: '#FFD700', padding: 15, borderRadius: 10, alignItems: 'center' },
  reachedBtnText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  otpModalContent: { backgroundColor: '#fff', width: '85%', padding: 25, borderRadius: 16, elevation: 5, alignItems: 'center' },
  otpModalHeader: { fontSize: 22, fontWeight: 'bold', color: '#11704B', marginBottom: 10 },
  otpModalDesc: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  otpInput: { borderWidth: 2, borderColor: '#11704B', borderRadius: 10, fontSize: 32, fontWeight: 'bold', textAlign: 'center', letterSpacing: 8, width: 150, padding: 10, marginBottom: 20 },

  // Rides History Screen
  ridesContainer: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  loadingText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 20 },
  rideCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  rideDate: { fontSize: 12, color: '#666', marginBottom: 10 },
  rideRoute: { marginBottom: 15 },
  rideAddress: { fontSize: 14, color: '#333', marginBottom: 5 },
  rideFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  rideStatus: { fontSize: 14, fontWeight: 'bold', color: '#11704B' },
  rideFare: { fontSize: 16, fontWeight: 'bold', color: '#000' }
});

export default DashboardScreen;
