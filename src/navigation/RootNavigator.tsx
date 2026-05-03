import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/OnboardingScreen';
import TabNavigator from './TabNavigator';
import CameraScreen from '../screens/CameraScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  CameraScanner: undefined; // We'll add this modal later
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen 
        name="CameraScanner" 
        component={CameraScreen} 
        options={{ presentation: 'fullScreenModal' }} 
      />
    </Stack.Navigator>
  );
}
