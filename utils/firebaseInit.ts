import firebase from "@react-native-firebase/app";

const initializeFirebase = () => {
  if (firebase.apps.length === 0) {
    console.log("Initializing Firebase...");

    // For a bare React Native project, Firebase will use the native config files
    // (google-services.json for Android) without extra parameters
    try {
      // Use type assertion to satisfy TypeScript while still allowing Firebase to use native configs
      // @ts-ignore - The empty object is valid when native configs are present, but TypeScript doesn't know this
      firebase.initializeApp();
      console.log("Firebase initialized successfully");
    } catch (error) {
      console.error("Firebase initialization error:", error);
    }
  } else {
    console.log("Firebase already initialized");
  }
};

export default initializeFirebase;
