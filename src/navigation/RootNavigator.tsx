import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/OnboardingScreen';
import TabNavigator from './TabNavigator';
import CameraScreen from '../screens/CameraScreen';
import AuthScreen from '../screens/AuthScreen';
import SetupProfileScreen from '../screens/SetupProfileScreen';
import { auth, db } from '../lib/firebaseSetup';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types/schema';
import { colors } from '../theme/colors';

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  SetupProfile: undefined;
  MainTabs: undefined;
  CameraScanner: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user?.isAnonymous) {
        signOut(auth).catch(() => null);
        setAuthUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setAuthUser(user);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const profileRef = doc(db, 'users', user.uid);
      unsubscribeProfile = onSnapshot(
        profileRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
            setIsLoading(false);
            return;
          }

          const initialProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || 'User',
            onboardingComplete: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await setDoc(profileRef, initialProfile);
          setProfile(initialProfile);
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!authUser) {
    return (
      <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    );
  }

  if (!profile?.onboardingComplete) {
    return (
      <Stack.Navigator initialRouteName="SetupProfile" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SetupProfile" component={SetupProfileScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen 
        name="CameraScanner" 
        component={CameraScreen} 
        options={{ presentation: 'fullScreenModal' }} 
      />
    </Stack.Navigator>
  );
}
