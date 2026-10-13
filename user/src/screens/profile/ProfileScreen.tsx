import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../../store/store';
import { logout } from '../../store/authSlice';
import { resetRide } from '../../store/rideSlice';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    dispatch(logout());
    dispatch(resetRide());
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const renderMenuItem = (icon: string, title: string, onPress?: () => void) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Icon name={icon} size={22} color="#455A64" />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
      </View>
      <Icon name="chevron-right" size={24} color="#000" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.profileInfoRow} onPress={handleEditProfile}>
            <View style={styles.avatarContainer}>
              {user?.profile_image ? (
                <Image source={{ uri: user.profile_image }} style={{ width: '100%', height: '100%', borderRadius: 25 }} />
              ) : (
                <Icon name="account-outline" size={30} color="#455A64" />
              )}
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{user?.name || 'kanishk'}</Text>
              <Text style={styles.profilePhone}>{user?.phone || '9080929128'}</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#000" />
          </TouchableOpacity>
          
          <View style={styles.cardDivider} />
          
          <TouchableOpacity style={styles.profileInfoRow}>
            <View style={styles.avatarContainer}>
              <Icon name="star" size={24} color="#FBC02D" />
            </View>
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, { fontSize: 15 }]}>5.00 My Rating</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          {renderMenuItem('help-circle-outline', 'Help', () => navigation.navigate('Help'))}
          <View style={styles.divider} />
          {renderMenuItem('cash', 'Payment', () => navigation.navigate('PaymentHistory'))}
          <View style={styles.divider} />
          {renderMenuItem('history', 'My Rides', () => navigation.navigate('Rides'))}
          <View style={styles.divider} />
          {renderMenuItem('shield-check-outline', 'Safety', () => navigation.navigate('Safety'))}
          <View style={styles.divider} />
          {renderMenuItem('medal-outline', 'My Rewards')}
          <View style={styles.divider} />
          {renderMenuItem('cog-outline', 'Settings', () => navigation.navigate('Settings'))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#f44336" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 5,
    marginTop: 10,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  profileDetails: {
    flex: 1,
    marginLeft: 15,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  profilePhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 15,
  },
  menuSection: {
    marginTop: 20,
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 10,
  },
  menuIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 60,
    marginRight: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  logoutText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  }
});

export default ProfileScreen;
