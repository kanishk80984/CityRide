import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../services/apiClient';

const PaymentHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await apiClient.get('/payments');
      if (res.data.success) {
        setPayments(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payments', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'SUCCESS' ? '#4caf50' : '#f44336';
  };

  const renderPaymentItem = ({ item }: { item: any }) => {
    const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.methodRow}>
            <Icon name={item.method === 'Wallet' ? 'wallet' : item.method === 'UPI' ? 'cellphone' : 'credit-card'} size={24} color="#333" />
            <Text style={styles.methodText}>{item.method}</Text>
          </View>
          <Text style={styles.amountText}>₹ {item.amount}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#11704B" />
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="cash-remove" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No payments found</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchPayments}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#11704B',
  },
  cardBody: {
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#555',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#888',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
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
  }
});

export default PaymentHistoryScreen;
