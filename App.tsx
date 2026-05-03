import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { useFonts } from 'expo-font';
import { Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import React, { useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './src/lib/firebaseSetup';

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  let [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    // Automatically log in as an anonymous user so Firebase secure Cloud Functions work!
    signInAnonymously(auth).catch(console.error);
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
