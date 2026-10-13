import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const privacyData = [
  {
    title: 'Information We Collect',
    description: 'Personal details, documents, location data, trip information and device details.'
  },
  {
    title: 'How We Use Your Information',
    description: 'To provide and improve our services, process payments and ensure safety.'
  },
  {
    title: 'Information Sharing',
    description: 'We do not share your personal information with third parties except as required by law.'
  },
  {
    title: 'Location Data',
    description: 'We collect location data to connect you with nearby ride requests and for safety purposes.'
  },
  {
    title: 'Data Security',
    description: 'We use industry-standard security measures to protect your data.'
  },
  {
    title: 'Your Rights',
    description: 'You can access, update or request deletion of your personal information.'
  },
  {
    title: 'Cookies and Tracking',
    description: 'We use cookies and similar technologies to improve app experience.'
  },
  {
    title: 'Contact Us',
    description: 'If you have any questions about this Privacy Policy, please contact our support team.'
  }
];

const DriverPrivacyScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {privacyData.map((item, index) => (
            <View key={index} style={styles.termItem}>
              <Text style={styles.termTitle}>{item.title}</Text>
              <Text style={styles.termDescription}>{item.description}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 30,
    backgroundColor: '#ffffff',
  },
  termItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  termTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  termDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  }
});

export default DriverPrivacyScreen;
