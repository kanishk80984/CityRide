import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { DriverRootStackParamList } from '../../navigation/DriverNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

type KycStatusScreenProps = {
  navigation: NativeStackNavigationProp<DriverRootStackParamList, 'KycStatus'>;
  route: RouteProp<DriverRootStackParamList, 'KycStatus'>;
};

import api from '../../services/api';

const KycStatusScreen: React.FC<KycStatusScreenProps> = ({ navigation, route }) => {
  const initialStatus = route.params?.status || 'PENDING';
  const initialReason = route.params?.reason || '';

  const [status, setStatus] = useState(initialStatus);
  const [reason, setReason] = useState(initialReason);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('driverUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        const response = await api.get(`/api/driver/status/${user.id}`);
        const data = response.data;

        if (data.success) {
          const newStatus = data.data.kyc_status;
          setStatus(newStatus);
          setReason(data.data.rejection_reason || '');

          // Update local storage
          user.kyc_status = newStatus;
          await AsyncStorage.setItem('driverUser', JSON.stringify(user));

          if (newStatus === 'APPROVED') {
            navigation.replace('MainTabs');
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch status', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('driverToken');
    await AsyncStorage.removeItem('driverUser');
    navigation.replace('Login');
  };

  const handleReapply = () => {
    navigation.replace('Onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Eagle Fly</Text>
        
        {status === 'PENDING' ? (
          <View style={styles.card}>
            <Text style={[styles.statusText, { color: '#f59e0b' }]}>Application Under Review</Text>
            <Text style={styles.message}>
              Thank you for submitting your driver application. Please wait 24hr for our onboarding team to verify your documents and approve your account.
            </Text>
            
            <TouchableOpacity style={styles.refreshBtn} onPress={checkStatus} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.refreshBtnText}>Check Status</Text>}
            </TouchableOpacity>
          </View>
        ) : status === 'REJECTED' ? (
          <View style={styles.card}>
            <Text style={[styles.statusText, { color: '#ef4444' }]}>Application Rejected</Text>
            <Text style={styles.message}>
              {reason || 'Your application was rejected. Please try again with another vehicle.'}
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleReapply}>
              <Text style={styles.primaryButtonText}>Re-apply Now</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#11704B', marginBottom: 40, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 25, borderRadius: 12, elevation: 2, alignItems: 'center' },
  statusText: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  message: { fontSize: 16, color: '#4b5563', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  primaryButton: { backgroundColor: '#11704B', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, marginTop: 10 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  refreshBtn: { backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, marginTop: 10, width: '100%', alignItems: 'center' },
  refreshBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { marginTop: 30, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '500' }
});

export default KycStatusScreen;
