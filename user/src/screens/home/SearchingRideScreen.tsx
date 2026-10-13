import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../services/apiClient';
import { useSocket } from '../../context/SocketContext';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getApiUrl } from '../../config/url';

export default function SearchingRideScreen() {
  const navigation = useNavigation<any>();
  const { socket } = useSocket();
  const dispatch = useDispatch();

  const { isParcel } = useSelector((state: RootState) => state.ride) || {};

  const [ads, setAds] = useState<any[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [searchStage, setSearchStage] = useState(1);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    // Fetch active ads
    const fetchAds = async () => {
      try {
        const res = await apiClient.get('/ads/active');
        if (res.data?.success && res.data.data?.length > 0) {
          setAds(res.data.data);
        }
      } catch (error) {
        console.warn('Failed to fetch ads:', error);
      }
    };
    fetchAds();
  }, []);

  useEffect(() => {
    // Ad rotation logic
    if (ads.length > 1) {
      const currentAd = ads[currentAdIndex];
      const duration = (currentAd.duration_seconds || 5) * 1000;

      timeoutRef.current = setTimeout(() => {
        // Fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Change ad
          setCurrentAdIndex((prev) => (prev + 1) % ads.length);
          // Fade in
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
      }, duration);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentAdIndex, ads]);

  useEffect(() => {
    if (!socket) return;

    const handleSearchStage = (data: any) => {
      setSearchStage(data.stage);
      Animated.timing(progressAnim, {
        toValue: data.stage / data.totalStages,
        duration: 1000,
        useNativeDriver: false
      }).start();
    };

    const handleAccepted = () => {
      setIsAccepted(true);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false
      }).start();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    socket.on('ride:search_stage', handleSearchStage);
    socket.on('ride:accepted', handleAccepted);

    // Initial animation
    Animated.timing(progressAnim, {
      toValue: 1 / 3,
      duration: 1000,
      useNativeDriver: false
    }).start();

    return () => {
      socket.off('ride:search_stage', handleSearchStage);
      socket.off('ride:accepted', handleAccepted);
    };
  }, [socket]);

  const handleCancel = () => {
    if (socket) {
      socket.emit('ride:cancel', {});
    }
    // Let the main HomeScreen/Navigation context handle the state update or explicitly go back
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{isParcel ? 'Searching for delivery partner...' : 'Searching for drivers...'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.animationContainer}>
        <ActivityIndicator size="large" color="#1AB65C" />
        {isParcel ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
            <Icon name="package-variant-closed" size={20} color="#666" style={{ marginRight: 8 }} />
            <Text style={[styles.subtitle, { marginTop: 0 }]}>
              {searchStage === 1 ? 'Finding nearby delivery partners...' : searchStage === 2 ? 'Searching a little farther...' : 'Checking more partners nearby...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.subtitle}>
            {searchStage === 1 ? 'Finding nearby drivers...' : searchStage === 2 ? 'Searching a little farther...' : 'Checking more drivers nearby...'}
          </Text>
        )}

        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBarFill, {
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            })
          }]} />
        </View>
      </View>

      <View style={styles.adContainer}>
        {ads.length > 0 ? (
          <Animated.View style={[styles.adWrapper, { opacity: fadeAnim }]}>
            <Image
              source={{ uri: ads[currentAdIndex].image_url?.startsWith('http') ? ads[currentAdIndex].image_url : getApiUrl(ads[currentAdIndex].image_url) }}
              style={styles.adImage}
              resizeMode="cover"
            />
            <View style={styles.adLabelContainer}>
              <Text style={styles.adLabelText}>AD</Text>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.fallbackAd}>
            <Icon name={isParcel ? "package-variant-closed" : "car"} size={64} color="#ccc" />
            <Text style={styles.fallbackText}>{isParcel ? "Your delivery partner will be here soon" : "Your ride will be here soon"}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  subtitle: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  adContainer: {
    flex: 1,
    paddingBottom: 0,
  },
  adWrapper: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adLabelContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
    elevation: 10,
  },
  adLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fallbackAd: {
    flex: 1,
    borderRadius: 0,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  fallbackText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1AB65C',
    borderRadius: 4,
  }
});
