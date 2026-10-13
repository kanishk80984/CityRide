import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiClient from '../../services/apiClient';
import { setDropLocation, setPickupLocation, setMapSelectionMode } from '../../store/rideSlice';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { RootState } from '../../store/store';

const COLORS = {
  primary: '#11704B',
  bg: '#fff',
  text: '#000',
  subText: '#666',
  border: '#E8E8E8',
};

type LocationSearchRouteProp = RouteProp<RootStackParamList, 'LocationSearch'>;



const LocationSearchScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<LocationSearchRouteProp>();
  const dispatch = useDispatch();

  const [activeField, setActiveField] = useState<'pickup' | 'drop'>(route.params?.isPickup ? 'pickup' : 'drop');
  const pickupLocation = useSelector((state: RootState) => state.ride.pickupLocation);
  const dropLocation = useSelector((state: RootState) => state.ride.dropLocation);

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [allPopularLocations, setAllPopularLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchPopularLocations();
  }, []);

  const fetchPopularLocations = async () => {
    try {
      const res = await apiClient.get('/maps/popular-locations');
      if (res.data?.success && res.data.popularLocations) {
        setAllPopularLocations(res.data.popularLocations);
      }
    } catch (err) {
      console.log('Failed to fetch popular locations', err);
    }
  };

  const popularLocations = React.useMemo(() => {
    if (!allPopularLocations || allPopularLocations.length === 0) return [];

    let referenceLoc = null;
    if (activeField === 'drop') {
      referenceLoc = pickupLocation;
    } else {
      referenceLoc = dropLocation || pickupLocation;
    }

    if (referenceLoc) {
      const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      };

      return allPopularLocations
        .map((p: any) => ({ ...p, distance: getDistance(referenceLoc.latitude, referenceLoc.longitude, parseFloat(p.latitude), parseFloat(p.longitude)) }))
        .filter((p: any) => p.distance < 50)
        .sort((a: any, b: any) => a.distance - b.distance);
    }

    return allPopularLocations;
  }, [allPopularLocations, pickupLocation, dropLocation, activeField]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        performSearch(searchQuery.trim());
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async (text: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    try {
      const response = await apiClient.get('/maps/autocomplete', {
        params: { text },
        signal: abortController.signal
      });
      if (response.data.success) {
        setResults(response.data.results || []);
      }
    } catch (error: any) {
      if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
        console.log('Error fetching autocomplete:', error);
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        setLoading(false);
      }
    }
  };

  const handleSelectLocation = (item: any) => {
    const locationData = {
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      address: item.address || item.name || item.title,
    };

    if (activeField === 'pickup') {
      dispatch(setPickupLocation({ ...locationData, isManual: true }));
      // Auto switch to drop if it's empty, else go back
      if (!dropLocation) {
        setActiveField('drop');
        setSearchQuery('');
        return;
      }
    } else {
      dispatch(setDropLocation({ ...locationData, isManual: true }));
    }

    navigation.goBack();
  };

  const handleChooseOnMap = () => {
    dispatch(setMapSelectionMode({ isActive: true, isPickup: activeField === 'pickup' }));
    navigation.navigate('Main');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{activeField === 'pickup' ? 'Pickup' : 'Drop'}</Text>
          {/* <View style={styles.forMeBadge}>
            <Text style={styles.forMeText}>For me</Text>
            <Icon name="chevron-down" size={16} color="#000" style={{marginLeft: 4}}/>
          </View> */}
        </View>

        {/* Input Block */}
        <View style={styles.inputsWrapper}>
          <View style={styles.timelineIndicators}>
            <View style={styles.greenRing}><View style={styles.greenDot} /></View>
            <View style={styles.timelineLine} />
            <View style={styles.orangeRing}><View style={styles.orangeDot} /></View>
          </View>

          <View style={styles.textInputsContainer}>
            <TouchableOpacity 
              style={styles.inputRow} 
              activeOpacity={1}
              onPress={() => {
                if (activeField !== 'pickup') {
                  setActiveField('pickup');
                  setSearchQuery('');
                }
              }}
            >
              {activeField === 'pickup' ? (
                <TextInput
                  style={styles.input}
                  value={searchQuery}
                  placeholder="Enter pickup location"
                  placeholderTextColor="#999"
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              ) : (
                <Text style={styles.inactiveInputText} numberOfLines={1}>
                  {pickupLocation?.address || 'Current Location'}
                </Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.inputDivider} />
            
            <TouchableOpacity 
              style={styles.inputRow}
              activeOpacity={1}
              onPress={() => {
                if (activeField !== 'drop') {
                  setActiveField('drop');
                  setSearchQuery('');
                }
              }}
            >
              {activeField === 'drop' ? (
                <TextInput
                  style={styles.input}
                  value={searchQuery}
                  placeholder="Where to?"
                  placeholderTextColor="#7D8A99"
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              ) : (
                <Text style={styles.inactiveInputText} numberOfLines={1}>
                  {dropLocation?.address || 'Drop location'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Map & Add Stop buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleChooseOnMap}>
            <Icon name="map-marker-outline" size={20} color="#000" style={{marginRight: 8}}/>
            <Text style={styles.actionBtnText}>Select on map</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.actionBtn}>
            <Icon name="plus-box" size={20} color="#000" style={{marginRight: 8}}/>
            <Text style={styles.actionBtnText}>Add stops</Text>
          </TouchableOpacity> */}
        </View>

        {/* List Content */}
        {loading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />}

        <FlatList
          data={searchQuery.length > 2 ? results : popularLocations}
          keyExtractor={(item, index) => item.id?.toString() || item.place_id || index.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.resultItemWrapper}>
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelectLocation(item)}
              >
                <Icon name="history" size={24} color="#666" style={styles.historyIcon} />
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.name || item.title || item.address?.split(',')[0]}
                  </Text>
                  <Text style={styles.resultSubtitle} numberOfLines={1}>
                    {item.subtitle || item.address}
                  </Text>
                </View>
                <TouchableOpacity>
                  <Icon name="heart-outline" size={22} color="#666" />
                </TouchableOpacity>
              </TouchableOpacity>
              {/* Dashed line matching the image */}
              <View style={styles.dashedLine} />
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  backBtn: {
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  forMeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  forMeText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500'
  },
  inputsWrapper: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#EAF0F6',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#FAFCFE',
  },
  timelineIndicators: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    marginRight: 10,
  },
  greenRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#11704B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#11704B',
  },
  timelineLine: {
    width: 1.5,
    height: 24,
    backgroundColor: '#666',
    marginVertical: 4,
  },
  orangeRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#C66C38',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDECE4',
  },
  orangeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C66C38',
  },
  textInputsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    padding: 0,
    fontWeight: '500',
  },
  inactiveInputText: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  inputDivider: {
    height: 1,
    backgroundColor: '#EAF0F6',
    marginVertical: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flex: 0.48,
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  resultItemWrapper: {
    paddingVertical: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  historyIcon: {
    marginRight: 15,
  },
  resultTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#8A8F9E',
  },
  dashedLine: {
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginTop: 8,
  },
});

export default LocationSearchScreen;
