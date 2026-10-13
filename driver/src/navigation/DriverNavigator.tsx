import React, { useEffect, useState } from 'react';

import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BootSplash from 'react-native-bootsplash';
import { ChevronLeft } from 'lucide-react-native';
import DriverLoginScreen from '../screens/auth/DriverLoginScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import KycStatusScreen from './../screens/auth/KycStatusScreen';
import DriverMainTabs from './DriverMainTabs';
import DriverProfileDetailsScreen from '../screens/dashboard/DriverProfileDetailsScreen';
import DriverHelpSupportScreen from '../screens/dashboard/DriverHelpSupportScreen';
import DriverSupportChatScreen from '../screens/dashboard/DriverSupportChatScreen';
import DriverMyTicketsScreen from '../screens/dashboard/DriverMyTicketsScreen';
import DriverTermsScreen from '../screens/dashboard/DriverTermsScreen';
import DriverPrivacyScreen from '../screens/dashboard/DriverPrivacyScreen';
import DriverPermissionsScreen from '../screens/dashboard/DriverPermissionsScreen';
import DriverClientIntegrationScreen from '../screens/dashboard/DriverClientIntegrationScreen';

export type DriverRootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  MainTabs: undefined;
  Onboarding: undefined;
  KycStatus: { status: string; reason?: string };
  DriverProfileDetails: undefined;
  DriverHelpSupport: undefined;
  DriverSupportChat: { topic: string; ticketId?: number; status?: string };
  DriverMyTickets: undefined;
  DriverTerms: undefined;
  DriverPrivacy: undefined;
  DriverPermissions: undefined;
  DriverClientIntegration: undefined;
};

const Stack = createNativeStackNavigator<DriverRootStackParamList>();

const DriverNavigator = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'MainTabs' | 'Onboarding' | 'KycStatus'>('Login');

  useEffect(() => {
    restoreDriverSession();
  }, []);

  const restoreDriverSession = async () => {
    let resolvedRoute: 'Login' | 'MainTabs' | 'Onboarding' | 'KycStatus' = 'Login';
    try {
      const token = await AsyncStorage.getItem('driverToken');
      const userStr = await AsyncStorage.getItem('driverUser');
      
      if (token && userStr) {
        let user: any = null;
        try {
          user = JSON.parse(userStr);
        } catch (jsonErr) {
          console.warn('Malformed driverUser JSON in storage', jsonErr);
        }

        if (user) {
          if (user.name === 'New Driver' || !user.kyc_status) {
            resolvedRoute = 'Onboarding';
          } else if (user.kyc_status === 'APPROVED') {
            resolvedRoute = 'MainTabs';
          } else {
            resolvedRoute = 'KycStatus';
          }
        }
      }
    } catch (error) {
      console.log('Driver session check failed', error);
      resolvedRoute = 'Login';
    } finally {
      setInitialRoute(resolvedRoute);
      setIsInitializing(false);
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
        <Stack.Screen name="Login" component={DriverLoginScreen} />
        <Stack.Screen name="MainTabs" component={DriverMainTabs} />
        <Stack.Screen name="DriverProfileDetails" component={DriverProfileDetailsScreen} />
        <Stack.Screen name="DriverHelpSupport" component={DriverHelpSupportScreen} />
        <Stack.Screen name="DriverSupportChat" component={DriverSupportChatScreen} />
        <Stack.Screen name="DriverMyTickets" component={DriverMyTicketsScreen} />
        <Stack.Screen name="DriverTerms" component={DriverTermsScreen} />
        <Stack.Screen name="DriverPrivacy" component={DriverPrivacyScreen} />
        <Stack.Screen name="DriverPermissions" component={DriverPermissionsScreen} />
        <Stack.Screen name="DriverClientIntegration" component={DriverClientIntegrationScreen} />
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen} 
          options={{ 
            headerShown: false
          }} 
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          options={({ navigation }) => ({ 
            headerShown: true,
            title: 'Driver Onboarding',
            headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
            headerTintColor: '#111827',
            headerTitleAlign: 'center',
            headerTitleStyle: { fontWeight: 'bold' },
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.replace('Login')} style={{ paddingLeft: 10 }}>
                <ChevronLeft size={32} color="#111827" />
              </TouchableOpacity>
            )
          })} 
        />
        <Stack.Screen 
          name="KycStatus" 
          component={KycStatusScreen}
          options={({ navigation }) => ({ 
            headerShown: true,
            title: 'Application Status',
            headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
            headerTintColor: '#111827',
            headerTitleAlign: 'center',
            headerTitleStyle: { fontWeight: 'bold' },
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.replace('Login')} style={{ paddingLeft: 10 }}>
                <ChevronLeft size={32} color="#111827" />
              </TouchableOpacity>
            )
          })} 
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
    backgroundColor: '#f4f4f4',
  }
});

export default DriverNavigator;
