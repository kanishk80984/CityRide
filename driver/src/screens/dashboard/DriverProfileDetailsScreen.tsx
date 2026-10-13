import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, User, Phone, Mail, MapPin, Camera, X } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import api from '../../services/api';
import { getApiUrl } from '../../config/url';

const DriverProfileDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const [driverUser, setDriverUser] = useState<any>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    profile_image: null as any
  });
  const [loading, setLoading] = useState(false);

  // OTP Modal
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('driverUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        setDriverUser(user);
        setEditForm({
          name: user.name || '',
          phone: user.phone || '',
          email: user.email || '',
          city: user.city || '',
          profile_image: null
        });
      }
    } catch (e) {
      console.log('Error loading user in settings', e);
    }
  };

  const handleSelectImage = async () => {
    if (!isEditing) return;
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8
      });
      if (!result.didCancel && result.assets && result.assets.length > 0) {
        setEditForm({ ...editForm, profile_image: result.assets[0] });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSendOtp = () => {
    if (!editForm.phone.trim() || editForm.phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number.');
      return;
    }
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    setEnteredOtp('');
    setOtpModalVisible(true);
    Alert.alert('OTP Sent', `Your OTP to update phone number is: ${otp}`);
  };

  const handleSave = () => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      Alert.alert('Error', 'Name and Phone number are required.');
      return;
    }

    if (editForm.phone !== driverUser?.phone) {
      Alert.alert('Verification Required', 'Please tap "Send OTP" next to your phone number to verify it first.');
    } else {
      updateProfile();
    }
  };

  const handleVerifyOtp = () => {
    if (enteredOtp === generatedOtp) {
      setOtpModalVisible(false);
      updateProfile();
    } else {
      Alert.alert('Error', 'Please try again later', [{ text: 'OK' }]);
      setOtpModalVisible(false);
      // Reset phone number to original
      setEditForm({ ...editForm, phone: driverUser?.phone || '' });
    }
  };

  const updateProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('driverToken');
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('phone', editForm.phone);
      formData.append('email', editForm.email);
      formData.append('city', editForm.city);

      if (editForm.profile_image) {
        formData.append('profile_image', {
          uri: editForm.profile_image.uri,
          type: editForm.profile_image.type || 'image/jpeg',
          name: editForm.profile_image.fileName || 'profile.jpg'
        } as any);
      }

      const response = await api.put('/api/driver/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      if (data.success) {
        Alert.alert('Success', 'Profile updated successfully');
        const updatedUser = { ...driverUser, ...data.data };
        setDriverUser(updatedUser);
        await AsyncStorage.setItem('driverUser', JSON.stringify(updatedUser));
        setIsEditing(false);
        setEditForm({ ...editForm, profile_image: null });
      } else {
        Alert.alert('Error', data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.log('Update profile error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const getProfileImageSource = () => {
    if (editForm.profile_image) {
      return { uri: editForm.profile_image.uri };
    }
    if (driverUser?.profile_image) {
      if (driverUser.profile_image.startsWith('http')) {
        return { uri: driverUser.profile_image };
      }
      return { uri: getApiUrl(`/uploads/${driverUser.profile_image}`) };
    }
    return { uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }; // fallback
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Details</Text>
        <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
          {loading ? (
            <ActivityIndicator color="#059669" size="small" />
          ) : (
            <Text style={{ color: '#059669', fontWeight: 'bold', fontSize: 16 }}>
              {isEditing ? 'Save' : 'Edit'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* Profile Image Section */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={handleSelectImage} disabled={!isEditing} style={styles.profileImageWrapper}>
            <Image 
              source={getProfileImageSource()} 
              style={styles.profileImage}
              defaultSource={{ uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
            />
            {isEditing && (
              <View style={styles.cameraIconContainer}>
                <Camera size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <User size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              {isEditing ? (
                <TextInput 
                  style={styles.inputField}
                  value={editForm.name}
                  onChangeText={(txt) => setEditForm({...editForm, name: txt})}
                />
              ) : (
                <Text style={styles.infoValue}>{driverUser?.name}</Text>
              )}
            </View>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Phone size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              {isEditing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput 
                    style={[styles.inputField, { flex: 1, marginRight: 10 }]}
                    value={editForm.phone}
                    keyboardType="phone-pad"
                    onChangeText={(txt) => setEditForm({...editForm, phone: txt})}
                  />
                  {editForm.phone !== driverUser?.phone && editForm.phone.length >= 10 && (
                    <TouchableOpacity onPress={handleSendOtp} style={{ backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Send OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.infoValue}>{driverUser?.phone}</Text>
              )}
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Mail size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email ID</Text>
              {isEditing ? (
                <TextInput 
                  style={styles.inputField}
                  value={editForm.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(txt) => setEditForm({...editForm, email: txt})}
                />
              ) : (
                <Text style={styles.infoValue}>{driverUser?.email}</Text>
              )}
            </View>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MapPin size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>City</Text>
              {isEditing ? (
                <TextInput 
                  style={styles.inputField}
                  value={editForm.city}
                  onChangeText={(txt) => setEditForm({...editForm, city: txt})}
                />
              ) : (
                <Text style={styles.infoValue}>{driverUser?.city}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Vehicle Information */}
        <Text style={styles.sectionTitle}>Vehicle Information (Read Only)</Text>
        <View style={styles.infoBox}>
          <View style={styles.vehicleRow}>
            <View style={styles.vehicleImageWrapper}>
              <Image 
                source={
                  (driverUser?.vehicle_category || '').toLowerCase() === 'auto' 
                    ? require('../../assets/images/auto.png') 
                    : (driverUser?.vehicle_category || '').toLowerCase() === 'bike'
                    ? { uri: 'https://cdn-icons-png.flaticon.com/512/3721/3721619.png' }
                    : { uri: 'https://cdn-icons-png.flaticon.com/512/741/741407.png' }
                } 
                style={styles.vehicleImage} 
                resizeMode="contain"
              />
            </View>
            <View style={styles.vehicleContent}>
              <Text style={styles.infoLabel}>{driverUser?.make ? `${driverUser.make} ${driverUser.model}` : 'TVS Apache RTR 160'}</Text>
              <Text style={styles.infoValue}>{driverUser?.registration_number || 'TN 33 AB 1234'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Modal */}
      {otpModalVisible && (
        <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
            <View style={styles.otpModalContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={styles.modalTitle}>Verify Phone Number</Text>
                <TouchableOpacity onPress={() => setOtpModalVisible(false)}>
                  <X size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
                Enter the OTP sent to {editForm.phone}
              </Text>
              <TextInput 
                style={styles.otpInput}
                placeholder="Enter 4-digit OTP"
                keyboardType="number-pad"
                maxLength={4}
                value={enteredOtp}
                onChangeText={setEnteredOtp}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyOtp}>
                <Text style={styles.verifyBtnText}>Verify & Save</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },
  profileImageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: 'relative',
    backgroundColor: '#f3f4f6'
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#059669',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  infoBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  infoContent: {
    flex: 1,
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  inputField: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    padding: 0,
    margin: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#059669',
    paddingBottom: 2
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  vehicleImageWrapper: {
    width: 80,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  vehicleImage: {
    width: 80,
    height: 50,
  },
  vehicleContent: {
    flex: 1,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    elevation: 10
  },
  otpModalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827'
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 20,
    color: '#111827'
  },
  verifyBtn: {
    backgroundColor: '#059669',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  verifyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});

export default DriverProfileDetailsScreen;
