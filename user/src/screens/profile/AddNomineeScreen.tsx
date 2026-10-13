import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setAuth } from '../../store/authSlice';
import apiClient from '../../services/apiClient';
import { launchImageLibrary } from 'react-native-image-picker';

const AddNomineeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const existingNominee = user?.nominee_details ? JSON.parse(user.nominee_details) : null;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: existingNominee?.name || '',
    address: existingNominee?.address || '',
    phone: existingNominee?.phone || '',
    aadhar_number: existingNominee?.aadhar_number || '',
    aadhar_front_image: existingNominee?.aadhar_front_image || '',
    aadhar_back_image: existingNominee?.aadhar_back_image || '',
  });

  const pickImage = async (field: 'aadhar_front_image' | 'aadhar_back_image') => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      });

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Calculate file size. If fileSize is undefined, estimate from base64 length.
        const fileSize = asset.fileSize || (asset.base64 ? Math.round((asset.base64.length * 3) / 4) : 0);

        if (fileSize > 90 * 1024) {
          Alert.alert('Error', 'Image size must be less than 90KB. Please compress the image before uploading.');
          return;
        }

        if (asset.base64) {
          const base64Image = `data:${asset.type};base64,${asset.base64}`;
          setFormData(prev => ({ ...prev, [field]: base64Image }));
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert('Error', 'Could not select image.');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone || !formData.aadhar_number) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!formData.aadhar_front_image || !formData.aadhar_back_image) {
      Alert.alert('Error', 'Please upload both front and back images of your Aadhar card.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nominee_details: JSON.stringify(formData)
      };

      const res = await apiClient.put('/users/me', payload);

      if (token) {
        dispatch(setAuth({ user: res.data.data.user, token }));
      }

      Alert.alert('Success', 'Nominee details saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save nominee details');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (icon: string, label: string, value: string, placeholder: string, onChangeText: (val: string) => void, keyboardType: any = 'default', isRequired: boolean = false) => (
    <View style={styles.fieldContainer}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={24} color="#666" />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{label} {isRequired && <Text style={{ color: 'red' }}>*</Text>}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );

  const renderImageUpload = (field: 'aadhar_front_image' | 'aadhar_back_image', label: string) => (
    <View style={styles.imageUploadContainer}>
      <Text style={styles.imageUploadLabel}>{label}</Text>
      <TouchableOpacity style={styles.imageUploadBox} onPress={() => pickImage(field)}>
        {formData[field] ? (
          <Image source={{ uri: formData[field] }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="camera-plus" size={32} color="#9ca3af" />
            <Text style={styles.imagePlaceholderText}>Upload Image</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nominee Details</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionDesc}>
            Add a nominee for your account. These details will be used in case of any emergencies or account recovery.
          </Text>

          {renderField('account-outline', 'Nominee Name', formData.name, 'Enter full name', (val) => setFormData({ ...formData, name: val }), 'default', true)}
          <View style={styles.divider} />

          {renderField('phone-outline', 'Phone Number', formData.phone, 'Enter phone number', (val) => setFormData({ ...formData, phone: val }), 'phone-pad', true)}
          <View style={styles.divider} />

          {renderField('map-marker-outline', 'Address', formData.address, 'Enter address', (val) => setFormData({ ...formData, address: val }))}
          <View style={styles.divider} />

          {renderField('card-account-details-outline', 'Aadhar Number', formData.aadhar_number, 'Enter 12-digit Aadhar', (val) => setFormData({ ...formData, aadhar_number: val }), 'numeric', true)}
          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Aadhar Verification</Text>
          <View style={styles.imagesRow}>
            {renderImageUpload('aadhar_front_image', 'Front Side')}
            <View style={{ width: 15 }} />
            {renderImageUpload('aadhar_back_image', 'Back Side')}
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save Nominee</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    color: '#111827',
    padding: 0,
    height: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 60,
  },
  imagesRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  imageUploadContainer: {
    flex: 1,
  },
  imageUploadLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  imageUploadBox: {
    height: 120,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveBtn: {
    backgroundColor: '#FDE047',
    borderRadius: 30,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddNomineeScreen;
