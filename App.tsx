import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';

import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import UploadScreen from './src/screens/UploadScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import VideoDetailScreen from './src/screens/VideoDetailScreen';
import EventsScreen from './src/screens/EventsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111',
          borderTopColor: '#1a1a1a',
          borderTopWidth: 1,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text> }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🔍</Text> }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🎪</Text> }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🙌</Text> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('handsup_onboarded').then((val) => {
      setOnboarded(val === 'true');
    });
  }, []);

  if (onboarded === null) return null; // splash/loading

  if (!onboarded) {
    return <OnboardingScreen onDone={() => setOnboarded(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0D0D0D' },
          headerTintColor: '#8B5CF6',
          headerTitleStyle: { color: '#fff', fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="VideoDetail"
          component={VideoDetailScreen}
          options={{ title: 'Clip', headerBackTitle: 'Back' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
