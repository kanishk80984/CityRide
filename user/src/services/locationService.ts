import { PermissionsAndroid, Platform } from 'react-native';
// @ts-ignore
import Geolocation from '@react-native-community/geolocation';
import apiClient from './apiClient';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
  address?: string;
  isManual?: boolean;
  heading?: number | null;
  speed?: number | null;
}

export const locationService = {
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'CityRide needs access to your location to find nearby drivers and track your ride.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS is handled natively via Info.plist
  },

  getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      // First try High Accuracy (GPS)
      Geolocation.getCurrentPosition(
        (position: any) => {
          console.log('[GPS] latitude:', position.coords.latitude);
          console.log('[GPS] longitude:', position.coords.longitude);
          console.log('[GPS] accuracy:', position.coords.accuracy);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (error: any) => {
          console.warn('[GPS] High accuracy failed, trying low accuracy...', error);
          // Fallback to Low Accuracy (Network/Wi-Fi)
          Geolocation.getCurrentPosition(
            (pos: any) => {
              console.log('[GPS Fallback] latitude:', pos.coords.latitude);
              console.log('[GPS Fallback] longitude:', pos.coords.longitude);
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: pos.timestamp,
              });
            },
            (err: any) => {
              console.warn('[GPS] Low accuracy also failed:', err);
              reject(err);
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    });
  },

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const response = await apiClient.get(`/maps/reverse-geocode?lat=${latitude}&lon=${longitude}`);
      if (response.data.success && response.data.location) {
        console.log('[REVERSE GEOCODE] address:', response.data.location.address);
        return response.data.location.address;
      }
      return 'Unknown Location';
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return 'Location Unavailable';
    }
  }
};
