import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

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

const SafetyScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useSelector((state: RootState) => state.auth);

  const contacts = parseEmergencyContacts(user?.emergency_contact);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Icon name="shield-check" size={48} color="#11704B" style={styles.shieldIcon} />
          <Text style={styles.infoTitle}>Your Safety Matters</Text>
          <Text style={styles.infoDesc}>
            These emergency contacts will be notified in case of an emergency during your rides.
          </Text>
        </View>

        <Text style={styles.sectionHeader}>Emergency Contacts</Text>
        
        <View style={styles.card}>
          {contacts.map((contact: any, index: number) => (
            <React.Fragment key={index}>
              <View style={styles.contactRow}>
                <View style={styles.iconContainer}>
                  <Icon name="phone-outline" size={24} color="#455A64" />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactLabel}>{contact.name || `Contact ${index + 1}`}</Text>
                  <Text style={[styles.contactValue, !contact.phone && styles.contactMissing]}>
                    {contact.phone || 'Not provided'}
                  </Text>
                </View>
              </View>
              {index < 2 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Update Contacts</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 40,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  shieldIcon: {
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  infoDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactDetails: {
    flex: 1,
    marginLeft: 15,
  },
  contactLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  contactMissing: {
    color: '#c8784d',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 70,
  },
  editButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default SafetyScreen;
