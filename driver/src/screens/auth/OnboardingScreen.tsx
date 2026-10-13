import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DriverRootStackParamList } from '../../navigation/DriverNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  User, CreditCard, Camera, CarFront, Bike,
  Hash, Truck, Box, Palette, FileText, CheckCircle2,
  ArrowRight, ArrowLeft, ShieldCheck, X
} from 'lucide-react-native';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<DriverRootStackParamList, 'Onboarding'>;
};

import api from '../../services/api';

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [userId, setUserId] = useState<number | null>(null);

  // Steps state: 1, 2, or 3
  const [step, setStep] = useState(1);

  // Form states
  const [driverName, setDriverName] = useState('');
  const [drivingLicence, setDrivingLicence] = useState('');

  const [vehicleTypeId, setVehicleTypeId] = useState('3'); // 1=Bike, 2=Auto, 3=Car
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [make, setMake] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');

  const [images, setImages] = useState<Record<string, any>>({
    licence_photo: null,
    rc_photo: null,
    photo_front: null,
    photo_back: null,
    photo_left: null,
    photo_right: null,
  });

  const [loading, setLoading] = useState(false);
  const [keyboardSpace, setKeyboardSpace] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardSpace(Platform.OS === 'android' ? 350 : e.endCoordinates.height + 100);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardSpace(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const userStr = await AsyncStorage.getItem('driverUser');
      if (userStr) {
        setUserId(JSON.parse(userStr).id);
      }
    };
    loadUser();
  }, []);

  const pickImage = async (field: string) => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.7,
      selectionLimit: 1
    });

    if (!result.didCancel && result.assets && result.assets.length > 0) {
      setImages(prev => ({ ...prev, [field]: result.assets![0] }));
    }
  };

  const removeImage = (field: string) => {
    setImages(prev => ({ ...prev, [field]: null }));
  };

  const validateStep1 = () => {
    if (!driverName || !drivingLicence || !images.licence_photo) {
      Alert.alert('Missing Info', 'Please fill all details and upload your Driving Licence.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!vehicleTypeId || !registrationNumber || !make || !vehicleName || !model || !color) {
      Alert.alert('Missing Info', 'Please fill all vehicle details.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    const requiredPhotos = ['rc_photo', 'photo_front', 'photo_back', 'photo_left', 'photo_right'];
    for (const p of requiredPhotos) {
      if (!images[p]) {
        Alert.alert('Missing Photo', `Please upload ${p.replace('_', ' ')}.`);
        return;
      }
    }

    if (!userId) {
      Alert.alert('Error', 'User session missing.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('userId', String(userId));
      if (driverName) formData.append('name', driverName);
      formData.append('driving_licence', drivingLicence);
      formData.append('vehicle_type_id', vehicleTypeId);
      formData.append('registration_number', registrationNumber);
      formData.append('make', make);
      formData.append('model', `${vehicleName} (${model})`);
      formData.append('color', color);

      const allPhotos = ['licence_photo', ...requiredPhotos];
      allPhotos.forEach(field => {
        const asset = images[field];
        const localUri = asset.uri;
        const filename = localUri.split('/').pop() || 'photo.jpg';
        const type = asset.type || 'image/jpeg';

        formData.append(field, {
          uri: localUri,
          name: filename,
          type: type,
        } as any);
      });

      const response = await api.post('/api/driver/onboard', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const res = response.data;

      if (res.success) {
        const userStr = await AsyncStorage.getItem('driverUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.kyc_status = 'PENDING';
          await AsyncStorage.setItem('driverUser', JSON.stringify(user));
        }
        navigation.replace('KycStatus', { status: 'PENDING' });
      } else {
        Alert.alert('Error', res.message || 'Failed to submit application');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error. Could not submit.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // ---------------- UI COMPONENTS ----------------

  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      <View style={styles.stepperLine} />
      <View style={styles.stepWrapper}>
        <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
          <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
        </View>
        <Text style={styles.stepText}>Personal Info</Text>
      </View>
      <View style={styles.stepWrapper}>
        <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
          <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
        </View>
        <Text style={styles.stepText}>Vehicle Info</Text>
      </View>
      <View style={styles.stepWrapper}>
        <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
          <Text style={[styles.stepNumber, step >= 3 && styles.stepNumberActive]}>3</Text>
        </View>
        <Text style={styles.stepText}>Documents</Text>
      </View>
    </View>
  );

  const renderHeaderCard = (icon: any, title: string, subtitle: string) => (
    <View style={styles.headerCard}>
      {icon}
      <View style={{ flex: 1, marginLeft: icon ? 10 : 0 }}>
        <Text style={styles.headerCardTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderInput = (label: string, icon: any, placeholder: string, value: string, setter: any, type: any = 'default') => (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <View style={styles.inputIcon}>{icon}</View>
        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={setter}
          keyboardType={type}
        />
      </View>
    </View>
  );

  const renderImageUpload = (field: string, label: string, small: boolean = false) => {
    const isUploaded = !!images[field];

    if (isUploaded) {
      const asset = images[field];
      const filename = asset.uri.split('/').pop() || 'document.jpg';
      const sizeMB = asset.fileSize ? (asset.fileSize / (1024 * 1024)).toFixed(1) : '2.4'; // mock size if undefined

      return (
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>{label}</Text>
          <View style={styles.uploadedFileCard}>
            <Image source={{ uri: asset.uri }} style={styles.uploadedFileThumb} />
            <View style={styles.uploadedFileInfo}>
              <Text style={styles.uploadedFileName} numberOfLines={1}>{filename}</Text>
              <Text style={styles.uploadedFileSize}>{sizeMB} MB</Text>
            </View>
            <CheckCircle2 size={24} color="#11704B" style={{ marginRight: 10 }} />
            <TouchableOpacity onPress={() => removeImage(field)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.inputWrapper, small && { flex: 1 }]}>
        <Text style={[styles.inputLabel, { display: 'flex', alignItems: 'center' }]}>
          {small && <CarFront size={16} color="#333" style={{ marginRight: 5 }} />} {label}
        </Text>
        <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage(field)}>
          <Camera size={32} color="#11704B" />
          <Text style={styles.uploadMainText}>Tap to upload {small ? '' : label.toLowerCase()}</Text>
          <Text style={styles.uploadSubText}>JPG, PNG or PDF (Max 5 MB)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ---------------- STEPS ----------------

  const renderStep1 = () => (
    <View>
      {renderHeaderCard(
        <CreditCard size={40} color="#11704B" />,
        "Complete Your Profile",
        "Upload your documents to start driving with us."
      )}

      <View style={styles.sectionHeader}>
        <User size={20} color="#11704B" />
        <Text style={styles.sectionTitle}>Driver Details</Text>
      </View>
      <Text style={styles.sectionSubtitle}>Please enter your basic information</Text>

      {renderInput("Full Name", <User size={20} color="#666" />, "e.g. John Doe", driverName, setDriverName)}
      {renderInput("Driving Licence Number", <CreditCard size={20} color="#666" />, "e.g. TN-33-AB-2026", drivingLicence, setDrivingLicence)}
      {renderImageUpload("licence_photo", "Driving Licence Photo")}
    </View>
  );

  const renderStep2 = () => (
    <View>
      {renderHeaderCard(
        null,
        "Vehicle Details",
        "Tell us about your vehicle"
      )}

      {/* <View style={styles.sectionHeader}>
        <ShieldCheck size={20} color="#11704B" />
        <Text style={styles.sectionTitle}>Select Vehicle Type</Text>
      </View> */}

      <View style={styles.radioGroup}>
        <TouchableOpacity style={[styles.radioBtn, vehicleTypeId === '3' && styles.radioBtnActive]} onPress={() => setVehicleTypeId('3')}>
          <Image source={require('../../assets/images/car-1.png')} style={{ width: 59, height: 59, resizeMode: 'contain', marginBottom: -9, marginTop: -8 }} />
          <Text style={[styles.radioText, vehicleTypeId === '3' && styles.radioTextActive]}>Car</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.radioBtn, vehicleTypeId === '2' && styles.radioBtnActive]} onPress={() => setVehicleTypeId('2')}>
          <Image source={require('../../assets/images/rickshaw-1.png')} style={{ width: 45, height: 45, resizeMode: 'contain' }} />
          <Text style={[styles.radioText, vehicleTypeId === '2' && styles.radioTextActive]}>Auto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.radioBtn, vehicleTypeId === '1' && styles.radioBtnActive]} onPress={() => setVehicleTypeId('1')}>
          <Image source={require('../../assets/images/bike-1.png')} style={{ width: 45, height: 45, resizeMode: 'contain' }} />
          <Text style={[styles.radioText, vehicleTypeId === '1' && styles.radioTextActive]}>Bike</Text>
        </TouchableOpacity>
      </View>

      {renderInput("Registration Number", <Hash size={20} color="#666" />, "e.g. TN-33-IT-2026", registrationNumber, setRegistrationNumber)}
      {renderInput("Vehicle Brand", <CarFront size={20} color="#666" />, "e.g. TVS", make, setMake)}
      {renderInput("Vehicle Name", <CarFront size={20} color="#666" />, "e.g. Apache, Swift", vehicleName, setVehicleName)}
      {renderInput("Model (Year)", <Box size={20} color="#666" />, "e.g. 2026", model, setModel, "numeric")}
      {renderInput("Vehicle Color", <Palette size={20} color="#666" />, "e.g. White", color, setColor)}
    </View>
  );

  const renderStep3 = () => (
    <View>
      {renderHeaderCard(
        null,
        "Upload Vehicle Photos",
        "Upload clear photos of your vehicle from all sides"
      )}

      <View style={styles.sectionHeader}>
        <FileText size={20} color="#11704B" />
        <Text style={styles.sectionTitle}>RC Document Photo</Text>
      </View>
      {renderImageUpload("rc_photo", "")}

      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <CarFront size={20} color="#11704B" />
        <Text style={styles.sectionTitle}>Vehicle Photos</Text>
      </View>
      <Text style={[styles.sectionSubtitle, { marginBottom: 15 }]}>Upload clear photos of your vehicle from all sides</Text>

      <View style={styles.rowGrid}>
        {renderImageUpload("photo_front", "Front View", true)}
        <View style={{ width: 15 }} />
        {renderImageUpload("photo_back", "Back View", true)}
      </View>
      <View style={[styles.rowGrid, { marginTop: 15 }]}>
        {renderImageUpload("photo_left", "Left View", true)}
        <View style={{ width: 15 }} />
        {renderImageUpload("photo_right", "Right View", true)}
      </View>

      <View style={styles.instructionsBox}>
        <View style={styles.instructionsHeader}>
          <ShieldCheck size={20} color="#11704B" />
          <Text style={styles.instructionsTitle}>Make sure the photos are clear</Text>
        </View>
        {[
          'Vehicle number plate should be visible',
          'Good lighting conditions',
          'No blurry images',
          'Supported formats: JPG, PNG (Max 5 MB each)'
        ].map((item, idx) => (
          <View key={idx} style={styles.instructionItem}>
            <CheckCircle2 size={16} color="#11704B" />
            <Text style={styles.instructionText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderStepper()}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(styles.scrollContent.paddingBottom, keyboardSpace) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <View style={styles.bottomNav}>
            {step > 1 && (
              <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                <ArrowLeft size={20} color="#333" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity style={styles.continueBtn} onPress={handleNext}>
                <Text style={styles.continueBtnText}>Continue</Text>
                <ArrowRight size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.continueBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.continueBtnText}>Submit Application</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Stepper
  stepperContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, paddingTop: 20, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#eee' },
  stepperLine: { position: 'absolute', top: 35, left: 50, right: 50, height: 2, backgroundColor: '#fada8bff' },
  stepWrapper: { alignItems: 'center', zIndex: 2 },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { borderColor: '#e4c77fff', backgroundColor: '#f5bd30ee' },
  stepNumber: { fontSize: 14, fontWeight: 'bold', color: '#ccc' },
  stepNumberActive: { color: '#000' },
  stepText: { fontSize: 12, color: '#333', marginTop: 5, fontWeight: '500' },

  // Header Card
  headerCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  headerIconWrapper: { width: 60, height: 60, backgroundColor: '#d1f4e0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  checkBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#fff', borderRadius: 10 },
  headerCardTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerCardSub: { fontSize: 13, color: '#555', lineHeight: 18 },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  sectionSubtitle: { fontSize: 13, color: '#666', marginBottom: 15, marginLeft: 28 },

  // Inputs
  inputWrapper: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 15, backgroundColor: '#fdfdfd' },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, paddingVertical: 15, fontSize: 15, color: '#000' },

  // Radio Buttons
  radioGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, gap: 10 },
  radioBtn: { flex: 1, paddingVertical: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, alignItems: 'center', backgroundColor: '#fff' },
  radioBtnActive: { borderColor: '#11704B', backgroundColor: '#f0fcf5' },
  radioText: { color: '#666', fontSize: 14, fontWeight: '600', marginTop: 8 },
  radioTextActive: { color: '#11704B' },

  // Uploads
  uploadBox: { height: 140, borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  uploadMainText: { color: '#333', fontSize: 14, fontWeight: '600', marginTop: 10 },
  uploadSubText: { color: '#888', fontSize: 12, marginTop: 5 },

  // Uploaded File state
  uploadedFileCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, backgroundColor: '#fdfdfd' },
  uploadedFileThumb: { width: 50, height: 40, borderRadius: 6, marginRight: 15 },
  uploadedFileInfo: { flex: 1 },
  uploadedFileName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  uploadedFileSize: { fontSize: 12, color: '#666' },

  rowGrid: { flexDirection: 'row', justifyContent: 'space-between' },

  // Instructions
  instructionsBox: { backgroundColor: '#f0fcf5', borderRadius: 12, padding: 15, marginTop: 10 },
  instructionsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  instructionsTitle: { fontSize: 15, fontWeight: 'bold', color: '#11704B', marginLeft: 8 },
  instructionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  instructionText: { fontSize: 13, color: '#555', marginLeft: 10, flex: 1 },

  // Bottom Nav
  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30 },
  backBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, backgroundColor: '#f1f1f1', borderRadius: 10, marginRight: 15 },
  backBtnText: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 5 },
  continueBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, backgroundColor: '#11704B', borderRadius: 10 },
  continueBtnText: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginRight: 5 }
});

export default OnboardingScreen;
