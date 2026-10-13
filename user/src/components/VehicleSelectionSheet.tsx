import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, ScrollView, Animated, Dimensions, Modal, ToastAndroid, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import PaymentSelectionModal from './PaymentSelectionModal';
import TipSelectionModal from './TipSelectionModal';
import OffersModal from './OffersModal';
import { getApiUrl } from '../config/url';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const { width } = Dimensions.get('window');

interface VehicleSelectionSheetProps {
  vehicles: any[];
  selectedVehicleType: number | null;
  routeInfo: any;
  booking: boolean;
  onSelectVehicle: (id: number) => void;
  onConfirmBooking: (tipAmount?: number) => void;
  onCancelBooking?: (intentionalReason?: string) => void;
  getDynamicFare: (vehicle: any) => number;
  tripType?: 'ONE_WAY' | 'TWO_WAY';
  onSelectTripType?: (type: 'ONE_WAY' | 'TWO_WAY') => void;
  isSheetExpanded?: boolean;
}

const COLORS = {
  primary: '#11704B',
  bg: '#fff',
  textTitle: '#374151',
  textSub: '#6B7280',
  selectedBorder: '#1f2937',
  selectedBg: '#f8fafc',
  buttonYellow: '#facc15'
};

const ProgressBar = () => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    animatedValue.setValue(0);
    // Set typical search timeout duration (e.g. 30 seconds)
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 30000,
      useNativeDriver: false,
    }).start();
  }, [animatedValue]);

  const widthProgress = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressBarTrack}>
      <Animated.View style={[styles.progressBarIndicator, { width: widthProgress, left: 0 }]} />
    </View>
  );
};

const AdBanner = () => {
  const [ads, setAds] = React.useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    fetch(getApiUrl('/api/ads/active'))
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          setAds(data.data);
        }
      })
      .catch(err => console.log('Error fetching ads', err));
  }, []);

  React.useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % ads.length);
      }, ads[currentIndex]?.duration_seconds ? ads[currentIndex].duration_seconds * 1000 : 5000);
      return () => clearInterval(interval);
    }
  }, [ads, currentIndex]);

  if (ads.length === 0) return null;

  const currentAd = ads[currentIndex];

  return (
    <View style={styles.adBannerContainer}>
      <Image
        source={{ uri: currentAd.image_url.startsWith('http') ? currentAd.image_url : getApiUrl(currentAd.image_url) }}
        style={styles.adBannerImage}
        resizeMode="cover"
      />
    </View>
  );
};

const VehicleSelectionSheet: React.FC<VehicleSelectionSheetProps> = ({
  vehicles,
  selectedVehicleType,
  routeInfo,
  booking,
  onSelectVehicle,
  onConfirmBooking,
  onCancelBooking,
  getDynamicFare,
  tripType = 'ONE_WAY',
  onSelectTripType,
  isSheetExpanded = true
}) => {
  const [paymentMethod, setPaymentMethod] = React.useState<string>('Cash');
  const [isPaymentModalVisible, setPaymentModalVisible] = React.useState(false);
  const [isTipModalVisible, setTipModalVisible] = React.useState(false);
  const [isOffersModalVisible, setOffersModalVisible] = React.useState(false);
  const [isTripDetailsModalVisible, setTripDetailsModalVisible] = React.useState(false);
  const [tipAmount, setTipAmount] = React.useState(0);

  const { pickupLocation, dropLocation } = useSelector((state: RootState) => state.ride);

  const togglePaymentMethod = () => {
    setPaymentModalVisible(true);
  };

  return (
    <>
      <ScrollView scrollEnabled={!booking && isSheetExpanded} showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.sheetScroll}>
        {/* Trip Type Selector */}
        {(!booking && vehicles.find((v: any) => v.id === selectedVehicleType)?.name?.toLowerCase() !== 'parcel') && (
          <View style={styles.tripTypeContainer}>
            <TouchableOpacity
              style={[styles.tripTypeBtn, tripType === 'ONE_WAY' && styles.tripTypeBtnActive]}
              onPress={() => onSelectTripType && onSelectTripType('ONE_WAY')}
            >
              <Text style={[styles.tripTypeBtnText, tripType === 'ONE_WAY' && styles.tripTypeBtnTextActive]}>ONE WAY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tripTypeBtn, tripType === 'TWO_WAY' && styles.tripTypeBtnActive]}
              onPress={() => onSelectTripType && onSelectTripType('TWO_WAY')}
            >
              <Text style={[styles.tripTypeBtnText, tripType === 'TWO_WAY' && styles.tripTypeBtnTextActive]}>TWO WAY</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.verticalVehicleList}>
          {booking ? (
            <View style={styles.searchingContainer}>
              <View style={styles.searchingHeader}>
                <Text style={styles.searchingSubtitleBold}>Every Journey Starts with City Ride</Text>
                <ProgressBar />
              </View>

              <View style={styles.activeOrderCard}>
                <Text style={styles.sectionHeader}>Active Order</Text>
                <View style={styles.orderDetailRow}>
                  <View style={styles.vehicleSelectedIconBg}>
                    <Image source={vehicles.find(v => v.id === selectedVehicleType)?.name?.toLowerCase() === 'bike' ? { uri: 'https://cdn-icons-png.flaticon.com/512/3721/3721619.png' } : (vehicles.find(v => v.id === selectedVehicleType)?.name?.toLowerCase() === 'auto' ? require('../assets/images/auto.png') : { uri: 'https://cdn-icons-png.flaticon.com/512/741/741407.png' })} style={styles.activeVehicleIcon} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.activeVehicleName}>{vehicles.find((v: any) => v.id === selectedVehicleType)?.name || 'Ride'}</Text>
                    <Text style={styles.activeVehicleFare}>₹{vehicles.find((v: any) => v.id === selectedVehicleType) ? getDynamicFare(vehicles.find((v: any) => v.id === selectedVehicleType)) + tipAmount : 0}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setTripDetailsModalVisible(true)}
                    style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', alignSelf: 'flex-start', marginTop: -5 }}
                  >
                    <Text style={{ color: '#0369A1', fontWeight: 'bold', fontSize: 14 }}>Trip Details</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Extra Tip Section for Searching Screen */}
              <View style={styles.searchingTipCard}>
                <View style={styles.searchingTipHeader}>
                  <Icon name="lightning-bolt" size={24} color="#F59E0B" style={{ marginRight: 10 }} />
                  <Text style={styles.searchingTipTitle}>Increase your chances by adding extra</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchingTipOptions}>
                  {[0, 10, 20, 30, 40, 50, 100].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.searchingTipBtn, tipAmount === amt && styles.searchingTipBtnActive]}
                      onPress={() => {
                        let newTip = amt;
                        if (amt === 0 || tipAmount === amt) {
                          newTip = 0;
                          if (tipAmount !== 0 && Platform.OS === 'android') {
                            ToastAndroid.show('Tip Canceled', ToastAndroid.SHORT);
                          }
                        }
                        setTipAmount(newTip);
                        if (onCancelBooking) onCancelBooking('TIP_UPDATE');
                        setTimeout(() => onConfirmBooking(newTip), 500);
                      }}
                    >
                      <Text style={[styles.searchingTipBtnText, tipAmount === amt && styles.searchingTipBtnTextActive]}>
                        {amt === 0 ? 'No Tip' : `+ ₹${amt}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Show Ads Instead of Alternative Vehicles */}
              <AdBanner />
            </View>
          ) : (
            vehicles.map((v: any) => {
              let imgSrc: any = { uri: 'https://cdn-icons-png.flaticon.com/512/741/741407.png' };
              let subtitle = 'Comfortable cab';
              let capacity = 4;
              let titleName = v.name;

              if (v.name.toLowerCase() === 'bike') {
                imgSrc = { uri: 'https://cdn-icons-png.flaticon.com/512/3721/3721619.png' };
                subtitle = 'Quick Bike rides';
                capacity = 1;
                titleName = 'Bike';
              } else if (v.name.toLowerCase() === 'auto') {
                imgSrc = require('../assets/images/auto.png');
                subtitle = 'Convenient auto rides';
                capacity = 3;
                titleName = 'Auto';
              } else if (v.name.toLowerCase() === 'parcel') {
                imgSrc = { uri: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' };
                subtitle = 'Send your parcel safely';
                capacity = 0;
                titleName = 'Parcel Delivery';
              } else {
                titleName = 'Cab Economy';
              }

              const isSelected = selectedVehicleType === v.id;
              const fare = getDynamicFare(v) + tipAmount;

              let dropTimeStr = '';
              let distanceStr = '';
              if (routeInfo && routeInfo.durationMinutes) {
                const dropDate = new Date(Date.now() + routeInfo.durationMinutes * 60000);
                dropTimeStr = dropDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
              }
              if (routeInfo && routeInfo.distanceKm) {
                distanceStr = `${routeInfo.distanceKm.toFixed(1)} km`;
              }

              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.vehicleRowCard, isSelected && styles.vehicleRowSelected]}
                  onPress={() => onSelectVehicle(v.id)}
                >
                  <Image source={imgSrc} style={styles.vrImage} resizeMode="contain" />
                  <View style={styles.vrDetails}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.vrName}>{titleName}</Text>
                      {titleName === 'Bike' && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>FASTEST</Text>
                        </View>
                      )}
                    </View>

                    {isSelected && <Text style={styles.vrDesc}>{subtitle}</Text>}

                    <View style={styles.vrCapacityRow}>
                      <Text style={styles.vrCapacitySub}>3 mins</Text>
                      {distanceStr ? <Text style={styles.vrCapacitySub}> • {distanceStr}</Text> : null}
                      {dropTimeStr ? <Text style={styles.vrCapacitySub}> • Drop {dropTimeStr}</Text> : null}
                      {isSelected && capacity > 0 && (
                        <>
                          <Text style={styles.vrCapacitySub}> • </Text>
                          <Icon name="account" size={14} color="#6B7280" />
                          <Text style={styles.vrCapacitySub}> {capacity}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <Text style={styles.vrPrice}>₹{fare}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Fixed Footer for Vehicle Selection */}
      <View style={styles.footerContainer}>
        {!booking && (
          <View style={styles.optionsRow3}>
           {/* <TouchableOpacity style={styles.optionBtn3} onPress={togglePaymentMethod}> */}
           <TouchableOpacity style={styles.optionBtn3} activeOpacity={1}>
              <Icon name={paymentMethod === 'Cash' ? 'cash-multiple' : (paymentMethod === 'Pay at drop' ? 'qrcode-scan' : 'bank')} size={18} color="#000" style={styles.btnIcon} />
              <Text style={styles.optionText3} numberOfLines={1}>{paymentMethod}</Text>
            </TouchableOpacity>
            <View style={styles.optionDivider2} />
            <TouchableOpacity style={styles.optionBtn3} onPress={() => setTipModalVisible(true)}>
              <Icon name="currency-inr" size={18} color="#000" style={styles.btnIcon} />
              <Text style={styles.optionText3} numberOfLines={1}>{tipAmount > 0 ? `Tip: ₹${tipAmount}` : 'Tip'}</Text>
            </TouchableOpacity>
            <View style={styles.optionDivider2} />
            <TouchableOpacity style={styles.optionBtn3} onPress={() => setOffersModalVisible(true)}>
              <Icon name="brightness-percent" size={18} color="#000" style={styles.btnIcon} />
              <Text style={styles.optionText3} numberOfLines={1}>Offers</Text>
            </TouchableOpacity>
          </View>
        )}

        {!booking && (
          <TouchableOpacity
            style={styles.finalBookBtn}
            onPress={() => onConfirmBooking(tipAmount)}
          >
            <Text style={styles.bookBtnText}>
              {vehicles.find((v: any) => v.id === selectedVehicleType)?.name?.toLowerCase() === 'parcel'
                ? 'Proceed to Parcel Details'
                : `Book ${vehicles.find((v: any) => v.id === selectedVehicleType)?.name || 'Ride'}`
              }
            </Text>
          </TouchableOpacity>
        )}

        {booking && onCancelBooking && (
          <TouchableOpacity style={{ padding: 15, alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 30 }} onPress={() => onCancelBooking()}>
            <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 16 }}>Cancel Ride Request</Text>
          </TouchableOpacity>
        )}
      </View>

      <PaymentSelectionModal
        visible={isPaymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        selectedMethod={paymentMethod}
        onSelectMethod={setPaymentMethod}
        fareAmount={vehicles.find((v: any) => v.id === selectedVehicleType) ? getDynamicFare(vehicles.find((v: any) => v.id === selectedVehicleType)) + tipAmount : 0}
      />

      <TipSelectionModal
        visible={isTipModalVisible}
        onClose={() => setTipModalVisible(false)}
        currentTip={tipAmount}
        onApplyTip={setTipAmount}
      />

      <OffersModal
        visible={isOffersModalVisible}
        onClose={() => setOffersModalVisible(false)}
      />

      <Modal
        visible={isTripDetailsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTripDetailsModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTripDetailsModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>Trip Details</Text>
              <TouchableOpacity onPress={() => setTripDetailsModalVisible(false)}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', marginTop: 4 }} />
                <View style={{ marginLeft: 15, flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: 'bold', marginBottom: 4 }}>FROM</Text>
                  <Text style={{ fontSize: 14, color: '#111827' }}>{pickupLocation?.address || 'Pickup Location'}</Text>
                </View>
              </View>

              <View style={{ height: 20, width: 2, backgroundColor: '#E5E7EB', marginLeft: 5, marginVertical: 4 }} />

              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B', marginTop: 4 }} />
                <View style={{ marginLeft: 15, flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: 'bold', marginBottom: 4 }}>TO</Text>
                  <Text style={{ fontSize: 14, color: '#111827' }}>{dropLocation?.address || 'Drop Location'}</Text>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
              <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: 'bold' }}>Trip Type</Text>
              <Text style={{ fontSize: 15, color: COLORS.primary, fontWeight: 'bold' }}>
                {tripType === 'TWO_WAY' ? 'Two Way Trip' : 'One Way Trip'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetScroll: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 30 },
  verticalVehicleList: { marginTop: -7 },
  vehicleRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 5,
    backgroundColor: 'transparent'
  },
  vehicleRowSelected: {
    borderColor: COLORS.selectedBorder,
    backgroundColor: COLORS.selectedBg,
    paddingVertical: 18,
  },
  vrImage: { width: 50, height: 40, marginRight: 15 },
  vrDetails: { flex: 1 },
  nameBadgeRow: { flexDirection: 'row', alignItems: 'center' },
  vrName: { fontSize: 16, fontWeight: '700', color: COLORS.textTitle },
  badge: { backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#047857' },
  vrDesc: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  vrCapacityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  vrCapacitySub: { fontSize: 12, color: COLORS.textSub },
  vrPrice: { fontSize: 18, fontWeight: 'bold', color: COLORS.textTitle },

  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: '#F7F8FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  optionsRow2: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  optionBtn2: { flex: 0.48, flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  btnIcon: { marginRight: 8 },
  optionText2: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1f2937' },
  optionDivider2: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 2 },

  optionsRow3: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  optionBtn3: { flex: 0.32, flexDirection: 'row', alignItems: 'center', paddingVertical: 5, justifyContent: 'center' },
  optionText3: { fontSize: 13, fontWeight: '600', color: '#1f2937', flexShrink: 1 },

  finalBookBtn: { backgroundColor: COLORS.buttonYellow, padding: 16, borderRadius: 30, alignItems: 'center' },
  bookBtnText: { color: '#1f2937', fontSize: 16, fontWeight: 'bold' },

  tripTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 15,
  },
  tripTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tripTypeBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripTypeBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  tripTypeBtnTextActive: {
    color: COLORS.primary,
  },

  // Searching UI Styles
  searchingContainer: {
    paddingHorizontal: 4,
    paddingTop: 5,
  },
  searchingHeader: {
    backgroundColor: 'transparent',
    padding: 0,
    marginBottom: 10,
  },
  searchingSubtitleBold: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: '#D1D5DB',
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative'
  },
  progressBarIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '25%',
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10
  },
  activeOrderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  vehicleSelectedIconBg: {
    width: 50,
    height: 50,
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  activeVehicleIcon: {
    width: 35,
    height: 35
  },
  activeVehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827'
  },
  activeVehicleFare: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2
  },
  altVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  altVehicleIcon: {
    width: 40,
    height: 30,
    marginRight: 15
  },
  altSelectBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20
  },
  altSelectBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151'
  },
  searchingTipCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  searchingTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchingTipTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  searchingTipOptions: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 20,
  },
  searchingTipBtn: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchingTipBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  searchingTipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  searchingTipBtnTextActive: {
    color: '#166534',
  },
  adBannerContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    height: 210,
    width: 365,
    alignSelf: 'center',
    backgroundColor: '#F3F4F6',
  },
  adBannerImage: {
    width: '100%',
    height: '100%',
  }
});

export default VehicleSelectionSheet;
