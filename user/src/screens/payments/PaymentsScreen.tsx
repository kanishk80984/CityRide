import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../../services/apiClient';

const PaymentsScreen = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [balance, setBalance] = useState('0.00');
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amountInput, setAmountInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const [paymentsRes, balanceRes] = await Promise.all([
        apiClient.get('/payments'),
        apiClient.get('/payments/balance')
      ]);

      if (paymentsRes.data?.success) {
        setPayments(paymentsRes.data.data);
      }
      if (balanceRes.data?.success) {
        const bal = parseFloat(balanceRes.data.data.balance || 0).toFixed(2);
        setBalance(bal);
      }
    } catch (error) {
      console.error('Failed to fetch payments or balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (type: 'deposit' | 'withdraw') => {
    setActionType(type);
    setAmountInput('');
    setModalVisible(true);
  };

  const submitAction = async () => {
    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    if (actionType === 'withdraw') {
      const currentBal = parseFloat(balance);
      if (amt > currentBal) {
        Alert.alert('Insufficient Balance', 'You do not have enough money in your wallet to withdraw this amount.');
        return;
      }
    }

    try {
      setProcessing(true);
      const endpoint = actionType === 'deposit' ? '/payments/deposit' : '/payments/withdraw';
      const response = await apiClient.post(endpoint, {
        amount: amt,
        transaction_id: actionType === 'deposit' ? 'txn_' + Date.now() : undefined,
        bank_details: actionType === 'withdraw' ? 'User Bank Account' : undefined,
      });

      if (response.data.success) {
        Alert.alert('Success', actionType === 'deposit' ? 'Money added to wallet successfully!' : 'Withdrawal requested successfully!');
        setModalVisible(false);
        fetchPayments(); // Refresh list and balance
      } else {
        Alert.alert('Error', response.data.message || 'Action failed');
      }
    } catch (error: any) {
      console.error('Payment Action Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'SUCCESS') return 'check-circle';
    if (status === 'FAILED') return 'close-circle';
    return 'clock-outline';
  };

  const getStatusColor = (status: string) => {
    if (status === 'Completed' || status === 'SUCCESS') return '#16a34a';
    if (status === 'Failed' || status === 'FAILED') return '#ef4444';
    return '#f59e0b'; // Pending
  };

  const renderPaymentItem = ({ item }: { item: any }) => {
    const isDep = item.type === 'deposit';
    
    const formattedDate = new Date(item.date).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) + ', ' + new Date(item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const statusStr = item.status ? (item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()) : 'Completed';

    return (
      <View style={styles.card}>
        <View style={[styles.iconContainer, isDep ? styles.iconBgBlue : styles.iconBgOrange]}>
          <Icon name={isDep ? 'plus' : 'arrow-down'} size={24} color={isDep ? '#3b82f6' : '#f97316'} />
        </View>
        
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{isDep ? 'Money Added' : 'Wallet Withdrawal'}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: getStatusColor(statusStr) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(statusStr) }]}>
            {statusStr}
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: isDep ? '#16a34a' : '#ef4444' }]}>
            {isDep ? '+' : '-'} ₹ {Math.abs(item.amount).toFixed(2)}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color="#ccc" style={{ marginLeft: 8 }} />
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

  const filteredPayments = payments.filter((item) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Withdrawal') return item.type === 'withdrawal';
    if (activeTab === 'Deposit') return item.type === 'deposit';
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Wallet Balance Banner */}
      <View style={styles.walletBanner}>
        <View style={styles.walletBannerHeader}>
          <View style={styles.walletHeaderLeft}>
            <Icon name="wallet" size={24} color="#11704B" />
            <Text style={styles.walletTitle}>CityRide Wallet</Text>
          </View>
          <Icon name="wallet-plus" size={32} color="#11704B" />
        </View>

        <View style={styles.walletBannerBody}>
          <View style={styles.balanceColumn}>
            <Text style={styles.walletLabel}>Current Balance</Text>
            <Text style={styles.walletAmount}>₹ {balance}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceColumn}>
            <Text style={styles.walletLabel}>Total Balance</Text>
            <Text style={styles.walletAmount}>₹ {balance}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.actionButtonOrange} onPress={() => handleAction('withdraw')}>
          <View style={styles.actionIconOrange}>
            <Icon name="arrow-up" size={20} color="#f97316" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Withdraw</Text>
            <Text style={styles.actionSubTitle}>Transfer to Bank</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButtonBlue} onPress={() => handleAction('deposit')}>
          <View style={styles.actionIconBlue}>
            <Icon name="plus" size={20} color="#3b82f6" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Add Money</Text>
            <Text style={styles.actionSubTitle}>Add to Wallet</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <Text style={styles.historyTitle}>Payment History</Text>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['All', 'Withdrawal', 'Deposit'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredPayments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="receipt" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No payments yet</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPayments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPaymentItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchPayments}
        />
      )}

      {/* Deposit/Withdraw Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'deposit' ? 'Add Money to Wallet' : 'Withdraw Money'}
            </Text>
            
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount (₹)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={amountInput}
              onChangeText={setAmountInput}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.submitBtn} onPress={submitAction} disabled={processing}>
                {processing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  walletBanner: {
    margin: 15,
    backgroundColor: '#Eafaf0',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ccebe0',
  },
  walletBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  walletHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#11704B',
    marginLeft: 8,
  },
  walletBannerBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceColumn: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#ccebe0',
    marginHorizontal: 15,
  },
  walletLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
    marginBottom: 5,
  },
  walletAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#11704B',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginHorizontal: 15,
    marginTop: 5,
    marginBottom: 10,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 20,
    gap: 10,
  },
  actionButtonOrange: {
    flex: 1,
    backgroundColor: '#fff7ed', // very light orange
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  actionButtonBlue: {
    flex: 1,
    backgroundColor: '#eff6ff', // very light blue
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  actionIconOrange: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffedd5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionIconBlue: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  actionSubTitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#eff6ff', // light blue
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#3b82f6', // blue text
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBgBlue: {
    backgroundColor: '#eff6ff',
  },
  iconBgOrange: {
    backgroundColor: '#fff7ed',
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    color: '#888',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  amountContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    color: '#000',
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#11704B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default PaymentsScreen;
