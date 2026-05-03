import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCgTSd4sbFkuIf6-kM3G9wu4P19Geka6DA",
  authDomain: "caloriemagic-capstone.firebaseapp.com",
  projectId: "caloriemagic-capstone",
  storageBucket: "caloriemagic-capstone.firebasestorage.app",
  messagingSenderId: "695083153236",
  appId: "1:695083153236:web:b4cd822b71875355e5fac1",
  measurementId: "G-51N2ERMJY1"
};

const app = initializeApp(firebaseConfig);

// Firebase v12: getReactNativePersistence exists at runtime but TypeScript types lag behind.
// Using require() as a workaround to keep auth state across sessions.
const { getReactNativePersistence } = require('firebase/auth');

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const functions = getFunctions(app);

