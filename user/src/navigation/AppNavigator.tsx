import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import BootSplash from 'react-native-bootsplash';
import { setAuth, logout } from '../store/authSlice';
import { setMapTheme } from '../store/rideSlice';
import apiClient from '../services/apiClient';

import LoginScreen from '../screens/auth/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import AddNomineeScreen from '../screens/profile/AddNomineeScreen';
import LocationSearchScreen from '../screens/home/LocationSearchScreen';
import SearchingRideScreen from '../screens/home/SearchingRideScreen';

import HelpScreen from '../screens/help/HelpScreen';
import TicketChatScreen from '../screens/help/TicketChatScreen';
import MyTicketsScreen from '../screens/help/MyTicketsScreen';
import PaymentHistoryScreen from '../screens/payments/PaymentHistoryScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import SafetyScreen from '../screens/profile/SafetyScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: { screen?: string, params?: any } | undefined;
  EditProfile: undefined;
  AddNominee: undefined;
  LocationSearch: { isPickup?: boolean } | undefined;
  SearchingRide: undefined;
  Help: undefined;
  TicketChat: { ticketId: number, topic: string };
  MyTickets: undefined;
  PaymentHistory: undefined;
  Settings: undefined;
  Safety: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Main'>('Login');
  const dispatch = useDispatch();

  useEffect(() => {
    restoreSessionAndInit();
  }, []);

  const restoreSessionAndInit = async () => {
    let resolvedRoute: 'Login' | 'Main' = 'Login';
    let savedToken: string | null = null;

    try {
      // 1. Restore persistent theme
      try {
        const storedTheme = await AsyncStorage.getItem('mapTheme');
        if (storedTheme === 'dark') {
          dispatch(setMapTheme('dark'));
        } else {
          dispatch(setMapTheme('light'));
        }
      } catch (themeErr) {
        // Ignore theme hydration error
      }

      // 2. Restore local authentication session immediately (no blocking network wait)
      savedToken = await AsyncStorage.getItem('token');
      const savedUserStr = await AsyncStorage.getItem('user');

      if (savedToken) {
        let userObj: any = null;
        if (savedUserStr) {
          try {
            userObj = JSON.parse(savedUserStr);
          } catch (e) {
            userObj = null;
          }
        }

        // Restore auth state in Redux immediately so user gets straight into app
        dispatch(setAuth({ user: userObj || { token: savedToken }, token: savedToken }));
        resolvedRoute = 'Main';
      }
    } catch (error) {
      console.log('User app local session restoration failed', error);
      resolvedRoute = 'Login';
    } finally {
      setInitialRoute(resolvedRoute);
      setIsInitializing(false);
    }

    // 3. Asynchronous background session validation (non-blocking)
    if (savedToken) {
      validateSessionInBackground(savedToken);
    }
  };

  const validateSessionInBackground = async (token: string) => {
    try {
      const res = await apiClient.get('/users/me');
      if (res?.data?.data?.user) {
        const user = res.data.data.user;
        dispatch(setAuth({ user, token }));
        await AsyncStorage.setItem('user', JSON.stringify(user));
      }
    } catch (err: any) {
      console.log('Background token validation check:', err?.message || err);
      // Strictly distinguish authentication failure (401/403) from network/offline errors
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        console.warn('Session expired or unauthorized. Logging out.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        dispatch(logout());
      }
    }
  };

  const handleNavigationReady = () => {
    BootSplash.hide({ fade: true }).catch((err) => {
      console.log('BootSplash.hide warning:', err);
    });
  };

  if (isInitializing) {
    return null; // Native BootSplash remains smoothly visible over the window
  }

  return (
    <NavigationContainer onReady={handleNavigationReady}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="AddNominee" component={AddNomineeScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="TicketChat" component={TicketChatScreen} />
        <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
        <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Safety" component={SafetyScreen} />
        <Stack.Screen name="SearchingRide" component={SearchingRideScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen 
          name="LocationSearch" 
          component={LocationSearchScreen} 
          options={{ presentation: 'fullScreenModal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  }
});

export default AppNavigator;