import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, SafeAreaView, Modal, PermissionsAndroid, AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, CheckCircle2, ChevronRight, LayoutGrid, MapPin, BatteryCharging, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackgroundLocation } from '../../services/BackgroundLocation';

const DriverPermissionsScreen = () => {
  const navigation = useNavigation<any>();
  const [permissions, setPermissions] = useState({
    overlay: false,
    location: false,
    battery: false
  });
  const [activeModalType, setActiveModalType] = useState<'overlay' | 'location' | 'battery' | null>(null);

  useEffect(() => {
    checkRealPermissions();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkRealPermissions();
      }
    });

    return () => sub.remove();
  }, []);

  const checkRealPermissions = async () => {
    if (Platform.OS !== 'android') return;

    try {
      const validation = await BackgroundLocation.validateDriverOnlineRequirements();

      const realPerms = {
        location: validation.canGoOnline,
        battery: validation.batteryExempt,
        overlay: validation.canDrawOverlays
      };

      setPermissions(realPerms);
      await AsyncStorage.setItem('driverPermissions', JSON.stringify(realPerms));
    } catch (e) {
      console.log('Error verifying real permissions:', e);
    }
  };

  const handleOverlayPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL('intent:package:com.driver#Intent;action=android.settings.action.MANAGE_OVERLAY_PERMISSION;end');
      } catch (e) {
        try {
          Linking.openSettings();
        } catch (err) {
          console.log('Overlay intent failed', err);
        }
      }
    }
  };

  const handleLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // Step 1: Request Foreground location first (FINE + COARSE) as required by Android 11+
        const fgResult = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        ]);

        const fineGranted = fgResult[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

        if (fineGranted) {
          // Step 2: Request Background Location separately if Android 10+ (API 29+)
          if (Platform.Version >= 29) {
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
          }
          if (Platform.Version >= 33) {
            // Android 13+ Notification permission for the Foreground Service notification
            await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          }
        } else {
          Linking.openSettings();
        }
      } catch (err) {
        try {
          Linking.openSettings();
        } catch (e) {
          console.log('Location intent failed', e);
        }
      }
    }
    // Check real permissions
    setTimeout(checkRealPermissions, 1000);
  };

  const handleBatteryPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL('intent:package:com.driver#Intent;action=android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS;end');
      } catch (e) {
        try {
          Linking.openSettings();
        } catch (err) {
          console.log('Battery intent failed', err);
        }
      }
    }
    setTimeout(checkRealPermissions, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header matching image */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10, marginLeft: -10 }}>
            <ChevronLeft size={28} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpText}>Help</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.blueBanner}>
          <Text style={styles.bannerText}>
            {permissions.location
              ? 'Required permissions granted! You can now go online.'
              : 'Location permission is required to receive ride orders.'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        
        {/* Background Location (Essential) */}
        <TouchableOpacity style={styles.card} onPress={() => setActiveModalType('location')} activeOpacity={0.7}>
          <View style={styles.iconContainer}>
            <MapPin size={22} color="#059669" />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>Background Location</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>REQUIRED</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              Required to track location and assign rides while app is active or in background
            </Text>
          </View>
          <View style={styles.statusContainer}>
            {permissions.location ? (
              <CheckCircle2 size={24} color="#059669" fill="#059669" stroke="#fff" />
            ) : (
              <ChevronRight size={24} color="#9CA3AF" />
            )}
          </View>
        </TouchableOpacity>

        {/* Battery Usage (Recommended) */}
        <TouchableOpacity style={styles.card} onPress={() => setActiveModalType('battery')} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
            <BatteryCharging size={22} color="#1E88E5" />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>Battery Optimization Exemption</Text>
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              Prevents Android from stopping location updates when screen is off
            </Text>
          </View>
          <View style={styles.statusContainer}>
            {permissions.battery ? (
              <CheckCircle2 size={24} color="#059669" fill="#059669" stroke="#fff" />
            ) : (
              <ChevronRight size={24} color="#1E88E5" />
            )}
          </View>
        </TouchableOpacity>

        {/* Display over other apps (Optional) */}
        <TouchableOpacity style={styles.card} onPress={() => setActiveModalType('overlay')} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
            <LayoutGrid size={22} color="#6B7280" />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>Display over other apps</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>OPTIONAL</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              Allows navigation and alert window popups on top of Google Maps
            </Text>
          </View>
          <View style={styles.statusContainer}>
            {permissions.overlay ? (
              <CheckCircle2 size={24} color="#059669" fill="#059669" stroke="#fff" />
            ) : (
              <ChevronRight size={24} color="#9CA3AF" />
            )}
          </View>
        </TouchableOpacity>

      </View>

      <Modal visible={activeModalType !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setActiveModalType(null)} style={styles.modalClose}>
              <X size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.modalTopBlue}>
              <View style={styles.phonePlaceholder}>
                <View style={styles.phoneScreen}>
                  
                  {activeModalType === 'battery' && (
                    <>
                      <Text style={styles.phoneHeader}>City Ride Driver</Text>
                      <Text style={styles.phoneSubheader}>BACKGROUND SETTINGS</Text>
                      <View style={styles.phoneOptionActive}>
                        <CheckCircle2 size={16} color="#1E88E5" />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.phoneOptionTitleActive}>No restrictions / Unrestricted</Text>
                          <Text style={styles.phoneOptionDescActive}>Battery saver will not stop location tracking</Text>
                        </View>
                      </View>
                      <View style={styles.phoneOption}>
                        <View style={{ marginLeft: 24 }}>
                          <Text style={styles.phoneOptionTitle}>Optimized (Restricted)</Text>
                          <Text style={styles.phoneOptionDesc}>System may kill tracking when screen is turned off</Text>
                        </View>
                      </View>
                    </>
                  )}

                  {activeModalType === 'location' && (
                    <>
                      <Text style={styles.phoneSubheader}>Location permission</Text>
                      <Text style={[styles.phoneHeader, { fontSize: 14, textAlign: 'center', marginTop: 10 }]}>City Ride Driver</Text>
                      <Text style={[styles.phoneSubheader, { marginTop: 10 }]}>LOCATION ACCESS FOR THIS APP</Text>
                      <View style={styles.phoneOptionActive}>
                        <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 4, borderColor: '#1E88E5' }} />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.phoneOptionTitleActive}>Allow all the time</Text>
                        </View>
                      </View>
                      <View style={styles.phoneOption}>
                        <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#9CA3AF', marginLeft: 4 }} />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.phoneOptionTitle}>Allow only while using the app</Text>
                        </View>
                      </View>
                      <View style={styles.phoneOption}>
                        <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#9CA3AF', marginLeft: 4 }} />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={styles.phoneOptionTitle}>Don't allow</Text>
                        </View>
                      </View>
                    </>
                  )}

                  {activeModalType === 'overlay' && (
                    <>
                      <Text style={[styles.phoneHeader, { textAlign: 'center', marginTop: 20 }]}>City Ride Driver</Text>
                      <Text style={[styles.phoneSubheader, { textAlign: 'center' }]}>Display over other apps</Text>
                      
                      <View style={[styles.phoneOptionActive, { justifyContent: 'space-between', alignItems: 'center' }]}>
                        <Text style={styles.phoneOptionTitleActive}>Allow display over other apps</Text>
                        <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 4, borderColor: '#1E88E5' }} />
                      </View>
                    </>
                  )}

                </View>
              </View>
            </View>

            <View style={styles.modalBottomWhite}>
              <Text style={styles.modalTitle}>
                {activeModalType === 'battery' ? 'Battery Optimization Exemption' : activeModalType === 'location' ? 'Allow All The Time Location' : 'Allow Display Over Other Apps'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {activeModalType === 'battery'
                  ? 'Select "Unrestricted" so Android keeps location updates running while driving.'
                  : activeModalType === 'location'
                  ? 'Select "Allow all the time" so the app can track your location and assign orders while backgrounded.'
                  : 'Allows the app to display floating ride alerts on top of navigation apps.'}
              </Text>
              
              <TouchableOpacity 
                style={styles.modalOkayBtn}
                onPress={() => {
                  const type = activeModalType;
                  setActiveModalType(null);
                  if (type === 'battery') handleBatteryPermission();
                  if (type === 'location') handleLocationPermission();
                  if (type === 'overlay') handleOverlayPermission();
                }}
              >
                <Text style={styles.modalOkayBtnText}>Configure in Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  header: {
    backgroundColor: '#ffffff',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  helpText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827'
  },
  blueBanner: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  bannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20
  },
  content: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  requiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
    alignSelf: 'center',
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  recommendedBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
    alignSelf: 'center',
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.3,
  },
  optionalBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 4,
    alignSelf: 'center',
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.3,
  },
  statusContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    flexShrink: 0,
    width: 28,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalClose: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 6,
  },
  modalTopBlue: {
    backgroundColor: '#059669',
    paddingVertical: 30,
    alignItems: 'center',
  },
  phonePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#334155',
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
  },
  phoneHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  phoneSubheader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 8,
  },
  phoneOptionActive: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 6,
    borderRadius: 6,
    marginBottom: 6,
  },
  phoneOptionTitleActive: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  phoneOptionDescActive: {
    fontSize: 8,
    color: '#1E88E5',
    marginTop: 2,
  },
  phoneOption: {
    flexDirection: 'row',
    padding: 6,
    borderRadius: 6,
  },
  phoneOptionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  phoneOptionDesc: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 2,
  },
  modalBottomWhite: {
    backgroundColor: '#ffffff',
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalOkayBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  modalOkayBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  }
});

export default DriverPermissionsScreen;
