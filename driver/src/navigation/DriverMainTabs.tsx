import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, BarChart2, Wallet, User, List } from 'lucide-react-native';
import { View } from 'react-native';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import DriverEarningsScreen from '../screens/dashboard/DriverEarningsScreen';
import DriverWalletScreen from '../screens/dashboard/DriverWalletScreen';
import DriverProfileSettingsScreen from '../screens/dashboard/DriverProfileSettingsScreen';

import DriverOrdersScreen from '../screens/dashboard/DriverOrdersScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

const DriverMainTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 8,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={DriverOrdersScreen}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <List size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="EarningsTab"
        component={DriverEarningsScreen}
        options={{
          tabBarLabel: 'Earnings',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={DriverWalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={DriverProfileSettingsScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default DriverMainTabs;
