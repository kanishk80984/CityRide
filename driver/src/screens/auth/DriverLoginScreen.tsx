import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert, 
  ActivityIndicator,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DriverRootStackParamList } from '../../navigation/DriverNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';

type DriverLoginScreenProps = {
  navigation: NativeStackNavigationProp<DriverRootStackParamList, 'Login'>;
};

const { width, height } = Dimensions.get('window');

const DriverLoginScreen: React.FC<DriverLoginScreenProps> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (phone.length < 10) {
      Alert.alert('Invalid', 'Enter valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/auth/request-otp', { phone, role: 'DRIVER' });
      const res = response.data;
      
      if (res.success) {
        Alert.alert('OTP Received', `Your Driver OTP is: ${res.data.otp}`);
        setStep(2);
      } else {
        Alert.alert('Error', res.message || 'Failed to request OTP');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      Alert.alert('Invalid', 'Enter valid 4-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/auth/verify-otp', { phone, otp, role: 'DRIVER' });
      const res = response.data;
      
      if (res.success) {
        await AsyncStorage.setItem('driverToken', res.data.token);
        await AsyncStorage.setItem('driverUser', JSON.stringify(res.data.user));
        
        const kyc = res.data.user.kyc_status;
        const name = res.data.user.name;
        
        if (name === 'New Driver' || !kyc) {
          navigation.replace('Onboarding');
        } else if (kyc === 'APPROVED') {
          navigation.replace('MainTabs');
        } else {
          navigation.replace('KycStatus', { status: kyc, reason: res.data.user.rejection_reason });
        }
      } else {
        Alert.alert('Error', res.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.imageContainer}>
        <Image 
          source={require('../../assets/images/hero_image.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.topSection}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>City Ride Driver</Text>
              <Text style={styles.subtitle}>Login to start earning</Text>
              
              <View style={styles.accentContainer}>
                <View style={styles.accentGreen} />
                <View style={styles.accentYellow} />
              </View>
            </View>

            <View style={styles.formContainer}>
              {step === 1 ? (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.phoneIcon}>📱</Text>
                    <View style={styles.divider} />
                    <Text style={styles.countryCode}>+91</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your mobile number"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                      maxLength={10}
                    />
                  </View>
                  <TouchableOpacity style={styles.button} onPress={handleRequestOtp} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>Get OTP</Text>
                        <Text style={styles.buttonArrow}>→</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.phoneIcon}>🔒</Text>
                    <View style={styles.divider} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 4-Digit OTP"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={setOtp}
                      maxLength={4}
                    />
                  </View>
                  <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>Verify & Login</Text>
                        <Text style={styles.buttonArrow}>→</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.resendBtn} onPress={() => setStep(1)}>
                    <Text style={styles.resendText}>Change Phone Number</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
    zIndex: 2,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: height * 0.18,
    zIndex: 10,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0D6E43', // Deep Green
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280', // Medium Gray
    marginBottom: 16,
    textAlign: 'center',
  },
  accentContainer: {
    flexDirection: 'row',
    height: 4,
    width: 60,
    borderRadius: 2,
    overflow: 'hidden',
  },
  accentGreen: {
    flex: 1,
    backgroundColor: '#0D6E43',
  },
  accentYellow: {
    flex: 1,
    backgroundColor: '#FACC15', // Yellow
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    height: 60,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  phoneIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    height: '100%',
  },
  button: {
    backgroundColor: '#0D6E43',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0D6E43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  buttonArrow: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  resendBtn: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    color: '#0D6E43',
    fontSize: 15,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: height * 0.45,
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
});

export default DriverLoginScreen;
