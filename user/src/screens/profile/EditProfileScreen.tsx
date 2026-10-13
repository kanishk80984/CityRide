import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setAuth } from '../../store/authSlice';
import apiClient from '../../services/apiClient';

const parseEmergencyContacts = (str: string | null | undefined) => {
  if (!str) return [{name: '', phone: ''}, {name: '', phone: ''}, {name: '', phone: ''}];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return [
        { name: parsed[0]?.name || '', phone: parsed[0]?.phone || '' },
        { name: parsed[1]?.name || '', phone: parsed[1]?.phone || '' },
        { name: parsed[2]?.name || '', phone: parsed[2]?.phone || '' },
      ];
    }
  } catch (e) {
    const parts = str.split(',');
    return [
      { name: '', phone: parts[0] || '' },
      { name: '', phone: parts[1] || '' },
      { name: '', phone: parts[2] || '' },
    ];
  }
  return [{name: '', phone: ''}, {name: '', phone: ''}, {name: '', phone: ''}];
};

const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(false);
  const initialContacts = parseEmergencyContacts(user?.emergency_contact);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    gender: user?.gender || '',
    blood_group: user?.blood_group || '',
    dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '', // simple format
    profile_image: user?.profile_image || '',
    contact1Name: initialContacts[0].name,
    contact1Phone: initialContacts[0].phone,
    contact2Name: initialContacts[1].name,
    contact2Phone: initialContacts[1].phone,
    contact3Name: initialContacts[2].name,
    contact3Phone: initialContacts[2].phone,
  });

  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showBloodGroupModal, setShowBloodGroupModal] = useState(false);
  const [showDobModal, setShowDobModal] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'June 2026';

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/users/me');
      if (res.data.data.user && token) {
        dispatch(setAuth({ user: res.data.data.user, token }));
        const u = res.data.data.user;
        const fetchedContacts = parseEmergencyContacts(u.emergency_contact);
        setFormData({
          name: u.name || '',
          email: u.email || '',
          gender: u.gender || '',
          blood_group: u.blood_group || '',
          dob: u.dob ? new Date(u.dob).toISOString().split('T')[0] : '',
          profile_image: u.profile_image || '',
          contact1Name: fetchedContacts[0].name,
          contact1Phone: fetchedContacts[0].phone,
          contact2Name: fetchedContacts[1].name,
          contact2Phone: fetchedContacts[1].phone,
          contact3Name: fetchedContacts[2].name,
          contact3Phone: fetchedContacts[2].phone,
        });
        if (u.dob) {
          setCurrentDate(new Date(u.dob));
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleImagePick = async (type: 'camera' | 'gallery') => {
    try {
      const options = {
        mediaType: 'photo' as const,
        quality: 0.2,
        maxWidth: 300,
        maxHeight: 300,
        includeBase64: true,
      };

      const result = type === 'camera' ? await launchCamera(options as any) : await launchImageLibrary(options as any);

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileSize = asset.fileSize || (asset.base64 ? Math.round((asset.base64.length * 3) / 4) : 0);

        if (fileSize > 30 * 1024) {
          Alert.alert('Error', 'Image could not be compressed under 30KB automatically. Please choose a different photo.');
          return;
        }

        if (asset.base64) {
          const base64Image = `data:${asset.type};base64,${asset.base64}`;
          setFormData(prev => ({ ...prev, profile_image: base64Image }));
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert('Error', 'Could not select image.');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Profile Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => handleImagePick('camera') },
        { text: 'Gallery', onPress: () => handleImagePick('gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const emergency_contact = JSON.stringify([
        { name: formData.contact1Name, phone: formData.contact1Phone },
        { name: formData.contact2Name, phone: formData.contact2Phone },
        { name: formData.contact3Name, phone: formData.contact3Phone }
      ]);
      
      const payload = {
        ...formData,
        emergency_contact
      };

      const res = await apiClient.put('/users/me', payload);
      if (token) {
        dispatch(setAuth({ user: res.data.data.user, token }));
      }
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (icon: string, label: string, value: string, placeholder: string, onChangeText: (val: string) => void, isRequired = false, rightAction?: React.ReactNode, editable = true, onPress?: () => void, keyboardType: any = 'default') => (
    <TouchableOpacity style={styles.fieldContainer} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={24} color="#666" />
      </View>
      <View style={styles.inputContainer} pointerEvents={editable ? 'auto' : 'none'}>
        <Text style={styles.label}>{label}</Text>
        <TextInput 
          style={[styles.input, (!value && isRequired) && styles.requiredText]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isRequired ? "#c8784d" : "#999"}
          editable={editable}
          keyboardType={keyboardType}
        />
      </View>
      {rightAction && <View style={styles.rightAction} pointerEvents="none">{rightAction}</View>}
    </TouchableOpacity>
  );

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Get first day of month (0 = Sun, 1 = Mon...)
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isSelected = formData.dob === dateStr;
      
      days.push(
        <TouchableOpacity 
          key={i} 
          style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
          onPress={() => {
            setFormData({...formData, dob: dateStr});
            setShowDobModal(false);
          }}
        >
          <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{i}</Text>
        </TouchableOpacity>
      );
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    if (showYearPicker) {
      const years = Array.from({length: 100}, (_, i) => year - 50 + i);
      return (
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => setShowYearPicker(false)}>
              <Icon name="arrow-left" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.calendarHeaderText}>Select Year</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView style={{ height: 260 }} showsVerticalScrollIndicator={false}>
            {years.map(y => (
              <TouchableOpacity 
                key={y} 
                style={[styles.yearOption, year === y && styles.yearOptionSelected]}
                onPress={() => {
                  setCurrentDate(new Date(y, month, 1));
                  setShowYearPicker(false);
                }}
              >
                <Text style={[styles.yearOptionText, year === y && styles.yearOptionTextSelected]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month - 1, 1))}>
            <Icon name="chevron-left" size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowYearPicker(true)}>
            <Text style={styles.calendarHeaderText}>{monthNames[month]} {year} ▾</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month + 1, 1))}>
            <Icon name="chevron-right" size={28} color="#000" />
          </TouchableOpacity>
        </View>
        
        <View style={[styles.calendarGrid, { minHeight: 260 }]}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <Text key={day} style={styles.calendarWeekday}>{day}</Text>
          ))}
          {days}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={28} color="#000" />
          </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.helpBtn} onPress={() => navigation.navigate('Help')}>
          <Icon name="help-circle-outline" size={20} color="#333" />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.profileImageContainer}>
          <TouchableOpacity onPress={showImagePickerOptions} style={styles.profileImageWrapper}>
            {formData.profile_image ? (
              <Image source={{ uri: formData.profile_image }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Icon name="camera-plus" size={30} color="#9ca3af" />
              </View>
            )}
            <View style={styles.editIconBadge}>
              <Icon name="pencil" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {renderField('account-outline', 'Name', formData.name, 'Enter your name', (val) => setFormData({...formData, name: val}), false, <Icon name="chevron-right" size={24} color="#000" />)}
        <View style={styles.divider} />
        
        {renderField('phone-outline', 'Phone Number', user?.phone || 'Enter phone number', '', () => {}, false, undefined, false, undefined, 'phone-pad')}
        <View style={styles.divider} />

        {renderField('email-outline', 'Email', formData.email, 'Required', (val) => setFormData({...formData, email: val}), true, <Icon name="chevron-right" size={24} color="#000" />)}
        <View style={styles.divider} />

        {/* Gender Selection */}
        {renderField('gender-male-female', 'Gender', formData.gender, 'Select Gender', () => {}, false, <Icon name="chevron-down" size={24} color="#666" />, false, () => setShowGenderModal(true))}
        <View style={styles.divider} />

        {/* Blood Group Selection */}
        {renderField('water-outline', 'Blood Group', formData.blood_group, 'Select Blood Group', () => {}, true, <Icon name="chevron-down" size={24} color="#666" />, false, () => setShowBloodGroupModal(true))}
        <View style={styles.divider} />

        {/* DOB Selection */}
        {renderField('calendar-blank-outline', 'Date of Birth', formData.dob, 'Select Date', () => {}, true, <Icon name="calendar" size={24} color="#666" />, false, () => setShowDobModal(true))}
        <View style={styles.divider} />

        {/* Read Only Member Since */}
        <View style={styles.fieldContainer}>
          <View style={styles.iconContainer}>
            <Icon name="medal-outline" size={24} color="#666" />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Member Since</Text>
            <Text style={styles.staticValue}>{user?.created_at ? memberSince : 'Just now'}</Text>
          </View>
        </View>
        {/* Nominee Selection */}
        <View style={styles.divider} />
        {renderField(
          'card-account-details-outline', 
          'Nominee Details', 
          user?.nominee_details ? 'Nominee Added' : 'Add Nominee', 
          '', 
          () => {}, 
          false, 
          <Icon name="chevron-right" size={24} color="#000" />, 
          false, 
          () => navigation.navigate('AddNominee')
        )}

        <View style={styles.divider} />
        {/* Emergency Contacts */}
        <Text style={{fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginLeft: 20, marginTop: 15, marginBottom: 5}}>Emergency Contact 1</Text>
        {renderField('account-outline', 'Contact 1 Name', formData.contact1Name, 'Enter contact name', (val) => setFormData({...formData, contact1Name: val}))}
        <View style={styles.divider} />
        {renderField('phone-outline', 'Contact 1 Number', formData.contact1Phone, 'Enter emergency number', (val) => setFormData({...formData, contact1Phone: val}), false, undefined, true, undefined, 'phone-pad')}
        
        <View style={styles.divider} />
        <Text style={{fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginLeft: 20, marginTop: 15, marginBottom: 5}}>Emergency Contact 2</Text>
        {renderField('account-outline', 'Contact 2 Name', formData.contact2Name, 'Enter contact name', (val) => setFormData({...formData, contact2Name: val}))}
        <View style={styles.divider} />
        {renderField('phone-outline', 'Contact 2 Number', formData.contact2Phone, 'Enter emergency number', (val) => setFormData({...formData, contact2Phone: val}), false, undefined, true, undefined, 'phone-pad')}
        
        <View style={styles.divider} />
        <Text style={{fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginLeft: 20, marginTop: 15, marginBottom: 5}}>Emergency Contact 3</Text>
        {renderField('account-outline', 'Contact 3 Name', formData.contact3Name, 'Enter contact name', (val) => setFormData({...formData, contact3Name: val}))}
        <View style={styles.divider} />
        {renderField('phone-outline', 'Contact 3 Number', formData.contact3Phone, 'Enter emergency number', (val) => setFormData({...formData, contact3Phone: val}), false, undefined, true, undefined, 'phone-pad')}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>

      {/* Gender Modal */}
      <Modal visible={showGenderModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGenderModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {['Male', 'Female', 'Others'].map(g => (
              <TouchableOpacity 
                key={g} 
                style={styles.modalOption} 
                onPress={() => {
                  setFormData({...formData, gender: g});
                  setShowGenderModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, formData.gender === g && styles.modalOptionSelected]}>{g}</Text>
                {formData.gender === g && <Icon name="check" size={24} color="#11704B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Blood Group Modal */}
      <Modal visible={showBloodGroupModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBloodGroupModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Blood Group</Text>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
              <TouchableOpacity 
                key={bg} 
                style={styles.modalOption} 
                onPress={() => {
                  setFormData({...formData, blood_group: bg});
                  setShowBloodGroupModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, formData.blood_group === bg && styles.modalOptionSelected]}>{bg}</Text>
                {formData.blood_group === bg && <Icon name="check" size={24} color="#11704B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* DOB Modal */}
      <Modal visible={showDobModal} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDobModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date of Birth</Text>
            {renderCalendar()}
          </View>
        </TouchableOpacity>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginLeft: 15,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  helpText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#333',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  iconContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  input: {
    fontSize: 14,
    color: '#666',
    padding: 0,
    margin: 0,
  },
  staticValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  requiredText: {
    color: '#c8784d',
  },
  rightAction: {
    paddingLeft: 15,
  },
  addText: {
    color: '#1a73e8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    width: '100%',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  saveBtn: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 250,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionSelected: {
    fontWeight: 'bold',
    color: '#11704B',
  },
  calendarContainer: {
    marginTop: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarWeekday: {
    width: '14.28%',
    textAlign: 'center',
    color: '#888',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDaySelected: {
    backgroundColor: '#11704B',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  yearOption: {
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yearOptionSelected: {
    backgroundColor: '#E3F5EC',
  },
  yearOptionText: {
    fontSize: 16,
    color: '#333',
  },
  yearOptionTextSelected: {
    color: '#11704B',
    fontWeight: 'bold',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#11704B',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});

export default EditProfileScreen;
