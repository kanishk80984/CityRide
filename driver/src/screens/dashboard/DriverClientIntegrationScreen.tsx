import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Briefcase, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiUrl } from '../../config/url';

const DriverClientIntegrationScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [integration, setIntegration] = useState<any>(null);
  
  // Form states
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [purpose, setPurpose] = useState('LINK'); // LINK, UPDATE, REMOVE
  const [testOtp, setTestOtp] = useState('');

  useEffect(() => {
    fetchIntegrationStatus();
  }, []);

  const fetchIntegrationStatus = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('driverToken');
      const response = await fetch(getApiUrl('/api/driver/client'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setIntegration(data.data.integrated ? data.data : null);
      }
    } catch (e) {
      console.log('Error fetching integration', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRequest = async (requestPurpose: string) => {
    if ((requestPurpose === 'LINK' || requestPurpose === 'UPDATE') && (!clientId || !clientSecret)) {
      Alert.alert('Error', 'Please enter Client ID and Secret');
      return;
    }

    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('driverToken');
      const endpoint = requestPurpose === 'REMOVE' ? '/api/driver/client/remove-request' : '/api/driver/client/verify';
      
      const payload: any = { purpose: requestPurpose };
      if (requestPurpose !== 'REMOVE') {
        payload.client_id = clientId.trim();
        payload.client_secret = clientSecret;
      }

      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.success) {
        setPurpose(requestPurpose);
        setOtpMode(true);
        if (data.data?.devOtp) {
          setTestOtp(data.data.devOtp);
        }
        if (requestPurpose === 'REMOVE') {
           setClientId(data.data?.client_id || integration?.client_id);
        }
        Alert.alert('OTP Sent', data.message);
      } else {
        Alert.alert('Error', data.message || 'Verification failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('driverToken');
      const response = await fetch(getApiUrl('/api/driver/client/verify-otp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          client_id: clientId,
          otp: otp.trim(),
          purpose: purpose
        })
      });
      
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Integration updated successfully');
        setOtpMode(false);
        setOtp('');
        setTestOtp('');
        setClientSecret('');
        setClientId('');
        fetchIntegrationStatus();
      } else {
        Alert.alert('Error', data.message || 'Invalid OTP');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Integration</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {integration && !otpMode && (
          <View style={styles.verifiedCard}>
            <View style={styles.verifiedHeader}>
              <CheckCircle2 size={24} color="#059669" />
              <Text style={styles.verifiedTitle}>Owner Verified</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Client ID:</Text>
              <Text style={styles.detailValue}>{integration.client_id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>{integration.status}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.btn, styles.removeBtn]} 
              onPress={() => {
                Alert.alert(
                  'Remove Integration',
                  'Are you sure you want to remove this Owner connection? OTP verification required.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', onPress: () => handleVerifyRequest('REMOVE'), style: 'destructive' }
                  ]
                );
              }}
            >
              <Text style={styles.removeBtnText}>Remove Integration</Text>
            </TouchableOpacity>
          </View>
        )}

        {(!integration || otpMode || purpose === 'UPDATE') && (
          <View style={styles.formCard}>
            {!otpMode ? (
              <>
                <Text style={styles.formTitle}>
                  {integration ? 'Update Integration' : 'Link Owner'}
                </Text>
                
                <Text style={styles.label}>Client ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. EAGLE-OWNER-001"
                  value={clientId}
                  onChangeText={setClientId}
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.label}>Client Secret</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter secret provided by owner"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={clientSecret}
                  onChangeText={setClientSecret}
                />

                <TouchableOpacity 
                  style={styles.btn} 
                  onPress={() => handleVerifyRequest(integration ? 'UPDATE' : 'LINK')}
                  disabled={processing}
                >
                  {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.formTitle}>Verify Owner Phone</Text>
                <Text style={styles.subtitle}>An OTP has been sent to the registered Owner phone number.</Text>
                
                {testOtp ? (
                  <View style={styles.testOtpBox}>
                    <Text style={styles.testOtpLabel}>TEST MODE OTP:</Text>
                    <Text style={styles.testOtpValue}>{testOtp}</Text>
                  </View>
                ) : null}

                <Text style={styles.label}>Enter OTP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                  maxLength={6}
                  placeholderTextColor="#9CA3AF"
                />

                <TouchableOpacity 
                  style={styles.btn} 
                  onPress={handleVerifyOtp}
                  disabled={processing}
                >
                  {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify OTP</Text>}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => {
                    setOtpMode(false);
                    setTestOtp('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 5, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  scrollContent: { padding: 20 },
  verifiedCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#D1FAE5' },
  verifiedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  verifiedTitle: { fontSize: 18, fontWeight: 'bold', color: '#064E3B', marginLeft: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { fontSize: 15, color: '#4B5563' },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 15 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, color: '#000000' },
  btn: { backgroundColor: '#059669', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  removeBtn: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, marginTop: 15 },
  removeBtnText: { color: '#DC2626', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { padding: 15, alignItems: 'center', marginTop: 10 },
  cancelBtnText: { color: '#4B5563', fontSize: 16, fontWeight: '600' },
  testOtpBox: { backgroundColor: '#FEF3C7', padding: 15, borderRadius: 8, marginBottom: 15, alignItems: 'center' },
  testOtpLabel: { fontSize: 12, color: '#92400E', fontWeight: 'bold' },
  testOtpValue: { fontSize: 24, fontWeight: 'bold', color: '#B45309', marginTop: 5, letterSpacing: 2 }
});

export default DriverClientIntegrationScreen;
