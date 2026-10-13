import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { ChevronLeft, Calendar as CalendarIcon, TrendingUp, Car, Clock, Gift, Star, ChevronRight, X, Filter } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
import api from '../../services/api';

const DriverEarningsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Today');
  
  const [showAllModal, setShowAllModal] = useState(false);
  const [modalFilter, setModalFilter] = useState('All');
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const ridesPerPage = 10;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchEarningsData(activeTab);
    }, [activeTab])
  );

  const fetchEarningsData = async (tab: string) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('driverToken');
      if (token) {
        const response = await api.get(`/api/driver/detailed-earnings?filter=${tab}`);
        const json = response.data;
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch detailed earnings', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModalData = async (tab: string) => {
    setModalLoading(true);
    try {
      const token = await AsyncStorage.getItem('driverToken');
      if (token) {
        const response = await api.get(`/api/driver/detailed-earnings?filter=${tab}`);
        const json = response.data;
        if (json.success) {
          setModalData(json.data.recentRides);
        }
      }
    } catch (error) {
      console.error('Failed to fetch modal earnings', error);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (showAllModal) {
      setCurrentPage(1); // reset to page 1 on filter change
      fetchModalData(modalFilter);
    }
  }, [showAllModal, modalFilter]);

  // Chart data is now fetched from the backend API

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Earnings</Text>
          <Text style={styles.headerSubtitle}>Track your earnings and performance</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'Today' && styles.tabButtonActive]}
            onPress={() => setActiveTab('Today')}
          >
            <CalendarIcon size={16} color={activeTab === 'Today' ? '#ffffff' : '#6B7280'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'Today' && styles.tabTextActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'Week' && styles.tabButtonActive]}
            onPress={() => setActiveTab('Week')}
          >
            <TrendingUp size={16} color={activeTab === 'Week' ? '#ffffff' : '#6B7280'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'Week' && styles.tabTextActive]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'Month' && styles.tabButtonActive]}
            onPress={() => setActiveTab('Month')}
          >
            <CalendarIcon size={16} color={activeTab === 'Month' ? '#ffffff' : '#6B7280'} style={styles.tabIcon} />
            <Text style={[styles.tabText, activeTab === 'Month' && styles.tabTextActive]}>Month</Text>
          </TouchableOpacity>
        </View>

        {loading || !data ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Main Earning Card */}
            <View style={styles.mainCard}>
              <View style={styles.mainCardTop}>
                <View>
                  <Text style={styles.mainCardLabel}>{activeTab}'s Earnings</Text>
                  <Text style={styles.mainCardAmount}>₹{data.totalEarnings}</Text>
                  <Text style={styles.mainCardSubtitle}>{data.totalRides} rides • {data.onlineTime.h}h {data.onlineTime.m}m online</Text>
                </View>
                <View style={styles.trendContainer}>
                  <View style={[styles.trendBadge, data.trend < 0 && { backgroundColor: '#FEE2E2' }]}>
                    <TrendingUp size={14} color={data.trend < 0 ? '#DC2626' : '#059669'} />
                    <Text style={[styles.trendText, data.trend < 0 && { color: '#DC2626' }]}>
                      {data.trend > 0 ? '+' : ''}{data.trend}%
                    </Text>
                  </View>
                  <Text style={styles.trendSubText}>from previous {activeTab.toLowerCase()}</Text>
                </View>
              </View>

          {/* Bar Chart Area */}
          <View style={styles.chartContainer}>
            <View style={styles.chartYAxis}>
              <Text style={styles.chartYText}>150</Text>
              <Text style={styles.chartYText}>100</Text>
              <Text style={styles.chartYText}>50</Text>
              <Text style={styles.chartYText}>0</Text>
            </View>
            <View style={styles.chartGrid}>
              <View style={styles.chartLine} />
              <View style={styles.chartLine} />
              <View style={styles.chartLine} />
              <View style={styles.chartLine} />
            </View>
            <View style={styles.chartBarsContainer}>
              {data.chartData && data.chartData.map((chartItem: any, index: number) => (
                <View key={index} style={styles.chartBarWrapper}>
                  <View style={[styles.chartBar, { height: (chartItem.height / 150) * 100 + '%' }, chartItem.active && styles.chartBarActive]} />
                  {chartItem.label ? (
                    <Text style={styles.chartXLabel}>{chartItem.label}</Text>
                  ) : (
                    <Text style={styles.chartXLabel}> </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

          {/* Grid Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#E0F2FE' }]}>
                <Car size={20} color="#0ea5e9" />
              </View>
              <Text style={styles.statLabel}>Total Rides</Text>
              <Text style={styles.statValue}>{data.totalRides}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#E0E7FF' }]}>
                <Clock size={20} color="#4f46e5" />
              </View>
              <Text style={styles.statLabel}>Online Time</Text>
              <Text style={styles.statValue}>{data.onlineTime.h}h {data.onlineTime.m}m</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                <Gift size={20} color="#d97706" />
              </View>
              <Text style={styles.statLabel}>Tips</Text>
              <Text style={styles.statValue}>₹{data.tips}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: '#F3E8FF' }]}>
                <Star size={20} color="#9333ea" />
              </View>
              <Text style={styles.statLabel}>Incentives</Text>
              <Text style={styles.statValue}>₹{data.incentives}</Text>
            </View>
          </View>

          {/* Recent Earnings */}
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Earnings</Text>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center' }}
              onPress={() => setShowAllModal(true)}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color="#059669" />
            </TouchableOpacity>
          </View>

          <View style={styles.recentList}>
            {data.recentRides.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280' }}>No recent rides</Text>
              </View>
            ) : (
              data.recentRides.slice(0, 10).map((item: any) => (
                <TouchableOpacity key={item.id} style={styles.recentItem} onPress={() => setSelectedRide(item)}>
                  <View style={styles.recentIconWrapper}>
                    {item.type.includes('Bike') ? (
                      <Text style={{fontSize: 20}}>B</Text>
                    ) : (
                      <Car size={20} color="#4B5563" />
                    )}
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentTime}>{item.time}</Text>
                    <Text style={styles.recentType}>{item.type}</Text>
                    <Text style={styles.recentDetails}>{item.details}</Text>
                  </View>
                  <View style={styles.recentRight}>
                    <View style={styles.recentTotalBadge}>
                      <Text style={styles.recentTotalText}>₹{item.total}</Text>
                    </View>
                    <View style={styles.recentBreakdown}>
                      <Text style={styles.recentFare}>Fare ₹{item.fare}</Text>
                      <Text style={styles.recentPlus}> + </Text>
                      <Text style={styles.recentTip}>Tip ₹{item.tip}</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" style={{ marginLeft: 10 }} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
      </ScrollView>

      {/* View All Modal */}
      <Modal visible={showAllModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: insets.top + 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowAllModal(false)} style={{ marginRight: 15 }}>
                <X size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Ride History</Text>
            </View>
          </View>
          
          <View style={{ padding: 15 }}>
            <View style={styles.tabContainer}>
              <TouchableOpacity style={[styles.tabButton, modalFilter === 'Today' && styles.tabButtonActive]} onPress={() => setModalFilter('Today')}>
                <Text style={[styles.tabText, modalFilter === 'Today' && styles.tabTextActive]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, modalFilter === 'Week' && styles.tabButtonActive]} onPress={() => setModalFilter('Week')}>
                <Text style={[styles.tabText, modalFilter === 'Week' && styles.tabTextActive]}>Week</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, modalFilter === 'Month' && styles.tabButtonActive]} onPress={() => setModalFilter('Month')}>
                <Text style={[styles.tabText, modalFilter === 'Month' && styles.tabTextActive]}>Month</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabButton, modalFilter === 'All' && styles.tabButtonActive]} onPress={() => setModalFilter('All')}>
                <Text style={[styles.tabText, modalFilter === 'All' && styles.tabTextActive]}>All Time</Text>
              </TouchableOpacity>
            </View>
          </View>

          {modalLoading ? (
            <ActivityIndicator size="large" color="#059669" style={{ marginTop: 50 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {modalData.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 50 }}>
                  <Text style={{ color: '#6B7280', fontSize: 16 }}>No rides found for {modalFilter}</Text>
                </View>
              ) : (
                <View>
                  {modalData.slice((currentPage - 1) * ridesPerPage, currentPage * ridesPerPage).map((item: any) => (
                    <TouchableOpacity key={item.id} style={styles.recentItem} onPress={() => setSelectedRide(item)}>
                      <View style={styles.recentIconWrapper}>
                        {item.type.includes('Bike') ? (
                          <Text style={{fontSize: 20}}>B</Text>
                        ) : (
                          <Car size={20} color="#4B5563" />
                        )}
                      </View>
                      <View style={styles.recentInfo}>
                        <Text style={styles.recentTime}>{item.time}</Text>
                        <Text style={styles.recentType}>{item.type}</Text>
                        <Text style={styles.recentDetails}>{item.details}</Text>
                      </View>
                      <View style={styles.recentRight}>
                        <View style={styles.recentTotalBadge}>
                          <Text style={styles.recentTotalText}>₹{item.total}</Text>
                        </View>
                        <View style={styles.recentBreakdown}>
                          <Text style={styles.recentFare}>Fare ₹{item.fare}</Text>
                          <Text style={styles.recentPlus}> + </Text>
                          <Text style={styles.recentTip}>Tip ₹{item.tip}</Text>
                        </View>
                      </View>
                      <ChevronRight size={20} color="#9CA3AF" style={{ marginLeft: 10 }} />
                    </TouchableOpacity>
                  ))}
                  
                  {/* Pagination Controls */}
                  {modalData.length > ridesPerPage && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity 
                        style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                        disabled={currentPage === 1}
                        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      >
                        <ChevronLeft size={20} color={currentPage === 1 ? "#D1D5DB" : "#4B5563"} />
                      </TouchableOpacity>
                      
                      <View style={styles.pageNumbers}>
                        {Array.from({ length: Math.ceil(modalData.length / ridesPerPage) }).map((_, i) => (
                          <TouchableOpacity 
                            key={i} 
                            style={[styles.pageNumberBtn, currentPage === i + 1 && styles.pageNumberBtnActive]}
                            onPress={() => setCurrentPage(i + 1)}
                          >
                            <Text style={[styles.pageNumberText, currentPage === i + 1 && styles.pageNumberTextActive]}>
                              {i + 1}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <TouchableOpacity 
                        style={[styles.pageButton, currentPage === Math.ceil(modalData.length / ridesPerPage) && styles.pageButtonDisabled]}
                        disabled={currentPage === Math.ceil(modalData.length / ridesPerPage)}
                        onPress={() => setCurrentPage(prev => Math.min(Math.ceil(modalData.length / ridesPerPage), prev + 1))}
                      >
                        <Text style={[styles.pageNextText, currentPage === Math.ceil(modalData.length / ridesPerPage) && {color: "#D1D5DB"}]}>Next</Text>
                        <ChevronRight size={20} color={currentPage === Math.ceil(modalData.length / ridesPerPage) ? "#D1D5DB" : "#4B5563"} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Ride Details Modal */}
      {selectedRide && (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedRide(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: insets.top + 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setSelectedRide(null)} style={{ marginRight: 15 }}>
                  <X size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Ride Details</Text>
              </View>
            </View>
            
            <ScrollView style={{ padding: 20 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <View>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>Ride ID</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>#{selectedRide.id}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>Date & Time</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{selectedRide.time}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                      {selectedRide.type.includes('Bike') ? (
                        <Text style={{fontSize: 20}}>B</Text>
                      ) : (
                        <Car size={20} color="#4B5563" />
                      )}
                    </View>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{selectedRide.type}</Text>
                      <Text style={{ fontSize: 14, color: '#6B7280' }}>Distance: {selectedRide.details}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 10 }}>Earnings Breakdown</Text>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, color: '#4B5563' }}>Base Fare</Text>
                    <Text style={{ fontSize: 15, color: '#111827' }}>₹{selectedRide.fare}</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, color: '#4B5563' }}>Tips</Text>
                    <Text style={{ fontSize: 15, color: '#10B981' }}>+ ₹{selectedRide.tip}</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>Total Earnings</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#059669' }}>₹{selectedRide.total}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 30,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 25,
  },
  tabButtonActive: {
    backgroundColor: '#059669',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  mainCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  mainCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mainCardLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  mainCardAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 4,
  },
  mainCardSubtitle: {
    fontSize: 13,
    color: '#4B5563',
  },
  trendContainer: {
    alignItems: 'flex-end',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  trendText: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  trendSubText: {
    fontSize: 11,
    color: '#6B7280',
  },
  chartContainer: {
    height: 140,
    flexDirection: 'row',
    marginTop: 10,
  },
  chartYAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingBottom: 20, // space for x labels
  },
  chartYText: {
    fontSize: 10,
    color: '#6B7280',
  },
  chartGrid: {
    position: 'absolute',
    top: 0,
    left: 30,
    right: 0,
    bottom: 20,
    justifyContent: 'space-between',
  },
  chartLine: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  chartBarsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartBarWrapper: {
    alignItems: 'center',
    width: 15,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: 12,
    backgroundColor: '#86EFAC',
    borderRadius: 6,
    marginBottom: 5,
  },
  chartBarActive: {
    backgroundColor: '#059669',
  },
  chartXLabel: {
    fontSize: 9,
    color: '#6B7280',
    height: 15,
    width: 30,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    width: (width - 50) / 4 - 2, // 4 items per row
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginRight: 2,
  },
  recentList: {
    backgroundColor: '#ffffff',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentTime: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  recentType: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  recentDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentTotalBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  recentTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  recentBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentFare: {
    fontSize: 11,
    color: '#6B7280',
  },
  recentPlus: {
    fontSize: 11,
    color: '#6B7280',
  },
  recentTip: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 5,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageNumberBtn: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F3F4F6',
  },
  pageNumberBtnActive: {
    backgroundColor: '#059669',
  },
  pageNumberText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
  },
  pageNextText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    marginRight: 4,
  }
});

export default DriverEarningsScreen;
