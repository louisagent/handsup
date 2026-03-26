import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, StyleSheet, Linking, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PreferenceOnboardingScreen from './src/screens/PreferenceOnboardingScreen';
import SplashScreen from './src/screens/SplashScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { supabase } from './src/services/supabase';
import { registerForPushNotifications } from './src/services/notifications';
import { getClip } from './src/services/clips';
import { getUnreadCount } from './src/services/notifications_db';
import { trackEvent } from './src/services/analytics';
import { getCurrentLocation } from './src/services/location';
import { touchStreak } from './src/services/streaks';

import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import UploadScreen from './src/screens/UploadScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import VideoDetailScreen from './src/screens/VideoDetailScreen';
import ArtistScreen from './src/screens/ArtistScreen';
import AuthScreen from './src/screens/AuthScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import EventsScreen from './src/screens/EventsScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import VerticalFeedScreen from './src/screens/VerticalFeedScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import AddEventScreen from './src/screens/AddEventScreen';
import ReportScreen from './src/screens/ReportScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SavedClipsScreen from './src/screens/SavedClipsScreen';
import CreatorStatsScreen from './src/screens/CreatorStatsScreen';
import MapScreen from './src/screens/MapScreen';
import DownloadHistoryScreen from './src/screens/DownloadHistoryScreen';
import AdminScreen from './src/screens/AdminScreen';
import TrendingScreen from './src/screens/TrendingScreen';
import WebViewScreen from './src/screens/WebViewScreen';
import PartnershipScreen from './src/screens/PartnershipScreen';
import EventFeedScreen from './src/screens/EventFeedScreen';
import HashtagScreen from './src/screens/HashtagScreen';
import VerificationApplicationScreen from './src/screens/VerificationApplicationScreen';
import WeeklyChallengesScreen from './src/screens/WeeklyChallengesScreen';
import FindYourCrewScreen from './src/screens/FindYourCrewScreen';
import CrewFinderScreen from './src/screens/CrewFinderScreen';
import ArtistClaimScreen from './src/screens/ArtistClaimScreen';
import LineupAdminScreen from './src/screens/LineupAdminScreen';
import AddArtistScreen from './src/screens/AddArtistScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function UploadButton({ onPress }: { onPress: () => void }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      style={uploadStyles.wrapper}
    >
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={uploadStyles.circle}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ── Animated Tab Icon ─────────────────────────────────────

function AnimatedTabIcon({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      Animated.spring(scale, {
        toValue: 1.2,
        useNativeDriver: true,
        speed: 40,
        bounciness: 10,
      }).start(() => {
        Animated.spring(scale, {
          toValue: 1.0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4,
        }).start();
      });
    }
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      {children}
    </Animated.View>
  );
}

const uploadStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    // Purple glow
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function HomeTabs({ activityBadge }: { activityBadge: number }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#111',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#3a3a3a',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <UploadButton onPress={props.onPress as () => void} />
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          tabBarBadge: activityBadge > 0 ? activityBadge : undefined,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name={focused ? 'flash' : 'flash-outline'} size={24} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
            </AnimatedTabIcon>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [user, setUser] = useState<object | null | undefined>(undefined); // undefined = still checking
  const [preferencesDone, setPreferencesDone] = useState<boolean | null>(true); // default true — never block on this
  const [activityBadge, setActivityBadge] = useState(0);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  // Holds a deep-link clip ID received before the navigator is ready
  const pendingDeepLinkClipId = useRef<string | null>(null);

  // ── Global error handler ───────────────────────────────────
  useEffect(() => {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.error('Global error:', error, 'Fatal:', isFatal);
      originalHandler(error, isFatal);
    });
  }, []);

  // ── Deep link handler ─────────────────────────────────────
  const handleDeepLink = async (url: string | null) => {
    if (!url) return;
    // Support both custom scheme and universal links
    const match = url.match(/(?:handsup:\/\/clip\/|handsuplive\.com\/clip\/)([^/?#]+)/);
    if (!match) return;
    const clipId = match[1];
    const clip = await getClip(clipId).catch(() => null);
    if (!clip) return;
    if (navigationRef.current?.isReady()) {
      navigationRef.current.navigate('VideoDetail', { video: clip });
    } else {
      // Navigator not ready yet (cold start) — store and handle in onReady
      pendingDeepLinkClipId.current = clipId;
    }
  };

  // Called by NavigationContainer once the navigator is fully mounted
  const handleNavigationReady = async () => {
    if (!pendingDeepLinkClipId.current) return;
    const clipId = pendingDeepLinkClipId.current;
    pendingDeepLinkClipId.current = null;
    const clip = await getClip(clipId).catch(() => null);
    if (clip && navigationRef.current) {
      navigationRef.current.navigate('VideoDetail', { video: clip });
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('handsup_onboarded').then((val) => {
      setOnboarded(val === 'true');
    });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      // Register for push notifications once user logs in
      if (sessionUser) {
        registerForPushNotifications().catch(() => {});
        // Fetch unread notification count
        getUnreadCount().then(setActivityBadge).catch(() => {});
        // Track app open event
        trackEvent('app_open').catch(() => {});
        // Request & cache location (fire and forget)
        getCurrentLocation().catch(() => {});
        // Touch streak — fire and forget, rate-limited to once per day
        touchStreak().catch(() => {});
        // Check if preference onboarding is completed (non-blocking — defaults to true/skip)
        (async () => {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', sessionUser.id)
              .single();
            // Only show preference screen if explicitly false AND column exists
            if (data && data.onboarding_completed === false) {
              setPreferencesDone(false);
            }
            // All other cases (error, null, true, column missing) → keep as true (skip)
          } catch {
            // silently ignore — preferencesDone stays true
          }
        })();
      } else {
        // Reset preferences state on logout
        setPreferencesDone(null);
      }
    });

    // Deep link: check initial URL
    Linking.getInitialURL().then(handleDeepLink);

    // Deep link: subscribe to incoming links while app is open
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  if (!splashDone) {
    return (
      <ErrorBoundary>
        <SplashScreen onDone={() => setSplashDone(true)} />
      </ErrorBoundary>
    );
  }

  if (onboarded === null) return null;

  // Show onboarding before checking auth — new users must onboard first
  if (!onboarded) {
    return (
      <ErrorBoundary>
        <OnboardingScreen onDone={() => setOnboarded(true)} />
      </ErrorBoundary>
    );
  }

  // Onboarding done — now wait for auth state to resolve
  if (user === undefined) return null;

  // Not logged in — show auth screen
  if (user === null) {
    return (
      <ErrorBoundary>
        <AuthScreen onAuth={(profile) => setUser(profile)} />
      </ErrorBoundary>
    );
  }

  // Logged in — check if preference onboarding is done

  if (preferencesDone === false) {
    return (
      <ErrorBoundary>
        <PreferenceOnboardingScreen onDone={() => setPreferencesDone(true)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
    <NavigationContainer ref={navigationRef} onReady={handleNavigationReady}>
      <Stack.Navigator
        screenOptions={({ navigation: nav }) => ({
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#8B5CF6',
          headerTitleStyle: { color: '#fff', fontWeight: '700' },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => nav.goBack()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#1C1C1E',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      >
        <Stack.Screen
          name="Main"
          options={{ headerShown: false }}
        >
          {() => <HomeTabs activityBadge={activityBadge} />}
        </Stack.Screen>
        <Stack.Screen
          name="VideoDetail"
          component={VideoDetailScreen as any}
          options={{ title: 'Clip', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Artist"
          component={ArtistScreen}
          options={({ route }: any) => ({ title: route.params?.artist ?? 'Artist', headerBackTitle: 'Back' })}
        />
        <Stack.Screen
          name="EventDetail"
          component={EventDetailScreen}
          options={({ route }: any) => ({ title: route.params?.event?.name ?? 'Event', headerBackTitle: 'Back' })}
        />
        <Stack.Screen
          name="GroupDetail"
          component={GroupDetailScreen as any}
          options={({ route }: any) => ({ title: route.params?.groupName ?? 'Group', headerBackTitle: 'Back' })}
        />
        <Stack.Screen
          name="CreateGroup"
          component={CreateGroupScreen as any}
          options={{ title: 'Create Group', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Events"
          component={EventsScreen}
          options={{ title: 'Events', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ title: 'Edit Profile', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="VerticalFeed"
          component={VerticalFeedScreen}
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={({ route }: any) => ({
            title: route.params?.username ? `@${route.params.username}` : 'Profile',
            headerBackTitle: 'Back',
          })}
        />
        <Stack.Screen
          name="AddEvent"
          component={AddEventScreen}
          options={{ title: 'Add Event', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Report"
          component={ReportScreen}
          options={{ title: 'Report Clip', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="SavedClips"
          component={SavedClipsScreen}
          options={{ title: 'Saved Clips', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="CreatorStats"
          component={CreatorStatsScreen}
          options={{ title: 'Creator Stats', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DownloadHistory"
          component={DownloadHistoryScreen}
          options={{ title: 'Download History', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Admin"
          component={AdminScreen}
          options={{ title: 'Moderation Queue', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="Trending"
          component={TrendingScreen}
          options={{ title: 'Trending', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="WebView"
          component={WebViewScreen as any}
          options={({ route }: any) => ({ title: route.params?.title ?? 'Info', headerBackTitle: 'Back' })}
        />
        <Stack.Screen
          name="Partnership"
          component={PartnershipScreen}
          options={{ title: 'Festival Partnership', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="EventFeed"
          component={EventFeedScreen}
          options={({ route }: any) => ({ title: route.params?.eventName ?? 'Festival Clips', headerBackTitle: 'Back' })}
        />
        <Stack.Screen
          name="Hashtag"
          component={HashtagScreen}
          options={({ route }: any) => ({ title: `#${route.params?.tag ?? ''}`, headerBackTitle: 'Back' })}
        />
        <Stack.Screen
          name="VerificationApplication"
          component={VerificationApplicationScreen}
          options={{ title: 'Get Verified', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="WeeklyChallenges"
          component={WeeklyChallengesScreen}
          options={{ title: 'Weekly Challenges', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="FindYourCrew"
          component={FindYourCrewScreen}
          options={({ route }: any) => ({
            title: route.params?.eventName ? `${route.params.eventName} · Crew` : 'Find Your Crew',
            headerBackTitle: 'Back',
          })}
        />
        <Stack.Screen
          name="CrewFinder"
          component={CrewFinderScreen}
          options={({ route }: any) => ({
            title: `Find Crew — ${route.params?.eventName ?? ''}`,
            headerBackTitle: 'Back',
          })}
        />
        <Stack.Screen
          name="ArtistClaim"
          component={ArtistClaimScreen}
          options={({ route }: any) => ({
            title: `Claim — ${route.params?.artistName ?? 'Artist'}`,
            headerBackTitle: 'Back',
          })}
        />
        <Stack.Screen
          name="LineupAdmin"
          component={LineupAdminScreen}
          options={({ route }: any) => ({ title: `Lineup — ${route.params?.eventName ?? 'Event'}`, headerBackTitle: 'Back' })}
        />
        <Stack.Screen
          name="AddArtist"
          component={AddArtistScreen}
          options={{ title: 'Add Artist', headerBackTitle: 'Back' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </ErrorBoundary>
  );
}
