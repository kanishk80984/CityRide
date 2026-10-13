import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../../store/store';
import { logout } from '../../store/authSlice';
import { resetRide } from '../../store/rideSlice';
import apiClient from '../../services/apiClient';

const SettingsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    dispatch(logout());
    dispatch(resetRide());
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const res = await apiClient.delete('/users/me');
              if (res.data.success) {
                await AsyncStorage.removeItem('token');
                dispatch(logout());
                dispatch(resetRide());
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              }
            } catch (error) {
              console.error('Delete account failed', error);
              Alert.alert('Error', 'Failed to delete account. Please try again later.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {renderSectionHeader('Profile Information')}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Icon name="account-outline" size={24} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{user?.name || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="phone-outline" size={24} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user?.phone || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="email-outline" size={24} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email ID</Text>
              <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {renderSectionHeader('About')}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Icon name="information-outline" size={24} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoValue}>CityRide App</Text>
              <Text style={styles.infoLabel}>Version 1.0.0</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="file-document-outline" size={24} color="#666" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoValue}>Terms and Conditions</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </View>
        </View>

        {renderSectionHeader('Account Actions')}
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#f57c00" />
            <Text style={[styles.actionText, { color: '#f57c00' }]}>Log Out</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#d32f2f" />
            ) : (
              <Icon name="delete-outline" size={24} color="#d32f2f" />
            )}
            <Text style={[styles.actionText, { color: '#d32f2f' }]}>
              {loading ? 'Deleting...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>© 2026 CityRide Technologies</Text>
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 10,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 54,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  footerText: {
    textAlign: 'center',
    color: '#bbb',
    fontSize: 12,
    marginTop: 20,
  }
});

export default SettingsScreen;
