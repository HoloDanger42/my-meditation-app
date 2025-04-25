import firebase from '@react-native-firebase/app';
import { Platform } from 'react-native';

const initializeFirebase = () => {
  if (firebase.apps.length === 0) {
    console.log('Initializing Firebase...');
    
    // For a bare React Native project, Firebase will use the native config files
    // (google-services.json for Android) without extra parameters
    try {
      firebase.initializeApp();
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  } else {
    console.log('Firebase already initialized');
  }
};

export default initializeFirebase;