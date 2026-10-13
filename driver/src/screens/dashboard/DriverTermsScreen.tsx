import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const termsData = [
  {
    title: 'Introduction',
    description: 'These terms govern your use of the Eagle Fly Driver platform.'
  },
  {
    title: 'Eligibility',
    description: 'You must be at least 18 years old and have a valid driving license.'
  },
  {
    title: 'Account Registration',
    description: 'You are responsible for maintaining the confidentiality of your account.'
  },
  {
    title: 'Use of Platform',
    description: 'You agree to provide safe, reliable and lawful services to customers.'
  },
  {
    title: 'Earnings and Payments',
    description: 'Trip fares, incentives and payouts are subject to Eagle Fly\'s policies.'
  },
  {
    title: 'Documents and Verification',
    description: 'You must maintain valid documents at all times.'
  },
  {
    title: 'Compliance',
    description: 'You agree to comply with all applicable laws and regulations.'
  },
  {
    title: 'Termination',
    description: 'Eagle Fly reserves the right to suspend or terminate your account in case of violations.'
  }
];

const DriverTermsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {termsData.map((item, index) => (
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

export default DriverTermsScreen;
