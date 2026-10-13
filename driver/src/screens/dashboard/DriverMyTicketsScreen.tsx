import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Ticket as TicketIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import api from '../../services/api';

const DriverMyTicketsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = await AsyncStorage.getItem('driverToken');
      const res = await api.get('/api/support/tickets');
      const data = res.data;
      if (data.success) {
        setTickets(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tickets', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTicket = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.ticketCard}
      onPress={() => navigation.navigate('DriverSupportChat', { ticketId: item.id, topic: item.topic, status: item.status })}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketId}>Ticket #{item.id}</Text>
        <View style={[styles.statusBadge, item.status === 'CLOSED' ? styles.statusClosed : styles.statusOpen]}>
          <Text style={[styles.statusText, item.status === 'CLOSED' ? styles.statusClosedText : styles.statusOpenText]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.topic}>{item.topic}</Text>
      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Tickets</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginTop: 50 }} />
      ) : tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <TicketIcon size={60} color="#D1D5DB" />
          <Text style={styles.emptyText}>No tickets found</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTicket}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  listContainer: {
    padding: 15,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketId: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: '#D1FAE5',
  },
  statusClosed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusOpenText: {
    color: '#059669',
  },
  statusClosedText: {
    color: '#DC2626',
  },
  topic: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 10,
  }
});

export default DriverMyTicketsScreen;
