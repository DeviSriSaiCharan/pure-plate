import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// -------------------------------------------------------------
// USER ACTION REQUIRED:
// Navigate to Firebase Console -> Project Settings -> General
// Scroll down to "Your apps", register a Web App, and copy the config here.
// -------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCgTSd4sbFkuIf6-kM3G9wu4P19Geka6DA",
  authDomain: "caloriemagic-capstone.firebaseapp.com",
  projectId: "caloriemagic-capstone",
  storageBucket: "caloriemagic-capstone.firebasestorage.app",
  messagingSenderId: "695083153236",
  appId: "1:695083153236:web:b4cd822b71875355e5fac1",
  measurementId: "G-51N2ERMJY1"
};

// 1. Initialize Firebase Core
const app = initializeApp(firebaseConfig);

// 2. Initialize Firebase Auth (With AsyncStorage for Session Persistence)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

import { getFirestore } from 'firebase/firestore';

// 3. Initialize Firestore 
export const db = getFirestore(app);

// 4. Initialize Cloud Functions
import { getFunctions } from 'firebase/functions';
export const functions = getFunctions(app);
