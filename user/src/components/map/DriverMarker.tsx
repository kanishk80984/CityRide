import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Marker } from 'react-native-maps';
import { useSocket } from '../../context/SocketContext';
import { LocationData } from '../../services/locationService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DriverMarkerProps {
  selectedVehicleName?: string | null;
  isSelectingLocation?: boolean;
}

interface DriverLocState extends LocationData {
  heading?: number;
}

// Haversine distance in km
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const lerpAngle = (start: number, end: number, amount: number) => {
  const shortest_angle = ((((end - start) % 360) + 540) % 360) - 180;
  return start + shortest_angle * amount;
};

const lerp = (start: number, end: number, amount: number) => {
  return start + (end - start) * amount;
};

const ANIMATION_DURATION = 1500; // 1.5 seconds

const DriverMarker: React.FC<DriverMarkerProps> = ({ selectedVehicleName, isSelectingLocation }) => {
  const { socket } = useSocket();
  const [displayLocation, setDisplayLocation] = useState<DriverLocState | null>(null);

  const currentLocRef = useRef<DriverLocState | null>(null);
  const targetLocRef = useRef<DriverLocState | null>(null);
  
  const animFrameRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);

  useEffect(() => {
    if (!socket) return;

    const animate = (timestamp: number) => {
      if (!animStartTimeRef.current) {
        animStartTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - animStartTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      
      const current = currentLocRef.current;
      const target = targetLocRef.current;
      
      if (current && target) {
        const newLat = lerp(current.latitude, target.latitude, progress);
        const newLng = lerp(current.longitude, target.longitude, progress);
        
        let newHeading = target.heading;
        if (current.heading != null && target.heading != null) {
          newHeading = lerpAngle(current.heading, target.heading, progress);
        }

        setDisplayLocation({
          latitude: newLat,
          longitude: newLng,
          heading: newHeading,
        });
      }
      
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentLocRef.current = targetLocRef.current;
      }
    };

    const handleLocationUpdate = (data: any) => {
      const { latitude, longitude, heading, timestamp } = data;
      
      if (
        latitude != null &&
        longitude != null &&
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        latitude >= -90 && latitude <= 90 &&
        longitude >= -180 && longitude <= 180
      ) {
        if (timestamp && typeof timestamp === 'number') {
          if (timestamp < lastTimestampRef.current) return;
          lastTimestampRef.current = timestamp;
        }

        const newHeading = (typeof heading === 'number' && !isNaN(heading)) ? heading : undefined;
        const newTarget: DriverLocState = { latitude, longitude, heading: newHeading };
        
        if (!currentLocRef.current) {
          currentLocRef.current = newTarget;
          targetLocRef.current = newTarget;
          setDisplayLocation(newTarget);
        } else {
          const dist = getDistance(
            currentLocRef.current.latitude, currentLocRef.current.longitude,
            newTarget.latitude, newTarget.longitude
          );
          
          if (dist > 2) {
             currentLocRef.current = newTarget;
             targetLocRef.current = newTarget;
             setDisplayLocation(newTarget);
             
             if (animFrameRef.current) {
               cancelAnimationFrame(animFrameRef.current);
               animFrameRef.current = null;
             }
          } else {
             targetLocRef.current = newTarget;
             
             setDisplayLocation(prev => {
                if (prev) {
                   currentLocRef.current = prev;
                }
                return prev;
             });
             
             animStartTimeRef.current = null;
             
             if (animFrameRef.current) {
               cancelAnimationFrame(animFrameRef.current);
             }
             animFrameRef.current = requestAnimationFrame(animate);
          }
        }
      }
    };

    const handleOffline = (data: any) => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      currentLocRef.current = null;
      targetLocRef.current = null;
      setDisplayLocation(null);
    };

    socket.on('driver:location_update', handleLocationUpdate);
    socket.on('driver:offline', handleOffline);

    return () => {
      socket.off('driver:location_update', handleLocationUpdate);
      socket.off('driver:offline', handleOffline);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [socket]);

  if (!displayLocation || isSelectingLocation) {
    return null;
  }

  const getVehicleImage = () => {
    const name = selectedVehicleName?.toUpperCase() || '';
    if (name.includes('BIKE')) return require('../../assets/images/bike.png');
    if (name.includes('AUTO')) return require('../../assets/images/auto-5.png');
    if (name.includes('PARCEL')) return null;
    return require('../../assets/images/car.png');
  };

  const transformStyle = displayLocation.heading != null 
    ? { transform: [{ rotate: `${displayLocation.heading}deg` }] }
    : {};
    
  const imgSource = getVehicleImage();

  return (
    <Marker 
      key={`driver-${displayLocation.latitude}-${displayLocation.longitude}`}
      identifier="driverMarker" 
      coordinate={{ latitude: displayLocation.latitude, longitude: displayLocation.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.driverIconContainer, transformStyle]}>
        {imgSource ? (
          <Image source={imgSource} style={{ width: 30, height: 24 }} resizeMode="contain" />
        ) : (
          <Icon name="package-variant" size={24} color="#11704B" />
        )}
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  driverIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  }
});

export default DriverMarker;
