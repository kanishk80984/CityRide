import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, ActivityIndicator, Alert, SafeAreaView, TouchableWithoutFeedback, Platform, StatusBar } from 'react-native';
import { X, Bike, CarFront, Truck, Box } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Socket } from 'socket.io-client';
import api from '../services/api';

export type DriverSidebarModalProps = {
  visible: boolean;
  onClose: () => void;
  isOnline: boolean;
  activeRide: any | null;
  rideStatus: string;
  socketRef: React.MutableRefObject<Socket | null>;
};

const DriverSidebarModal: React.FC<DriverSidebarModalProps> = ({
  visible,
  onClose,
  isOnline,
  activeRide,
  rideStatus,
  socketRef
}) => {
  const [parcelOrdersEnabled, setParcelOrdersEnabled] = useState<boolean>(false);
  const [entitlements, setEntitlements] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<boolean>(false);
  const [driverUser, setDriverUser] = useState<any>(null);
  const [registeredVehicle, setRegisteredVehicle] = useState<string>('');

  // Fetch initial parcel status
  useEffect(() => {
    if (visible) {
      fetchParcelStatus();
    }
  }, [visible]);

  const fetchParcelStatus = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const response = await api.get('/api/driver/parcel-status');
      const data = response.data;

      const userStr = await AsyncStorage.getItem('driverUser');
      if (userStr) {
        setDriverUser(JSON.parse(userStr));
      }

      if (data.success && data.data) {
        setParcelOrdersEnabled(data.data.parcelOrdersEnabled);
        if (data.data.vehicleName) {
          setRegisteredVehicle(data.data.vehicleName.toLowerCase());
        }
      } else {
        throw new Error('Failed to fetch status');
      }

      const subRes = await api.get('/api/driver/subscription');
      if (subRes.data && subRes.data.success && subRes.data.data.entitlements) {
        setEntitlements(subRes.data.data.entitlements);
      }
    } catch (error) {
      console.error('Fetch parcel status error:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleParcel = async (newValue: boolean) => {
    if (updating || activeRide || ['ACCEPTED', 'STARTED'].includes(rideStatus)) return;

    // Optimistic update
    const previousValue = parcelOrdersEnabled;
    setParcelOrdersEnabled(newValue);
    setUpdating(true);

    try {
      const response = await api.put('/api/driver/parcel-status', { enabled: newValue });
      const data = response.data;

      if (!data.success) {
        throw new Error('API failed');
      }

      // If driver is currently online, we must reconnect their socket to update backend metadata
      if (isOnline && socketRef.current) {
        socketRef.current.disconnect();
        setTimeout(() => {
          if (socketRef.current) {
            socketRef.current.connect();
          }
        }, 200);
      }

    } catch (error) {
      console.error('Update parcel status error:', error);
      // Revert state
      setParcelOrdersEnabled(previousValue);
      Alert.alert('Error', 'Failed to update parcel setting. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleEntitlement = async (type: string, newValue: boolean) => {
    if (updating || activeRide || ['ACCEPTED', 'STARTED'].includes(rideStatus)) return;
    
    const previousEntitlements = { ...entitlements };
    setEntitlements((prev: any) => ({
      ...prev,
      [type]: { ...prev[type], enabled: newValue }
    }));
    setUpdating(true);

    try {
      const response = await api.put('/api/driver/ride-entitlements', { type, enabled: newValue });
      if (!response.data.success) throw new Error('API failed');
    } catch (error) {
      console.error('Update entitlement error:', error);
      setEntitlements(previousEntitlements);
      Alert.alert('Error', 'Failed to update ride entitlement.');
    } finally {
      setUpdating(false);
    }
  };

  // Determine current vehicle
  let currentCategory = registeredVehicle || (driverUser?.vehicle_category || '').toLowerCase();
  if (['mini', 'sedan', 'suv', 'cab', 'car'].includes(currentCategory)) {
    currentCategory = 'cab';
  }

  const isRideActive = activeRide !== null || ['ACCEPTED', 'STARTED'].includes(rideStatus);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sidebar}>
          <SafeAreaView style={{ flex: 1 }}>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>

            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {driverUser?.name ? driverUser.name.charAt(0).toUpperCase() : 'D'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{driverUser?.name || 'Driver'}</Text>
                {driverUser?.phone && (
                  <Text style={styles.phone}>{driverUser.phone}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Vehicle Type (Read Only) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>VEHICLE TYPE</Text>

              <View style={styles.vehicleList}>
                {/* Bike */}
                <View style={[styles.vehicleRow, currentCategory !== 'bike' && styles.disabledRow]}>
                  <View style={styles.vehicleIconWrapper}>
                    <Bike size={24} color={currentCategory === 'bike' ? '#059669' : '#94a3b8'} />
                    <Text style={styles.vehicleText}>Bike</Text>
                  </View>
                  <View style={[styles.radioOuter, currentCategory === 'bike' && styles.radioOuterSelected]}>
                    {currentCategory === 'bike' && <View style={styles.radioInner} />}
                  </View>
                </View>

                {/* Auto */}
                <View style={[styles.vehicleRow, currentCategory !== 'auto' && styles.disabledRow]}>
                  <View style={styles.vehicleIconWrapper}>
                    <Truck size={24} color={currentCategory === 'auto' ? '#059669' : '#94a3b8'} />
                    <Text style={styles.vehicleText}>Auto</Text>
                  </View>
                  <View style={[styles.radioOuter, currentCategory === 'auto' && styles.radioOuterSelected]}>
                    {currentCategory === 'auto' && <View style={styles.radioInner} />}
                  </View>
                </View>

                {/* Cab */}
                <View style={[styles.vehicleRow, currentCategory !== 'cab' && styles.disabledRow]}>
                  <View style={styles.vehicleIconWrapper}>
                    <CarFront size={24} color={currentCategory === 'cab' ? '#059669' : '#94a3b8'} />
                    <Text style={styles.vehicleText}>Cab</Text>
                  </View>
                  <View style={[styles.radioOuter, currentCategory === 'cab' && styles.radioOuterSelected]}>
                    {currentCategory === 'cab' && <View style={styles.radioInner} />}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Services Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SERVICES</Text>

              <View style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Box size={20} color="#0f172a" style={{ marginRight: 8 }} />
                    <Text style={styles.serviceName}>Parcel Orders</Text>
                  </View>
                  <Text style={styles.serviceDesc}>Receive package delivery requests</Text>
                </View>

                {loading ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : fetchError ? (
                  <TouchableOpacity onPress={fetchParcelStatus} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <Switch
                      value={parcelOrdersEnabled}
                      onValueChange={handleToggleParcel}
                      disabled={updating || isRideActive || !isOnline}
                      trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
                      thumbColor={parcelOrdersEnabled ? '#059669' : '#f8fafc'}
                      style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
                    />
                  </View>
                )}
              </View>

              {!isOnline && (
                <Text style={styles.warningText}>
                  Go online to receive parcel orders.
                </Text>
              )}
              {isOnline && isRideActive && (
                <Text style={styles.warningText}>
                  Settings cannot be changed while a ride is active.
                </Text>
              )}
            </View>
            
            <View style={styles.divider} />

            {/* Ride Access Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RIDE ACCESS</Text>

              {!entitlements && !loading && (
                <Text style={styles.warningText}>No ride access data found.</Text>
              )}

              {entitlements && (
                <View>
                  {[
                    { label: 'Short Ride', key: 'short' },
                    { label: 'Long Ride', key: 'long' },
                    { label: 'One Way', key: 'one_way' },
                    { label: 'Two Way', key: 'two_way' },
                  ].map((item) => {
                    const data = entitlements[item.key];
                    const isDisabled = updating || isRideActive || !isOnline;
                    
                    return (
                      <View key={item.key} style={styles.serviceRow}>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceName}>{item.label}</Text>
                        </View>
                        <View>
                          <Switch
                            value={isOnline ? data.enabled : false}
                            onValueChange={(val) => handleToggleEntitlement(item.key, val)}
                            disabled={isDisabled}
                            trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
                            thumbColor={isOnline && data.enabled ? '#059669' : '#f8fafc'}
                            style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sidebar: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    height: '100%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  closeButton: {
    padding: 4,
  },
  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#475569',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 16,
  },
  vehicleList: {
    gap: 16,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabledRow: {
    opacity: 0.5,
  },
  vehicleIconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    marginLeft: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#059669',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#059669',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  serviceInfo: {
    flex: 1,
    paddingRight: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 13,
    color: '#64748b',
  },
  warningText: {
    marginTop: 16,
    fontSize: 12,
    color: '#ef4444',
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  retryText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  }
});

export default DriverSidebarModal;
