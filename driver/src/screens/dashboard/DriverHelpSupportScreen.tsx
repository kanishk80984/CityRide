import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  ChevronLeft, 
  ChevronRight, 
  Wallet, 
  User, 
  Car, 
  FileText, 
  Smartphone, 
  ShieldCheck, 
  HelpCircle,
  Ticket
} from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DriverHelpSupportScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const supportOptions = [
    {
      id: 'earnings',
      title: 'Earnings & Payments',
      subtitle: 'Payouts, wallet, incentives',
      icon: <Wallet size={24} color="#1F2937" />
    },
    {
      id: 'account',
      title: 'Account Related',
      subtitle: 'Login, profile, account issues',
      icon: <User size={24} color="#1F2937" />
    },
    {
      id: 'ride',
      title: 'Ride Related',
      subtitle: 'Ride requests, trip issues',
      icon: <Car size={24} color="#1F2937" />
    },
    {
      id: 'vehicle',
      title: 'Vehicle & Documents',
      subtitle: 'Vehicle verification, document upload',
      icon: <FileText size={24} color="#1F2937" />
    },
    {
      id: 'app',
      title: 'App Related',
      subtitle: 'Technical issues, app not working',
      icon: <Smartphone size={24} color="#1F2937" />
    },
    {
      id: 'safety',
      title: 'Safety & Security',
      subtitle: 'Safety concerns, emergency help',
      icon: <ShieldCheck size={24} color="#1F2937" />
    },
    {
      id: 'other',
      title: 'Other Issues',
      subtitle: 'Any other queries',
      icon: <HelpCircle size={24} color="#1F2937" />
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <ChevronLeft size={28} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Help & Support</Text>
          </View>
          <TouchableOpacity 
            style={styles.ticketsButton} 
            onPress={() => navigation.navigate('DriverMyTickets')}
          >
            <Ticket size={20} color="#111827" />
            <Text style={styles.ticketsText}>Tickets</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.listContainer}>
            {supportOptions.map((option, index) => (
              <React.Fragment key={option.id}>
                <TouchableOpacity 
                  style={styles.listItem}
                  onPress={() => navigation.navigate('DriverSupportChat', { topic: option.title })}
                >
                  <View style={styles.iconWrapper}>
                    {option.icon}
                  </View>
                  <View style={styles.textWrapper}>
                    <Text style={styles.itemTitle}>{option.title}</Text>
                    <Text style={styles.itemSubtitle}>{option.subtitle}</Text>
                  </View>
                  <ChevronRight size={20} color="#6B7280" />
                </TouchableOpacity>
                {index < supportOptions.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  ticketsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ticketsText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  scrollContent: {
    paddingTop: 10,
  },
  listContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  iconWrapper: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  textWrapper: {
    flex: 1,
    paddingRight: 10,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 56,
  }
});

export default DriverHelpSupportScreen;
