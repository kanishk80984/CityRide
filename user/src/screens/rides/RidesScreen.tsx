import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../services/apiClient';

const RidesScreen = () => {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'COMPLETED' | 'CANCELLED'>('COMPLETED');

  useFocusEffect(
    useCallback(() => {
      fetchRides();
    }, [])
  );

  const fetchRides = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/rides');
      const data = response.data;
      if (data.success) {
        setRides(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'COMPLETED': return '#4caf50';
      case 'CANCELLED': return '#f44336';
      case 'SEARCHING_DRIVER': return '#ff9800';
      case 'ACCEPTED': return '#2196f3';
      default: return '#666';
    }
  };

  const renderRideItem = ({ item }: { item: any }) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateRow}>
            <Icon name="calendar-clock" size={16} color="#666" />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>

        <View style={styles.locationContainer}>
          <View style={styles.timeline}>
            <View style={[styles.dot, { backgroundColor: '#4caf50' }]} />
            <View style={styles.line} />
            <View style={[styles.dot, { backgroundColor: '#f44336' }]} />
          </View>
          <View style={styles.addresses}>
            <Text style={styles.addressText} numberOfLines={1}>{item.pickup_address}</Text>
            <View style={styles.addressSpacer} />
            <Text style={styles.addressText} numberOfLines={1}>{item.drop_address}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.vehicleRow}>
            <Icon name="car" size={18} color="#000" />
            <Text style={styles.vehicleText}>{item.vehicle_name || 'Vehicle'}</Text>
          </View>
          <Text style={styles.fareText}>₹ {item.estimated_fare}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#11704B" />
      </View>
    );
  }

  const filteredRides = rides.filter(ride => ride.status === activeTab);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'COMPLETED' && styles.activeTabButton]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.activeTabText]}>Completed</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'CANCELLED' && styles.activeTabButton]}
          onPress={() => setActiveTab('CANCELLED')}
        >
          <Text style={[styles.tabText, activeTab === 'CANCELLED' && styles.activeTabText]}>Cancelled</Text>
        </TouchableOpacity>
      </View>

      {filteredRides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="car-off" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No rides found</Text>
          <Text style={styles.emptySubText}>Book a ride to see your history here.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRides}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRideItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchRides}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: '#f5f5f5',
  },
  activeTabButton: {
    backgroundColor: '#E3F5EC',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#11704B',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  listContent: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
  },
  timeline: {
    alignItems: 'center',
    marginRight: 10,
    paddingVertical: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: '#ccc',
    marginVertical: 4,
  },
  addresses: {
    flex: 1,
    justifyContent: 'space-between',
  },
  addressText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  addressSpacer: {
    height: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 5,
  },
  fareText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#11704B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 15,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  }
});

export default RidesScreen;
