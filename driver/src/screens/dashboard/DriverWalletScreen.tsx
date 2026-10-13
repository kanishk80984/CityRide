import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Wallet,
  Info,
  ChevronRight,
  Calendar,
  BarChart2,
  History,
  Clock,
  Landmark,
  TrendingUp,
  X,
  CheckCircle,
  XCircle,
  Clock as ClockIcon
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import api from '../../services/api';

const DriverWalletScreen = () => {
  const insets = useSafeAreaInsets();
  const [walletData, setWalletData] = useState({
    balance: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  });
  const [loading, setLoading] = useState(true);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);

  // Withdraw Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Modals state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [historyType, setHistoryType] = useState('WITHDRAW'); // 'WITHDRAW', 'RECHARGE', 'COMMISSION'
  const [transactionTab, setTransactionTab] = useState('Completed'); // 'Pending', 'Completed', 'Canceled'
  const [transactionPage, setTransactionPage] = useState(1);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  // Bank details state
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifsc: ''
  });

  const filteredTransactions = historyType === 'WITHDRAW'
    ? transactions.filter(t => t.status === transactionTab)
    : walletHistory; // Recharges/Commissions don't use 'Pending/Completed' tabs for now

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (transactionPage - 1) * itemsPerPage,
    transactionPage * itemsPerPage
  );

  useFocusEffect(
    useCallback(() => {
      fetchWalletData();
      fetchTransactions();
      fetchWalletHistory('RECHARGE');
      fetchWalletHistory('COMMISSION');
    }, [])
  );

  const fetchWalletData = async () => {
    try {
      const token = await AsyncStorage.getItem('driverToken');

      if (token) {
        // Fetch wallet stats
        const response = await api.get('/api/driver/wallet');
        const data = response.data;
        if (data.success) {
          setWalletData(data.data);
        }

        // Fetch bank account details
        const bankResponse = await api.get('/api/driver/bank-account');
        const bankData = bankResponse.data;
        if (bankData.success && bankData.data) {
          setBankDetails({
            accountName: bankData.data.account_name || '',
            accountNumber: bankData.data.account_number || '',
            confirmAccountNumber: bankData.data.account_number || '',
            ifsc: bankData.data.ifsc || ''
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch wallet data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = await AsyncStorage.getItem('driverToken');
      if (token) {
        const response = await api.get('/api/driver/withdrawals');
        const data = response.data;
        if (data.success) {
          setTransactions(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    }
  };

  const fetchWalletHistory = async (type: string) => {
    try {
      const token = await AsyncStorage.getItem('driverToken');
      if (token) {
        const response = await api.get(`/api/driver/transactions?type=${type}`);
        const data = response.data;
        if (data.success) {
          // Store both in walletHistory when selected, but for now we can just fetch on tab change
          if (historyType === type) {
            setWalletHistory(data.data);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${type} history`, error);
    }
  };

  useEffect(() => {
    if (historyType === 'WITHDRAW') {
      fetchTransactions();
    } else {
      setWalletHistory([]);
      fetchWalletHistory(historyType);
    }
    setTransactionPage(1);
  }, [historyType]);

  const requestWithdrawal = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (Number(withdrawAmount) > walletData.balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    setWithdrawLoading(true);
    try {
      const token = await AsyncStorage.getItem('driverToken');
      if (token) {
        const response = await api.post('/api/driver/withdraw', { amount: Number(withdrawAmount) });
        const data = response.data;
        if (data.success) {
          Alert.alert('Success', 'Withdrawal request sent successfully');
          setShowWithdrawModal(false);
          setWithdrawAmount('');
          // Refresh data
          fetchWalletData();
          fetchTransactions();
        } else {
          Alert.alert('Error', data.message || 'Failed to request withdrawal');
        }
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifsc) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
      Alert.alert('Error', 'Account numbers do not match');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('driverToken');
      const response = await api.post('/api/driver/bank-account', {
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
        ifsc: bankDetails.ifsc
      });
      const data = response.data;

      if (data.success) {
        Alert.alert('Success', 'Bank account details saved successfully');
        setShowBankModal(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to save bank details');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save bank details');
    }
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <Text style={styles.headerSubtitle}>View your earnings and transactions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {loading ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceLeft}>
                <View style={styles.walletIconWrapper}>
                  <Wallet size={24} color="#059669" />
                </View>
                <View>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  <Text style={styles.balanceAmount}>₹{walletData.balance.toLocaleString('en-IN')}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.withdrawBtn} onPress={() => setShowWithdrawModal(true)}>
                <Text style={styles.withdrawText}>Withdraw</Text>
              </TouchableOpacity>
            </View>

            {/* Notice Banner */}
            <View style={styles.noticeBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Info size={18} color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.noticeText}>Payouts are processed every Monday</Text>
              </View>
            </View>

            {/* Earnings Overview */}
            <View style={styles.earningsHeader}>
              <Text style={styles.sectionTitle}>Earnings Overview</Text>
            </View>

            <View style={styles.earningsGrid}>
              <View style={styles.earningItem}>
                <Calendar size={20} color="#3B82F6" />
                <Text style={styles.earningAmount}>₹{walletData.today.toLocaleString('en-IN')}</Text>
                <Text style={styles.earningLabel}>Today</Text>
              </View>

              <View style={styles.dividerVertical} />

              <View style={styles.earningItem}>
                <Calendar size={20} color="#10B981" />
                <Text style={styles.earningAmount}>₹{walletData.thisWeek.toLocaleString('en-IN')}</Text>
                <Text style={styles.earningLabel}>This Week</Text>
              </View>

              <View style={styles.dividerVertical} />

              <View style={styles.earningItem}>
                <BarChart2 size={20} color="#10B981" />
                <Text style={styles.earningAmount}>₹{walletData.thisMonth.toLocaleString('en-IN')}</Text>
                <Text style={styles.earningLabel}>This Month</Text>
              </View>
            </View>

            {/* Menu Options */}
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setShowTransactionModal(true); setTransactionPage(1); }}>
                <View style={styles.menuIconWrapper}>
                  <History size={20} color="#4B5563" />
                </View>
                <View style={styles.menuTextWrapper}>
                  <Text style={styles.menuTitle}>Transaction History</Text>
                  <Text style={styles.menuSubtitle}>View all your transactions</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowPayoutModal(true)}>
                <View style={styles.menuIconWrapper}>
                  <Clock size={20} color="#4B5563" />
                </View>
                <View style={styles.menuTextWrapper}>
                  <Text style={styles.menuTitle}>Payout History</Text>
                  <Text style={styles.menuSubtitle}>Check past payouts</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowBankModal(true)}>
                <View style={styles.menuIconWrapper}>
                  <Landmark size={20} color="#4B5563" />
                </View>
                <View style={styles.menuTextWrapper}>
                  <Text style={styles.menuTitle}>Add Bank Account</Text>
                  <Text style={styles.menuSubtitle}>Manage your bank details</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Promo Banner */}
            <View style={styles.promoBanner}>
              <View style={styles.promoIconWrapper}>
                <TrendingUp size={28} color="#F59E0B" />
              </View>
              <View style={styles.promoTextWrapper}>
                <Text style={styles.promoTitle}>Earn More with Eagle</Text>
                <Text style={styles.promoSubtitle}>Complete more rides and get higher earnings!</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Transaction History Modal */}
      <Modal visible={showTransactionModal} animationType="slide" transparent={true} onRequestClose={() => setShowTransactionModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowTransactionModal(false)} style={{ marginRight: 15 }}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Transaction History</Text>
            </View>
          </View>


          {historyType === 'WITHDRAW' && (
            <View style={[styles.tabContainer, { marginTop: -10, marginBottom: 10, borderBottomWidth: 0, paddingHorizontal: 15 }]}>
              <TouchableOpacity style={[styles.tabButton, transactionTab === 'Pending' && styles.tabButtonActive]} onPress={() => { setTransactionTab('Pending'); setTransactionPage(1); }}>
                <Text style={[styles.tabText, transactionTab === 'Pending' && styles.tabTextActive]}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, transactionTab === 'Completed' && styles.tabButtonActive]} onPress={() => { setTransactionTab('Completed'); setTransactionPage(1); }}>
                <Text style={[styles.tabText, transactionTab === 'Completed' && styles.tabTextActive]}>Completed</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, transactionTab === 'Canceled' && styles.tabButtonActive]} onPress={() => { setTransactionTab('Canceled'); setTransactionPage(1); }}>
                <Text style={[styles.tabText, transactionTab === 'Canceled' && styles.tabTextActive]}>Canceled</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={{ padding: 15, flex: 1 }}>
            {paginatedTransactions.length > 0 ? paginatedTransactions.map((item, index) => (
              <View key={index} style={styles.txnCard}>
                <View style={styles.txnIconWrapper}>
                  {historyType === 'WITHDRAW' ? (
                    <>
                      {item.status === 'Completed' && <CheckCircle size={24} color="#10B981" />}
                      {item.status === 'Pending' && <ClockIcon size={24} color="#F59E0B" />}
                      {item.status === 'Canceled' && <XCircle size={24} color="#EF4444" />}
                    </>
                  ) : historyType === 'RECHARGE' ? (
                    <TrendingUp size={24} color="#10B981" />
                  ) : (
                    <History size={24} color="#EF4444" />
                  )}
                </View>
                <View style={styles.txnDetails}>
                  <Text style={styles.txnId}>
                    {historyType === 'WITHDRAW' ? `Withdrawal ${item.id}` : item.id}
                  </Text>
                  <Text style={styles.txnDate}>{item.date}</Text>
                  {historyType !== 'WITHDRAW' && item.notes && (
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{item.notes}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.txnAmount, { color: historyType === 'COMMISSION' ? '#EF4444' : '#111827' }]}>
                    {historyType === 'COMMISSION' ? '-' : ''}₹{item.amount}
                  </Text>
                  {historyType === 'WITHDRAW' && (
                    <Text style={[styles.txnStatus, { color: item.status === 'Completed' ? '#10B981' : item.status === 'Pending' ? '#F59E0B' : '#EF4444' }]}>
                      {item.status}
                    </Text>
                  )}
                </View>
              </View>
            )) : (
              <Text style={{ textAlign: 'center', marginTop: 50, color: '#6B7280' }}>
                No {historyType === 'WITHDRAW' ? transactionTab.toLowerCase() : historyType.toLowerCase()} transactions found.
              </Text>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[styles.pageButton, transactionPage === 1 && styles.pageButtonDisabled]}
                  disabled={transactionPage === 1}
                  onPress={() => setTransactionPage(p => p - 1)}
                >
                  <ChevronRight size={20} color="#4B5563" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>

                <View style={styles.pageNumbers}>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.pageNumberBtn, transactionPage === i + 1 && styles.pageNumberBtnActive]}
                      onPress={() => setTransactionPage(i + 1)}
                    >
                      <Text style={[styles.pageNumberText, transactionPage === i + 1 && styles.pageNumberTextActive]}>{i + 1}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.pageButton, transactionPage === totalPages && styles.pageButtonDisabled]}
                  disabled={transactionPage === totalPages}
                  onPress={() => setTransactionPage(p => p + 1)}
                >
                  <Text style={styles.pageNextText}>Next</Text>
                  <ChevronRight size={18} color="#4B5563" />
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Tabs */}
          <View style={[styles.footerTabContainer, { paddingBottom: Platform.OS === 'android' ? 40 : 20 }]}>
            <TouchableOpacity style={styles.footerTabItem} onPress={() => setHistoryType('WITHDRAW')}>
              <Landmark size={24} color={historyType === 'WITHDRAW' ? '#059669' : '#9CA3AF'} />
              <Text style={[styles.footerTabText, historyType === 'WITHDRAW' && styles.footerTabTextActive]}>Withdraw</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerTabItem} onPress={() => setHistoryType('RECHARGE')}>
              <TrendingUp size={24} color={historyType === 'RECHARGE' ? '#059669' : '#9CA3AF'} />
              <Text style={[styles.footerTabText, historyType === 'RECHARGE' && styles.footerTabTextActive]}>Recharge</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.footerTabItem} onPress={() => setHistoryType('COMMISSION')}>
              <History size={24} color={historyType === 'COMMISSION' ? '#059669' : '#9CA3AF'} />
              <Text style={[styles.footerTabText, historyType === 'COMMISSION' && styles.footerTabTextActive]}>Commission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payout History Modal */}
      <Modal visible={showPayoutModal} animationType="slide" transparent={true} onRequestClose={() => setShowPayoutModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowPayoutModal(false)} style={{ marginRight: 15 }}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Payout History</Text>
            </View>
          </View>
          <ScrollView style={{ padding: 15, flex: 1 }}>
            {transactions.filter(t => t.status === 'Completed').length > 0 ? (
              transactions.filter(t => t.status === 'Completed').map((item, index) => (
                <View key={index} style={styles.txnCard}>
                  <View style={styles.txnIconWrapper}>
                    <CheckCircle size={24} color="#10B981" />
                  </View>
                  <View style={styles.txnDetails}>
                    <Text style={styles.txnId}>Payout {item.id}</Text>
                    <Text style={styles.txnDate}>{item.date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.txnAmount}>₹{item.amount}</Text>
                    <Text style={[styles.txnStatus, { color: '#10B981' }]}>
                      Completed
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', marginTop: 50 }}>
                <ClockIcon size={48} color="#9CA3AF" style={{ marginBottom: 15 }} />
                <Text style={{ fontSize: 18, color: '#4B5563', fontWeight: 'bold' }}>No Recent Payouts</Text>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Add Bank Account Modal */}
      <Modal visible={showBankModal} animationType="slide" transparent={true} onRequestClose={() => setShowBankModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowBankModal(false)} style={{ marginRight: 15 }}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Bank Account</Text>
            </View>
          </View>
          <ScrollView style={{ padding: 20, flex: 1 }}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe"
                placeholderTextColor="#9CA3AF"
                value={bankDetails.accountName}
                onChangeText={(text) => setBankDetails({ ...bankDetails, accountName: text })}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Account Number"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
                value={bankDetails.accountNumber}
                onChangeText={(text) => setBankDetails({ ...bankDetails, accountNumber: text })}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Re-enter Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter Account Number"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
                value={bankDetails.confirmAccountNumber}
                onChangeText={(text) => setBankDetails({ ...bankDetails, confirmAccountNumber: text })}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. HDFC0001234"
                autoCapitalize="characters"
                placeholderTextColor="#9CA3AF"
                value={bankDetails.ifsc}
                onChangeText={(text) => setBankDetails({ ...bankDetails, ifsc: text })}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBankDetails}>
              <Text style={styles.saveBtnText}>Save Account</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Request Withdrawal Modal */}
      <Modal visible={showWithdrawModal} animationType="fade" transparent={true} onRequestClose={() => setShowWithdrawModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.withdrawModalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>Available Balance: ₹{walletData.balance}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount to withdraw"
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, withdrawLoading && { opacity: 0.7 }]}
              onPress={requestWithdrawal}
              disabled={withdrawLoading}
            >
              {withdrawLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Send Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  balanceCard: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconWrapper: {
    backgroundColor: '#ffffff',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  balanceLabel: {
    color: '#D1FAE5',
    fontSize: 13,
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  withdrawBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  withdrawText: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 14,
  },
  noticeBanner: {
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 25,
  },
  noticeText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '500',
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewAllText: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 14,
  },
  earningsGrid: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 20,
    marginBottom: 25,
  },
  earningItem: {
    flex: 1,
    alignItems: 'center',
  },
  dividerVertical: {
    width: 1,
    backgroundColor: '#F3F4F6',
    height: '100%',
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 10,
    marginBottom: 4,
  },
  earningLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 25,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
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
    marginLeft: 60,
  },
  promoBanner: {
    backgroundColor: '#F0F9FF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
  },
  promoIconWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  promoTextWrapper: {
    flex: 1,
    paddingRight: 10,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#059669',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#059669',
  },
  txnCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  txnIconWrapper: {
    marginRight: 15,
  },
  txnDetails: {
    flex: 1,
  },
  txnId: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  txnDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  txnAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  txnStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 5,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageNextText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginRight: 5,
  },
  pageNumbers: {
    flexDirection: 'row',
  },
  pageNumberBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 4,
  },
  pageNumberBtnActive: {
    backgroundColor: '#059669',
  },
  pageNumberText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  pageNumberTextActive: {
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  saveBtn: {
    backgroundColor: '#059669',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  withdrawModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  footerTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  footerTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  footerTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 4,
  },
  footerTabTextActive: {
    color: '#059669',
    fontWeight: '600',
  }
});

export default DriverWalletScreen;
