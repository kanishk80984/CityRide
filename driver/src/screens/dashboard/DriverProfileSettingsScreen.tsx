import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Linking, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronRight, Camera, CheckCircle2, LogOut, Bell, MapPin, Headphones, FileText, Shield, Briefcase, CreditCard } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiUrl } from '../../config/url';

const DriverProfileSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [driverUser, setDriverUser] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('driverUser');
      if (userStr) {
        setDriverUser(JSON.parse(userStr));
      }
    } catch (e) {
      console.log('Error loading user in settings', e);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('driverToken');
              await AsyncStorage.removeItem('driverUser');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (err) {
              console.error('Logout error:', err);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account and details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <TouchableOpacity 
          style={styles.profileCard}
          onPress={() => navigation.navigate('DriverProfileDetails')}
        >
          <View style={styles.avatarContainer}>
            <Image 
              source={
                driverUser?.profile_image 
                ? { uri: driverUser.profile_image.startsWith('http') ? driverUser.profile_image : getApiUrl(`/uploads/${driverUser.profile_image}`) } 
                : { uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }
              } 
              style={styles.avatar} 
            />
            <View style={styles.cameraBadge}>
              <Camera size={12} color="#fff" />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{driverUser?.name || 'Ramesh Kumar'}</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.profilePhone}>{driverUser?.phone || '+91 98765 43210'}</Text>
              <CheckCircle2 size={16} color="#059669" style={{ marginLeft: 6 }} />
            </View>
          </View>
          <ChevronRight size={24} color="#9CA3AF" />
        </TouchableOpacity>


        {/* Owner/Client Integration */}
        <Text style={styles.sectionHeader}>Owner Integration</Text>
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('DriverClientIntegration')}
          >
            <View style={styles.menuIconWrapper}>
              <Briefcase size={20} color="#4B5563" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Client Integration</Text>
              <Text style={styles.menuSubtitle}>Manage your owner link</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>



        {/* App Preferences */}
        <Text style={styles.sectionHeader}>App Preferences</Text>
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('DriverPermissions')}
          >
            <View style={styles.menuIconWrapper}>
              <Shield size={20} color="#4B5563" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>App Permissions</Text>
              <Text style={styles.menuSubtitle}>Manage device permissions</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={async () => {
              if (Platform.OS === 'android') {
                try {
                  await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
                    { key: 'android.provider.extra.APP_PACKAGE', value: 'com.driver' }
                  ]);
                } catch (e) {
                  Linking.openSettings();
                }
              }
            }}
          >
            <View style={styles.menuIconWrapper}>
              <Bell size={20} color="#4B5563" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Notification</Text>
              <Text style={styles.menuSubtitle}>Manage notification access</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <Text style={styles.sectionHeader}>Support</Text>
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('DriverHelpSupport')}
          >
            <View style={styles.menuIconWrapper}>
              <Headphones size={20} color="#4B5563" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Help & Support</Text>
              <Text style={styles.menuSubtitle}>Get help with your issues</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('DriverTerms')}
          >
            <View style={styles.menuIconWrapper}>
              <FileText size={20} color="#4B5563" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Terms & Conditions</Text>
              <Text style={styles.menuSubtitle}>Read our terms and policies</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.menuDivider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('DriverPrivacy')}
          >
            <View style={styles.menuIconWrapper}>
              <Shield size={20} color="#4B5563" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Privacy Policy</Text>
              <Text style={styles.menuSubtitle}>Learn how we protect your data</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.logoutTitle}>Logout</Text>
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#C8E6C9',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#059669',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827'
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  profilePhone: {
    fontSize: 15,
    color: '#4B5563'
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 30,
  },
  shieldWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  verifiedTextWrapper: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#064E3B'
  },
  verifiedSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginLeft: 10
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    marginTop: 10,
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconWrapper: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuTextWrapper: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 55,
  }
});

export default DriverProfileSettingsScreen;
