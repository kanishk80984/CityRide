import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Video from 'react-native-video';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useDispatch } from 'react-redux';
import { setAuth } from '../../store/authSlice';
import { setMapTheme, resetRide } from '../../store/rideSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../services/apiClient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const { height } = Dimensions.get('window');
const COLORS = {
  primary: '#11704B',
  bg: '#EAF5F0',
  textTitle: '#1A1A1A',
  textSub: '#757575',
  border: '#E0E0E0',
  white: '#FFFFFF'
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const { width, height: screenHeight } = useWindowDimensions();

  const handleRequestOtp = async () => {
    if (phone.length < 10) {
      Alert.alert('Invalid', 'Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/request-otp', { phone, role: 'USER' });
      Alert.alert('OTP Received', `Your OTP is: ${res.data.data.otp}`);
      setStep(2);
    } catch (error) {
      console.error('Request OTP Error', error);
      Alert.alert('Error', 'Failed to request OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      Alert.alert('Invalid', 'Please enter a valid 4-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-otp', { phone, otp, role: 'USER' });
      const { user, token } = res.data.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      dispatch(setAuth({ user, token }));

      // Ensure ride state is clean on fresh login
      dispatch(resetRide());

      // Hydrate mapTheme exactly like AppNavigator does
      try {
        const storedTheme = await AsyncStorage.getItem('mapTheme');
        if (storedTheme === 'dark') {
          dispatch(setMapTheme('dark'));
        } else {
          dispatch(setMapTheme('light'));
        }
      } catch (e) { }

      navigation.replace('Main');
    } catch (error: any) {
      console.error('Verify OTP Error', error);
      if (error.response && error.response.status === 400) {
        Alert.alert('Error', 'Invalid OTP entered. Try again.');
      } else {
        Alert.alert('Error', 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Video
        source={require('../../assets/images/video.mp4')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        repeat={true}
        muted={true}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.content}>
            {/* Form Section */}
            <View style={styles.formContainer}>
              {step === 1 ? (
                <>
                  <View style={styles.phoneInputContainer}>
                    <View style={styles.countryCode}>
                      {/* Fake Indian Flag */}
                      <View style={styles.flagPlaceholder}>
                        <View style={{ backgroundColor: '#FF9933', height: 6, width: '100%' }} />
                        <View style={{ backgroundColor: '#FFFFFF', height: 6, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                          <Icon name="circle-outline" size={6} color="#000080" />
                        </View>
                        <View style={{ backgroundColor: '#138808', height: 6, width: '100%' }} />
                      </View>
                      <Text style={styles.countryText}>+91</Text>
                      <Icon name="chevron-down" size={18} color={COLORS.textTitle} />
                    </View>
                    <View style={styles.inputDivider} />
                    <TextInput
                      style={styles.input}
                      placeholder="8008880808"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                      maxLength={10}
                    />
                    <TouchableOpacity onPress={handleRequestOtp} disabled={loading} style={styles.inlineArrowBtn}>
                      {loading ? (
                        <ActivityIndicator color={COLORS.primary} size="small" />
                      ) : (
                        <Icon name="arrow-right-circle" size={42} color="#12630ad8" />
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.phoneInputContainer}>
                    <TextInput
                      style={[styles.input, { textAlign: 'center', letterSpacing: otp.length > 0 ? 8 : 1, fontSize: otp.length > 0 ? 24 : 16, marginLeft: 0 }]}
                      placeholder="Enter OTP"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={setOtp}
                      maxLength={4}
                    />
                    <TouchableOpacity onPress={handleVerifyOtp} disabled={loading} style={styles.inlineArrowBtn}>
                      {loading ? (
                        <ActivityIndicator color={COLORS.primary} size="small" />
                      ) : (
                        <Icon name="check-circle" size={42} color="#12630ad8" />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.resendBtn} onPress={() => setStep(1)}>
                    <Text style={styles.resendText}>Change Phone Number</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: height * 0.25,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: height * 0.1,
    marginBottom: 40,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.textTitle,
    letterSpacing: 1
  },
  logoSubtitle: {
    fontSize: 12,
    color: COLORS.textSub,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: -2
  },
  formContainer: {
    width: '100%',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 60,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  flagPlaceholder: {
    width: 24,
    height: 18,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee'
  },
  countryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textTitle,
    marginRight: 5
  },
  inputDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 15
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textTitle
  },
  inlineArrowBtn: {
    padding: -0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 60,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold'
  },
  btnArrowCircle: {
    position: 'absolute',
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center'
  },
  resendBtn: {
    marginTop: 0,
    alignItems: 'center'
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold'
  }
});

export default LoginScreen;
