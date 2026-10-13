import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, Image, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LocationData } from '../../services/locationService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DriverMarker from './DriverMarker';

interface EagleMapProps {
  currentLocation?: LocationData | null;
  selectedVehicleName?: string | null;
  pickupLocation?: LocationData | null;
  dropLocation?: LocationData | null;
  routeGeometry?: any | null; // GeoJSON line string
  recenterTrigger?: number;
  onMapPress?: (e: any) => void;
  isSelectingLocation?: boolean;
  onRegionChange?: (location: LocationData) => void;
  onRegionChangeStart?: () => void;
  isMapSelectionMode?: boolean;
  manualSelectedLocation?: LocationData | null;
  followDriver?: boolean;
  nearbyDrivers?: any[];
  panToCoordinate?: [number, number] | null;
  mapSelectionIsPickup?: boolean;
  mapTheme?: 'light' | 'dark';
  mapBottomPadding?: number;
  isSheetExpanded?: boolean;
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

const lightMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#333333" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#e0e0e0" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5f2e5" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#4b854b" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "road.local", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#f2f2f2" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9e2f5" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const lerpAngle = (start: number, end: number, amount: number) => {
  const shortest = ((((end - start) % 360) + 540) % 360) - 180;
  return start + shortest * amount;
};

const EagleMap: React.FC<EagleMapProps> = ({
  currentLocation,
  pickupLocation,
  dropLocation,
  routeGeometry,
  recenterTrigger,
  onMapPress,
  isSelectingLocation,
  onRegionChange,
  onRegionChangeStart,
  selectedVehicleName,
  isMapSelectionMode,
  manualSelectedLocation,
  followDriver,
  nearbyDrivers = [],
  panToCoordinate,
  mapSelectionIsPickup,
  mapTheme = 'light',
  mapBottomPadding = 0,
  isSheetExpanded = false,
}) => {
  const cameraRef = useRef<any>(null);
  const { socket } = require('../../context/SocketContext').useSocket();
  const isFollowingRef = useRef(true);
  const lastCameraUpdateRef = useRef(0);
  const currentCameraHeadingRef = useRef(0);
  const isMapReady = useRef(false);

  useEffect(() => {
    if (currentLocation && !pickupLocation && cameraRef.current) {
      cameraRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [currentLocation, pickupLocation]);

  // Removed pickupLocation useEffect to prevent fighting user zoom gestures

  useEffect(() => {
    if (cameraRef.current) {
      // We need a large bottom padding because the bottom sheet covers the bottom 78% of the screen.
      // If we use bottom: 30, the route will be centered in the middle of the phone, hiding it BEHIND the bottom sheet!
      const edgePadding = { top: 110, right: 100, bottom: 350, left: 110 };

      if (routeGeometry && routeGeometry.coordinates && routeGeometry.coordinates.length > 0) {
        const coords = routeGeometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0]
        }));
        // Add small delay to ensure map is ready
        setTimeout(() => {
          cameraRef.current?.fitToCoordinates(coords, {
            edgePadding,
            animated: true,
          });
        }, 300);
      } else if (pickupLocation && dropLocation && !isSelectingLocation) {
        // Fit both pickup and drop if route is not available
        setTimeout(() => {
          cameraRef.current?.fitToCoordinates([
            { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
            { latitude: dropLocation.latitude, longitude: dropLocation.longitude }
          ], {
            edgePadding,
            animated: true,
          });
        }, 300);
      }
    }
  }, [routeGeometry, pickupLocation, dropLocation, isSelectingLocation]);

  useEffect(() => {
    if (recenterTrigger && currentLocation && cameraRef.current) {
      isFollowingRef.current = true;
      if (!followDriver) {
        cameraRef.current.animateToRegion({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    }
  }, [recenterTrigger, currentLocation, followDriver]);

  useEffect(() => {
    if (cameraRef.current && panToCoordinate && isMapReady.current) {
      cameraRef.current.animateToRegion({
        latitude: panToCoordinate[1],
        longitude: panToCoordinate[0],
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [panToCoordinate]);

  const handleMapReady = () => {
    isMapReady.current = true;
    if (panToCoordinate && cameraRef.current) {
      cameraRef.current.animateToRegion({
        latitude: panToCoordinate[1],
        longitude: panToCoordinate[0],
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } else if (currentLocation && cameraRef.current) {
      cameraRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  useEffect(() => {
    if (!socket || !followDriver) return;

    isFollowingRef.current = true;

    const handleLocation = (data: any) => {
      if (!isFollowingRef.current) return;
      const { latitude, longitude, heading } = data;

      if (latitude != null && longitude != null) {
        const now = Date.now();
        if (now - lastCameraUpdateRef.current > 1500) {
          let newHeading = currentCameraHeadingRef.current;
          if (heading != null) {
            const diff = ((((heading - currentCameraHeadingRef.current) % 360) + 540) % 360) - 180;
            newHeading = currentCameraHeadingRef.current + diff;
          }

          cameraRef.current?.animateCamera({
            center: { latitude, longitude },
            heading: newHeading,
            zoom: 16
          }, { duration: 1500 });

          currentCameraHeadingRef.current = newHeading;
          lastCameraUpdateRef.current = now;
        }
      }
    };

    socket.on('driver:location_update', handleLocation);
    return () => {
      socket.off('driver:location_update', handleLocation);
    };
  }, [socket, followDriver]);

  const currentLocationCoord = currentLocation ? [currentLocation.longitude, currentLocation.latitude] as [number, number] : null;
  const pickupCoord = pickupLocation ? [pickupLocation.longitude, pickupLocation.latitude] as [number, number] : null;
  const dropCoord = dropLocation ? [dropLocation.longitude, dropLocation.latitude] as [number, number] : null;

  const getVehicleImage = (vehicleName: string) => {
    const name = vehicleName.toUpperCase();
    if (name.includes('BIKE')) return require('../../assets/images/bike.png');
    if (name.includes('AUTO')) return require('../../assets/images/auto-5.png');
    if (name.includes('PARCEL')) return null;
    return require('../../assets/images/car.png');
  };

  const transformStyle = (heading: number) => heading != null
    ? { transform: [{ rotate: `${heading}deg` }] }
    : {};

  const { height } = Dimensions.get('window');

  // The map container in HomeScreen is height * 0.85 when selecting a location
  const actualMapHeight = height * 0.85;

  // Dynamically calculate top padding to keep the visual balance
  const dynamicTopPadding = mapBottomPadding < actualMapHeight * 0.5 ? 250 : 50;
  // Cap the bottom padding so it never exceeds screen height minus top padding
  const safeBottomPadding = Math.min(mapBottomPadding, actualMapHeight - dynamicTopPadding - 50);

  // Calculate exact center of the map's padded area to position the crosshair correctly
  const paddedCenterTop = dynamicTopPadding + (actualMapHeight - dynamicTopPadding - safeBottomPadding) / 2;

  return (
    <View style={styles.container}>
      <MapView
        ref={cameraRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapTheme === 'dark' ? darkMapStyle : lightMapStyle}
        userInterfaceStyle={mapTheme === 'dark' ? 'dark' : 'light'}
        showsUserLocation={true}
        showsMyLocationButton={false}
        mapPadding={{ top: dynamicTopPadding, right: 0, bottom: safeBottomPadding, left: 0 }}
        initialRegion={{
          latitude: pickupCoord ? pickupCoord[1] : (currentLocationCoord ? currentLocationCoord[1] : 11.3410),
          longitude: pickupCoord ? pickupCoord[0] : (currentLocationCoord ? currentLocationCoord[0] : 77.7172),
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onMapReady={handleMapReady}
        onPress={(e: any) => {
          if (onMapPress) onMapPress(e);
        }}
        onRegionChange={(region, details) => {
          if (isSelectingLocation && onRegionChangeStart && details?.isGesture) {
            onRegionChangeStart();
          }
        }}
        onRegionChangeComplete={(region) => {
          if (isSelectingLocation && onRegionChange) {
            onRegionChange({ latitude: region.latitude, longitude: region.longitude, address: 'Fetching address...' });
          }
        }}
      >



        {/* Pickup Marker */}
        {pickupCoord && !isSelectingLocation && (
          <Marker anchor={{ x: 0.5, y: 1 }} key={`pickup-${pickupCoord[0]}-${pickupCoord[1]}`} identifier="pickupSrc" coordinate={{ latitude: pickupCoord[1], longitude: pickupCoord[0] }} onPress={() => onMapPress && onMapPress({ action: 'edit_pickup' })}>
            <View style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
              <View style={{
                backgroundColor: '#fff',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 24,
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 6,
                flexDirection: 'row',
                alignItems: 'center',
                maxWidth: 280,
              }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#11704B', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#11704B' }} />
                </View>
                <Text style={{ color: '#111827', fontWeight: '500', fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
                  {pickupLocation?.address || 'Locating...'}
                </Text>
              </View>
              <View style={{
                width: 0,
                height: 0,
                backgroundColor: 'transparent',
                borderStyle: 'solid',
                borderLeftWidth: 8,
                borderRightWidth: 8,
                borderBottomWidth: 10,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: '#fff',
                transform: [{ rotate: '180deg' }],
                marginTop: -1,
              }} />
            </View>
          </Marker>
        )}

        {/* Drop Marker */}
        {dropCoord && (!isMapSelectionMode || mapSelectionIsPickup) && (
          <Marker anchor={{ x: 0.5, y: 1 }} key={`drop-${dropCoord[0]}-${dropCoord[1]}`} identifier="dropSrc" coordinate={{ latitude: dropCoord[1], longitude: dropCoord[0] }} onPress={() => onMapPress && onMapPress({ action: 'edit_drop' })}>
            <View style={styles.annotationContainer}>
              <View style={styles.annotationBubble}>
                <Text style={styles.annotationText} numberOfLines={1}>
                  {dropLocation?.address?.split(',')[0] || 'Drop'}
                </Text>
                <View style={styles.editIconContainer}>
                  <Text style={{ fontSize: 12 }}>✏️</Text>
                </View>
              </View>
              <View style={styles.annotationPinLine} />
              <View style={[styles.annotationDot, { borderColor: '#E53935' }]} />
            </View>
          </Marker>
        )}




        {/* Driver Marker */}
        {followDriver && (
          <DriverMarker
            selectedVehicleName={selectedVehicleName}
            isSelectingLocation={isSelectingLocation}
          />
        )}

        {/* Nearby Drivers Markers */}
        {!isSelectingLocation && nearbyDrivers.map((driver) => {
          const imgSource = getVehicleImage(selectedVehicleName || 'Car');
          return (
            <Marker
              key={`nearby-driver-${driver.id}`}
              identifier={`nearby-driver-${driver.id}`}
              coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.driverIconContainer, transformStyle(driver.heading)]}>
                {imgSource ? (
                  <Image source={imgSource} style={{ width: 30, height: 24 }} resizeMode="contain" />
                ) : (
                  <Icon name="package-variant" size={24} color="#11704B" />
                )}
              </View>
            </Marker>
          );
        })}

        {/* Route Polyline */}
        {routeGeometry && routeGeometry.coordinates && (
          <Polyline
            coordinates={routeGeometry.coordinates.map((coord: number[]) => ({
              latitude: coord[1],
              longitude: coord[0]
            }))}
            strokeColor={mapTheme === 'dark' ? '#f5f2f2ff' : '#200909ff'}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {/* Center Pin for Map Selection Mode */}
      {isSelectingLocation && !isSheetExpanded && (
        <View style={[styles.centerPinContainer, { top: paddedCenterTop }]} pointerEvents="none">
          <View style={styles.centerPinBubble}>
            <Text style={styles.centerPinText} numberOfLines={1}>
              {manualSelectedLocation?.address && manualSelectedLocation.address !== 'Finding location...'
                ? manualSelectedLocation.address.split(',')[0]
                : (mapSelectionIsPickup ? 'Select Pickup' : 'Select Drop')}
            </Text>
          </View>
          <View style={styles.centerPinLine} />
          <View style={styles.centerPinDotWrapper}>
            <View style={styles.centerPinInnerDot} />
          </View>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#EAF5F0'
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  annotationContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 120,
    height: 60,
  },
  annotationBubble: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  annotationText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    maxWidth: 70,
  },
  editIconContainer: {
    marginLeft: 6,
    width: 20,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  annotationPinLine: {
    width: 2,
    height: 12,
    backgroundColor: '#000',
  },
  annotationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 4,
    backgroundColor: '#fff',
  },
  centerPinContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginTop: -70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 10,
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
  },
  centerPinText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  centerPinLine: {
    width: 2,
    height: 15,
    backgroundColor: '#11704B',
  },
  centerPinDotWrapper: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(17, 112, 75, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -8, // to center it on the exact coordinate
  },
  centerPinInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#11704B',
  },
  driverIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  }
});

export default React.memo(EagleMap);
