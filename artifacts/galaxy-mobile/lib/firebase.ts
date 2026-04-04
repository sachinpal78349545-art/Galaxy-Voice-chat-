/**
 * Firebase configuration for Galaxy Voice.
 * Uses the existing chalotalk-67106 Firebase project.
 *
 * To activate Firebase:
 * 1. Run: pnpm --filter @workspace/galaxy-mobile add firebase
 * 2. Uncomment the code below
 * 3. Import db / auth from this file in your screens
 */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyACjvjNecVmc-ooULC99pjlu6slWiQz_3o",
  authDomain: "chalotalk-67106.firebaseapp.com",
  projectId: "chalotalk-67106",
  storageBucket: "chalotalk-67106.appspot.com",
  appId: "chalotalk-67106",
};

/*
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];

export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
*/

// Agora App ID for future voice room integration
export const AGORA_APP_ID = "5a9957fd6a8047f48310fd0e5545d42c";
