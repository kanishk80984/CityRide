import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, DeviceEventEmitter, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Minus, ChevronDown, ChevronUp, Bike, Car, Truck } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OrderCard = ({ item, onAccept, onReject, onView, isHistory }: any) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (item.status === 'expired' || item.status === 'rejected') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [item.status]);

  useEffect(() => {
    if (timeLeft === 0 && item.status !== 'expired' && item.status !== 'rejected') {
      onReject(item.rideId, 'expired');
    }
  }, [timeLeft, item.status]);

  const radius = 18;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / 15) * circumference;

  const getVehicleIcon = (name: string) => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('bike') || lower.includes('scooty')) return <Bike size={16} color="#1e293b" style={{ marginRight: 6 }} />;
    if (lower.includes('car')) return <Car size={16} color="#1e293b" style={{ marginRight: 6 }} />;
    return <Truck size={16} color="#1e293b" style={{ marginRight: 6 }} />;
  };

  const getOrderTime = () => {
    const date = item.receivedAt ? new Date(item.receivedAt) : new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TouchableOpacity
      style={styles.orderCard}
      activeOpacity={isHistory ? 0.7 : 1}
      onPress={() => isHistory && setIsExpanded(!isExpanded)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.vehicleBadge}>
            {getVehicleIcon(item.vehicle_name)}
            <Text style={styles.vehicleBadgeText}>{item.vehicle_name || 'Parcel'}</Text>
          </View>
          {item.trip_type === 'TWO_WAY' ? (
            <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 6, borderWidth: 1, borderColor: '#C7D2FE' }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#4F46E5' }}>Two-Way 🔄</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 6, borderWidth: 1, borderColor: '#BBF7D0' }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#16A34A' }}>One-Way ➡️</Text>
            </View>
          )}
          <Text style={{ marginLeft: 6, fontSize: 12, color: '#64748b', fontWeight: '500' }}>
            {getOrderTime()}
          </Text>
          {isHistory && !isExpanded && (
            <Text style={{ marginLeft: 12, fontSize: 24, color: '#111827', fontWeight: 'bold' }}>
              ₹{item.estimated_fare || 0}
              {item.tip > 0 && <Text style={{ color: '#059669' }}> + ₹{item.tip}</Text>}
            </Text>
          )}
        </View>
        <View style={styles.cardHeaderRight}>
          {isHistory && (
            <View style={{ padding: 4 }}>
              {isExpanded ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
            </View>
          )}
        </View>
      </View>

      {(!isHistory || isExpanded) && (
        <>
          <View style={styles.priceRow}>
            <Text style={styles.mainPrice}>₹{item.estimated_fare || 0}</Text>
            {item.tip > 0 && <Text style={styles.tipPrice}> + ₹{item.tip} <Text style={{ fontSize: 12, color: '#666' }}>(Tip)</Text></Text>}
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: '#059669' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.distanceText}>{(item.driver_distance || 0)} km (To Pickup)</Text>
                <Text style={styles.addressText} numberOfLines={2}>{item.pickup?.address}</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <View style={[styles.dot, { backgroundColor: '#0f172a' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.distanceText}>{(item.distance || 0)} km (To Drop)</Text>
                <Text style={styles.addressText} numberOfLines={2}>{item.drop?.address}</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            {item.status !== 'expired' && item.status !== 'rejected' && (
              <TouchableOpacity
                style={{ width: 50, height: 50, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}
                onPress={() => onReject(item.rideId, 'rejected')}
              >
                <Svg width="50" height="50" style={{ position: 'absolute' }}>
                  <Circle cx="25" cy="25" r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
                  <Circle
                    cx="25" cy="25" r={radius}
                    stroke="#9ca3af"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 25 25)"
                  />
                </Svg>
                <Minus size={24} color="#374151" />
                <Text style={{ position: 'absolute', right: -5, bottom: -5, fontSize: 10, color: '#666', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 2 }}>
                  {timeLeft}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.acceptBtn,
                { flex: 1, backgroundColor: (item.status === 'expired' || item.status === 'rejected') ? '#e5e7eb' : '#fbbf24', borderRadius: 25, paddingVertical: 14 }
              ]}
              onPress={() => onAccept(item)}
              disabled={item.status === 'expired' || item.status === 'rejected'}
            >
              <Text style={[styles.acceptBtnText, { color: (item.status === 'expired' || item.status === 'rejected') ? '#9ca3af' : '#111827' }]}>
                {(item.status === 'expired') ? 'Expired' : (item.status === 'rejected') ? 'Rejected' : 'Accept'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};

const DriverOrdersScreen = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const ordersRef = React.useRef<any[]>([]);
  const [missedOrders, setMissedOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'received'>('active');
  const [receivedFilter, setReceivedFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Load historical orders
    AsyncStorage.getItem('driver_missed_orders').then(data => {
      if (data) {
        try {
          setMissedOrders(JSON.parse(data));
        } catch (e) { }
      }
    });

    const subscription1 = DeviceEventEmitter.addListener('onlineStatusChanged', (status) => {
      setIsOnline(status);
    });

    const subscription2 = DeviceEventEmitter.addListener('newRideRequest', (data) => {
      setOrders(prev => {
        if (prev.find(r => r.rideId === data.rideId)) return prev;
        const newOrders = [data, ...prev];
        ordersRef.current = newOrders;
        return newOrders;
      });
    });

    const subscription3 = DeviceEventEmitter.addListener('removeRideRequest', (rideId) => {
      setOrders(prev => {
        const newOrders = prev.filter(r => r.rideId !== rideId);
        ordersRef.current = newOrders;
        return newOrders;
      });
    });

    DeviceEventEmitter.emit('queryOnlineStatus');
    DeviceEventEmitter.emit('queryPendingOrders');

    return () => {
      subscription1.remove();
      subscription2.remove();
      subscription3.remove();
    };
  }, []);

  const handleToggle = (value: boolean) => {
    DeviceEventEmitter.emit('toggleOnlineRequest', value);
  };

  const handleViewOrder = (order: any) => {
    DeviceEventEmitter.emit('viewRideRequest', order);
  };

  const handleAcceptOrder = (order: any) => {
    navigation.navigate('HomeTab');
    setTimeout(() => {
      DeviceEventEmitter.emit('acceptSpecificRide', order);
    }, 100);
  };

  const handleRejectOrder = (rideId: string, reason: string) => {
    const order = ordersRef.current.find(o => o.rideId === rideId);
    if (order) {
      setMissedOrders(old => {
        const newHistory = [{ ...order, status: reason, receivedAt: Date.now() }, ...old];
        const trimmed = newHistory.slice(0, 50);
        AsyncStorage.setItem('driver_missed_orders', JSON.stringify(trimmed));
        return trimmed;
      });
    }

    setOrders(prev => {
      const newOrders = prev.filter(o => o.rideId !== rideId);
      ordersRef.current = newOrders;
      return newOrders;
    });
    DeviceEventEmitter.emit('removeRideRequest', rideId);
  };

  const renderOrderCardWrapper = ({ item }: { item: any }) => {
    return (
      <OrderCard
        item={item}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
        onView={handleViewOrder}
        isHistory={activeTab === 'received'}
      />
    );
  };

  const getFilteredMissedOrders = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today (midnight)

    return missedOrders.filter(order => {
      if (!order.receivedAt) return true;
      const orderDate = new Date(order.receivedAt);

      if (receivedFilter === 'today') {
        return orderDate >= today;
      }
      if (receivedFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
      }
      if (receivedFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return orderDate >= monthAgo;
      }
      return true; // 'all'
    });
  };

  const displayedOrders = activeTab === 'active' ? orders : getFilteredMissedOrders();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'active' && styles.tabBtnTextActive]}>
              {orders.length > 0 ? `${orders.length} Orders` : 'Orders'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'received' && styles.tabBtnActive]}
            onPress={() => setActiveTab('received')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'received' && styles.tabBtnTextActive]}>
              Received Orders
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'received' && (
        <View style={styles.filterBar}>
          <TouchableOpacity onPress={() => setReceivedFilter('today')} style={[styles.filterChip, receivedFilter === 'today' && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, receivedFilter === 'today' && styles.filterChipTextActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setReceivedFilter('week')} style={[styles.filterChip, receivedFilter === 'week' && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, receivedFilter === 'week' && styles.filterChipTextActive]}>This Week</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setReceivedFilter('month')} style={[styles.filterChip, receivedFilter === 'month' && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, receivedFilter === 'month' && styles.filterChipTextActive]}>This Month</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setReceivedFilter('all')} style={[styles.filterChip, receivedFilter === 'all' && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, receivedFilter === 'all' && styles.filterChipTextActive]}>All Time</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {displayedOrders.length > 0 ? (
          <FlatList
            data={displayedOrders}
            keyExtractor={(item, index) => item.rideId ? item.rideId.toString() : index.toString()}
            renderItem={renderOrderCardWrapper}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.centerContainer}>
            {activeTab === 'active' ? (
              isOnline ? (
                <Text style={styles.statusText}>You are On-Duty. Waiting for orders...</Text>
              ) : (
                <>
                  <Text style={styles.statusText}>Go On-Duty to receive orders.</Text>
                  <View style={styles.toggleContainer}>
                    <Text style={styles.toggleLabel}>OFF DUTY</Text>
                    <Switch
                      value={isOnline}
                      onValueChange={handleToggle}
                      trackColor={{ false: '#d1d5db', true: '#a7f3d0' }}
                      thumbColor={isOnline ? '#059669' : '#f8fafc'}
                      style={styles.switch}
                    />
                  </View>
                </>
              )
            ) : (
              <Text style={styles.statusText}>No missed or rejected orders yet.</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f1f5f9',
  },
  tabBtnActive: {
    backgroundColor: '#0f172a',
  },
  tabBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  vehicleBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
  },
  cardHeaderRight: {
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  mainPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
  },
  tipPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 2,
  },
  routeContainer: {
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 12,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 13,
    color: '#64748b',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#e2e8f0',
    marginLeft: 4,
    marginVertical: 4,
  },
  acceptBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  smallViewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  smallViewBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
  }
});

export default DriverOrdersScreen;
