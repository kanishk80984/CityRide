import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/home/HomeScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import RidesScreen from '../screens/rides/RidesScreen';
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name !== 'HomeTab',
        headerStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18, color: '#1A1A1A' },
        headerTitleAlign: 'center',
        tabBarStyle: {
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 15
        },
        tabBarActiveTintColor: '#11704B',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused }) => {
          let iconName = 'home';
          if (route.name === 'HomeTab') iconName = 'home';
          else if (route.name === 'Rides') iconName = 'text-box-outline';
          else if (route.name === 'Payments') iconName = 'credit-card-outline';
          else if (route.name === 'Profile') iconName = 'account-outline';

          return (
            <View style={{
              backgroundColor: focused ? '#F3F4F6' : 'transparent',
              width: 48,
              height: 32,
              borderRadius: 16,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Icon name={iconName} size={24} color={focused ? '#11704B' : '#888'} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Rides" component={RidesScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} options={{ headerShown: false }} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerRight: () => (
            <TouchableOpacity style={{ marginRight: 15 }}>
              <Icon name="cog-outline" size={26} color="#000" />
            </TouchableOpacity>
          )
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
