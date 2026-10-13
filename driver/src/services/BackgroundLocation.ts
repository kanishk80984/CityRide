import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { DriverLocationModule } = NativeModules;

export interface NativeLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: number;
}

const eventEmitter = DriverLocationModule
  ? new NativeEventEmitter(DriverLocationModule)
  : null;

export const BackgroundLocation = {
  /**
   * Start Android native Foreground Service for Location Tracking
   */
  startService: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !DriverLocationModule) return false;
    try {
      return await DriverLocationModule.startService();
    } catch (e) {
      console.error('[BackgroundLocation] Failed to start service:', e);
      return false;
    }
  },

  /**
   * Stop Android native Foreground Service
   */
  stopService: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !DriverLocationModule) return false;
    try {
      return await DriverLocationModule.stopService();
    } catch (e) {
      console.error('[BackgroundLocation] Failed to stop service:', e);
      return false;
    }
  },

  /**
   * Check if service is currently running
   */
  isServiceRunning: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !DriverLocationModule) return false;
    try {
      return await DriverLocationModule.isServiceRunning();
    } catch {
      return false;
    }
  },

  /**
   * Check if app is exempt from Android battery optimizations
   */
  isIgnoringBatteryOptimizations: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !DriverLocationModule) return false;
    try {
      return await DriverLocationModule.isIgnoringBatteryOptimizations();
    } catch {
      return false;
    }
  },

  /**
   * Check if app has permission to draw over other apps
   */
  canDrawOverlays: async (): Promise<boolean> => {
    if (Platform.OS !== 'android' || !DriverLocationModule) return false;
    try {
      return await DriverLocationModule.canDrawOverlays();
    } catch {
      return false;
    }
  },

  /**
   * Listen to location updates emitted from native service
   */
  onLocationUpdate: (callback: (location: NativeLocationData) => void) => {
    if (!eventEmitter) return { remove: () => {} };
    const subscription = eventEmitter.addListener('onDriverLocationUpdate', (loc: any) => {
      callback(loc as NativeLocationData);
    });
    return subscription;
  },

  /**
   * Validate all driver online requirements
   * Returns structured status of each permission and whether online is allowed
   */
  validateDriverOnlineRequirements: async (): Promise<{
    canGoOnline: boolean;
    missingPermissions: string[];
    fineLocation: boolean;
    coarseLocation: boolean;
    backgroundLocation: boolean;
    notification: boolean;
    batteryExempt: boolean;
    canDrawOverlays: boolean;
    reason?: string;
  }> => {
    const { PermissionsAndroid } = require('react-native');
    if (Platform.OS !== 'android') {
      return {
        canGoOnline: true,
        missingPermissions: [],
        fineLocation: true,
        coarseLocation: true,
        backgroundLocation: true,
        notification: true,
        batteryExempt: true,
        canDrawOverlays: true,
      };
    }

    try {
      const fineLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      const coarseLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );

      let backgroundLocation = true;
      if (Platform.Version >= 29) {
        backgroundLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
      }

      let notification = true;
      if (Platform.Version >= 33) {
        notification = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      }

      const batteryExempt = await BackgroundLocation.isIgnoringBatteryOptimizations();
      const canDrawOverlays = await BackgroundLocation.canDrawOverlays();

      const missingPermissions: string[] = [];
      if (!fineLocation && !coarseLocation) {
        missingPermissions.push('Location (Fine/Coarse)');
      }
      if (Platform.Version >= 29 && !backgroundLocation) {
        missingPermissions.push('Background Location ("Allow all the time")');
      }

      const canGoOnline = missingPermissions.length === 0;
      let reason: string | undefined;
      if (!canGoOnline) {
        reason = `Missing required permissions: ${missingPermissions.join(', ')}`;
      }

      return {
        canGoOnline,
        missingPermissions,
        fineLocation,
        coarseLocation,
        backgroundLocation,
        notification,
        batteryExempt,
        canDrawOverlays,
        reason,
      };
    } catch (e: any) {
      console.error('[BackgroundLocation] Error validating online requirements:', e);
      return {
        canGoOnline: false,
        missingPermissions: ['Location Check Error'],
        fineLocation: false,
        coarseLocation: false,
        backgroundLocation: false,
        notification: false,
        batteryExempt: false,
        canDrawOverlays: false,
        reason: e?.message || 'Error checking Android permissions',
      };
    }
  }
};
