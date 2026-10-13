import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  PermissionsAndroid
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DriverRootStackParamList } from '../../navigation/DriverNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import {
  User,
  CreditCard,
  Camera,
  CarFront,
  Bike,
  Hash,
  Truck,
  Box,
  Palette,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  X,
  IdCard,
  Image as ImageIcon
} from 'lucide-react-native';
import api from '../../services/api';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<DriverRootStackParamList, 'Onboarding'>;
};

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [userId, setUserId] = useState<number | null>(null);

  // Steps state: 1, 2, or 3
  const [step, setStep] = useState(1);

  // Form states - Step 1: Personal & Identity Info
  const [driverName, setDriverName] = useState('');
  const [drivingLicence, setDrivingLicence] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Form states - Step 2: Vehicle Info
  const [vehicleTypeId, setVehicleTypeId] = useState('3'); // 1=Bike, 2=Auto, 3=Car
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [make, setMake] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');

  // Image assets
  const [images, setImages] = useState<Record<string, any>>({
    driver_photo: null,
    licence_photo: null,
    aadhar_photo: null,
    pan_photo: null,
    rc_photo: null,
    photo_front: null,
    photo_back: null,
    photo_left: null,
    photo_right: null,
  });

  // Modal Picker state (Camera vs Gallery)
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerField, setPickerField] = useState<string | null>(null);
  const [pickerLabel, setPickerLabel] = useState<string>('');

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
        const parsed = JSON.parse(userStr);
        setUserId(parsed.id);
        if (parsed.name && parsed.name !== 'New Driver') {
          setDriverName(parsed.name);
        }
      }
    };
    loadUser();
  }, []);

  const openPicker = (field: string, label: string) => {
    setPickerField(field);
    setPickerLabel(label);
    setPickerModalVisible(true);
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Eagle Fly requires camera access so you can take photos of your documents and profile.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Camera permission request error:', err);
      return false;
    }
  };

  const handleCameraLaunch = async () => {
    if (!pickerField) return;
    const targetField = pickerField;
    setPickerModalVisible(false);

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Camera permission is required to capture photos.');
      return;
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
        cameraType: targetField === 'driver_photo' ? 'front' : 'back',
      });

      if (!result.didCancel && result.assets && result.assets.length > 0) {
        setImages(prev => ({ ...prev, [targetField]: result.assets![0] }));
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Unable to launch camera.');
    }
  };

  const handleGalleryLaunch = async () => {
    if (!pickerField) return;
    const targetField = pickerField;
    setPickerModalVisible(false);

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.didCancel && result.assets && result.assets.length > 0) {
        setImages(prev => ({ ...prev, [targetField]: result.assets![0] }));
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Unable to open photos gallery.');
    }
  };

  const removeImage = (field: string) => {
    setImages(prev => ({ ...prev, [field]: null }));
  };

  const handleAadharChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 12);
    const chunks = digits.match(/.{1,4}/g);
    setAadharNumber(chunks ? chunks.join(' ') : digits);
  };

  const handlePanChange = (text: string) => {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setPanNumber(clean);
  };

  const validateStep1 = () => {
    if (!driverName.trim()) {
      Alert.alert('Missing Info', 'Please enter your Full Name.');
      return false;
    }
    if (!images.driver_photo) {
      Alert.alert('Missing Photo', 'Please upload your Driver Profile Photo.');
      return false;
    }
    if (!drivingLicence.trim()) {
      Alert.alert('Missing Info', 'Please enter your Driving Licence Number.');
      return false;
    }
    if (!images.licence_photo) {
      Alert.alert('Missing Photo', 'Please upload your Driving Licence Photo.');
      return false;
    }

    const cleanAadhar = aadharNumber.replace(/\s+/g, '');
    if (!cleanAadhar) {
      Alert.alert('Missing Info', 'Please enter your Aadhaar Card Number.');
      return false;
    }
    if (cleanAadhar.length !== 12) {
      Alert.alert('Invalid Aadhaar', 'Aadhaar Card number must be 12 digits.');
      return false;
    }
    if (!images.aadhar_photo) {
      Alert.alert('Missing Photo', 'Please upload your Aadhaar Card Photo.');
      return false;
    }

    const cleanPan = panNumber.trim().toUpperCase();
    if (!cleanPan) {
      Alert.alert('Missing Info', 'Please enter your PAN Card Number.');
      return false;
    }
    if (cleanPan.length !== 10) {
      Alert.alert('Invalid PAN', 'PAN Card number must be 10 characters (e.g. ABCDE1234F).');
      return false;
    }
    if (!images.pan_photo) {
      Alert.alert('Missing Photo', 'Please upload your PAN Card Photo.');
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
    const requiredVehiclePhotos = ['rc_photo', 'photo_front', 'photo_back', 'photo_left', 'photo_right'];
    for (const p of requiredVehiclePhotos) {
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
      formData.append('aadhar_number', aadharNumber.replace(/\s+/g, ''));
      formData.append('pan_number', panNumber.trim().toUpperCase());
      formData.append('vehicle_type_id', vehicleTypeId);
      formData.append('registration_number', registrationNumber);
      formData.append('make', make);
      formData.append('model', `${vehicleName} (${model})`);
      formData.append('color', color);

      const allPhotos = [
        'driver_photo',
        'licence_photo',
        'aadhar_photo',
        'pan_photo',
        ...requiredVehiclePhotos
      ];

      allPhotos.forEach(field => {
        const asset = images[field];
        if (asset && asset.uri) {
          const localUri = asset.uri;
          const filename = localUri.split('/').pop() || `${field}.jpg`;
          const type = asset.type || 'image/jpeg';

          formData.append(field, {
            uri: localUri,
            name: filename,
            type: type,
          } as any);
        }
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
      console.error('Submission error:', error);
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
        {subtitle ? <Text style={styles.headerCardSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  const renderInput = (
    label: string,
    icon: any,
    placeholder: string,
    value: string,
    setter: any,
    type: any = 'default',
    autoCapitalize: any = 'none',
    maxLength?: number
  ) => (
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
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
        />
      </View>
    </View>
  );

  const renderDriverPhotoUpload = () => {
    const asset = images.driver_photo;

    return (
      <View style={styles.driverPhotoContainer}>
        <Text style={styles.driverPhotoTitle}>Driver Profile Photo *</Text>
        <Text style={styles.driverPhotoSubtitle}>Upload your clear front-facing portrait photo</Text>

        <View style={styles.driverPhotoRow}>
          <TouchableOpacity 
            style={styles.avatarCircle} 
            onPress={() => openPicker('driver_photo', 'Driver Profile Photo')}
            activeOpacity={0.8}
          >
            {asset ? (
              <Image source={{ uri: asset.uri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={46} color="#9ca3af" />
              </View>
            )}
            <View style={styles.avatarCameraBadge}>
              <Camera size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.avatarActions}>
            <TouchableOpacity 
              style={styles.avatarUploadBtn}
              onPress={() => openPicker('driver_photo', 'Driver Profile Photo')}
              activeOpacity={0.8}
            >
              <Camera size={16} color="#11704B" style={{ marginRight: 6 }} />
              <Text style={styles.avatarUploadBtnText}>
                {asset ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>

            {asset ? (
              <TouchableOpacity 
                style={styles.avatarRemoveBtn}
                onPress={() => removeImage('driver_photo')}
              >
                <X size={14} color="#dc2626" style={{ marginRight: 4 }} />
                <Text style={styles.avatarRemoveBtnText}>Remove</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.avatarHintText}>Take selfie or choose from photos</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderImageUpload = (field: string, label: string, small: boolean = false) => {
    const isUploaded = !!images[field];

    if (isUploaded) {
      const asset = images[field];
      const filename = asset.uri ? (asset.uri.split('/').pop() || 'document.jpg') : 'document.jpg';
      const sizeMB = asset.fileSize ? (asset.fileSize / (1024 * 1024)).toFixed(1) : '2.1';

      return (
        <View style={[styles.inputWrapper, small && { flex: 1 }]}>
          {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
          <View style={styles.uploadedFileCard}>
            <Image source={{ uri: asset.uri }} style={styles.uploadedFileThumb} />
            <View style={styles.uploadedFileInfo}>
              <Text style={styles.uploadedFileName} numberOfLines={1}>{filename}</Text>
              <Text style={styles.uploadedFileSize}>{sizeMB} MB</Text>
            </View>
            <TouchableOpacity 
              style={styles.changeActionBtn}
              onPress={() => openPicker(field, label || 'Document Photo')}
            >
              <Text style={styles.changeActionText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeImage(field)} style={{ padding: 6 }}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.inputWrapper, small && { flex: 1 }]}>
        {label ? (
          <Text style={[styles.inputLabel, { display: 'flex', alignItems: 'center' }]}>
            {small && <CarFront size={16} color="#333" style={{ marginRight: 5 }} />} {label}
          </Text>
        ) : null}
        <TouchableOpacity 
          style={styles.uploadBox} 
          onPress={() => openPicker(field, label || 'Document Photo')}
          activeOpacity={0.7}
        >
          <Camera size={30} color="#11704B" />
          <Text style={styles.uploadMainText}>Tap to upload {small ? '' : (label ? label.toLowerCase() : 'photo')}</Text>
          <Text style={styles.uploadSubText}>Take photo or choose from photos</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPickerModal = () => (
    <Modal
      visible={pickerModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setPickerModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setPickerModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Upload Photo</Text>
          <Text style={styles.modalSubtitle}>{pickerLabel || 'Select an option to upload your image'}</Text>

          <TouchableOpacity style={styles.modalOption} onPress={handleCameraLaunch}>
            <View style={styles.modalIconWrap}>
              <Camera size={22} color="#11704B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalOptionTitle}>Take Photo</Text>
              <Text style={styles.modalOptionSub}>Use your device camera</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalOption} onPress={handleGalleryLaunch}>
            <View style={styles.modalIconWrap}>
              <ImageIcon size={22} color="#11704B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalOptionTitle}>Choose from Photos</Text>
              <Text style={styles.modalOptionSub}>Select from your gallery / photos</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.modalCancelBtn} 
            onPress={() => setPickerModalVisible(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ---------------- STEPS ----------------

  const renderStep1 = () => (
    <View>
      {renderHeaderCard(
        <CreditCard size={40} color="#11704B" />,
        "Complete Your Profile",
        "Upload your profile photo and government documents to start driving."
      )}

      {/* Driver Profile Photo Card */}
      {renderDriverPhotoUpload()}

      {/* Personal Details */}
      <View style={styles.sectionHeader}>
        <User size={20} color="#11704B" />
        <Text style={styles.sectionTitle}>Driver Personal Details</Text>
      </View>
      <Text style={styles.sectionSubtitle}>Please enter your legal name as on documents</Text>

      {renderInput("Full Name *", <User size={20} color="#666" />, "e.g. John Doe", driverName, setDriverName, "default", "words")}

      {/* Driving Licence */}
      <View style={[styles.sectionHeader, { marginTop: 15 }]}>
        <CreditCard size={20} color="#11704B" />
        <Text style={styles.sectionTitle}>Driving Licence Details</Text>
      </View>
      <Text style={styles.sectionSubtitle}>Enter your valid licence number and upload photo</Text>

      {renderInput("Driving Licence Number *", <CreditCard size={20} color="#666" />, "e.g. TN-33-AB-2026", drivingLicence, setDrivingLicence, "default", "characters")}
      {renderImageUpload("licence_photo", "Driving Licence Photo *")}

      {/* Aadhaar Card */}
      <View style={[styles.sectionHeader, { marginTop: 15 }]}>
        <IdCard size={20} color="#11704B" />
        <Text style={styles.sectionTitle}>Aadhaar Card Details</Text>
      </View>
      <Text style={styles.sectionSubtitle}>Enter your 12-digit Aadhaar number and upload photo</Text>

      {renderInput("Aadhaar Card Number *", <IdCard size={20} color="#666" />, "1234 5678 9012", aadharNumber, handleAadharChange, "numeric", "none", 14)}
      {renderImageUpload("aadhar_photo", "Aadhaar Card Photo *")}

      {/* PAN Card */}
      <View style={[styles.sectionHeader, { marginTop: 15 }]}>
        <FileText size={20} color="#11704B" />
        <Text style={styles.sectionTitle}>PAN Card Details</Text>
      </View>
      <Text style={styles.sectionSubtitle}>Enter your 10-character PAN number and upload photo</Text>

      {renderInput("PAN Card Number *", <FileText size={20} color="#666" />, "e.g. ABCDE1234F", panNumber, handlePanChange, "default", "characters", 10)}
      {renderImageUpload("pan_photo", "PAN Card Photo *")}
    </View>
  );

  const renderStep2 = () => (
    <View>
      {renderHeaderCard(
        null,
        "Vehicle Details",
        "Tell us about your vehicle"
      )}

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

      {renderInput("Registration Number", <Hash size={20} color="#666" />, "e.g. TN-33-IT-2026", registrationNumber, setRegistrationNumber, "default", "characters")}
      {renderInput("Vehicle Brand", <CarFront size={20} color="#666" />, "e.g. TVS / Maruti", make, setMake, "default", "words")}
      {renderInput("Vehicle Name", <CarFront size={20} color="#666" />, "e.g. Apache, Swift", vehicleName, setVehicleName, "default", "words")}
      {renderInput("Model (Year)", <Box size={20} color="#666" />, "e.g. 2026", model, setModel, "numeric", "none", 4)}
      {renderInput("Vehicle Color", <Palette size={20} color="#666" />, "e.g. White", color, setColor, "default", "words")}
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
          'Good lighting conditions without glare',
          'No blurry or cropped images',
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

      {/* Camera / Photo Gallery Picker Modal */}
      {renderPickerModal()}
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
  headerCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerCardTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  headerCardSub: { fontSize: 13, color: '#555', lineHeight: 18, marginTop: 2 },

  // Driver Profile Photo Section
  driverPhotoContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  driverPhotoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  driverPhotoSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 14,
  },
  driverPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#11704B',
    position: 'relative',
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#11704B',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarActions: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  avatarUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1f4e0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  avatarUploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#11704B',
  },
  avatarRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  avatarRemoveBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  avatarHintText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
  },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginLeft: 8 },
  sectionSubtitle: { fontSize: 13, color: '#666', marginBottom: 14, marginLeft: 28 },

  // Inputs
  inputWrapper: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#fdfdfd' },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#0f172a' },

  // Radio Buttons
  radioGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, gap: 10 },
  radioBtn: { flex: 1, paddingVertical: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, alignItems: 'center', backgroundColor: '#fff' },
  radioBtnActive: { borderColor: '#11704B', backgroundColor: '#f0fcf5' },
  radioText: { color: '#666', fontSize: 14, fontWeight: '600', marginTop: 8 },
  radioTextActive: { color: '#11704B' },

  // Uploads
  uploadBox: { height: 130, borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  uploadMainText: { color: '#1e293b', fontSize: 13, fontWeight: '600', marginTop: 8 },
  uploadSubText: { color: '#64748b', fontSize: 11, marginTop: 4 },

  // Uploaded File state
  uploadedFileCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, backgroundColor: '#f8fafc' },
  uploadedFileThumb: { width: 50, height: 42, borderRadius: 6, marginRight: 12, backgroundColor: '#e2e8f0' },
  uploadedFileInfo: { flex: 1 },
  uploadedFileName: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  uploadedFileSize: { fontSize: 11, color: '#64748b' },
  changeActionBtn: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  changeActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  rowGrid: { flexDirection: 'row', justifyContent: 'space-between' },

  // Instructions
  instructionsBox: { backgroundColor: '#f0fcf5', borderRadius: 12, padding: 15, marginTop: 15 },
  instructionsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  instructionsTitle: { fontSize: 14, fontWeight: 'bold', color: '#11704B', marginLeft: 8 },
  instructionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  instructionText: { fontSize: 12, color: '#334155', marginLeft: 10, flex: 1 },

  // Bottom Nav
  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 },
  backBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#f1f5f9', borderRadius: 10, marginRight: 12 },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#334155', marginLeft: 5 },
  continueBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#11704B', borderRadius: 10 },
  continueBtnText: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginRight: 5 },

  // Modal / ActionSheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#d1f4e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalOptionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCancelBtn: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
});

export default OnboardingScreen;
