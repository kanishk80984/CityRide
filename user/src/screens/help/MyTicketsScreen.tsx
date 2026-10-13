import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../services/apiClient';

const MyTicketsScreen = () => {
  const navigation = useNavigation<any>();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await apiClient.get('/support/tickets');
      if (res.data.success) {
        setTickets(res.data.data);
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
      onPress={() => navigation.navigate('TicketChat', { ticketId: item.id, topic: item.topic })}
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Tickets</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#000" style={{ marginTop: 50 }} />
      ) : tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="ticket-outline" size={60} color="#ccc" />
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
  listContainer: {
    padding: 15,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
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
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: '#E8F5E9',
  },
  statusClosed: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusOpenText: {
    color: '#2E7D32',
  },
  statusClosedText: {
    color: '#C62828',
  },
  topic: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  }
});

export default MyTicketsScreen;
