import { getApp } from "@react-native-firebase/app";

const initializeFirebase = () => {
  // Optional: silence modular deprecation warnings from RNFirebase
  (globalThis as any).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

  // Access default app (auto-initialized by native google-services files)
  try {
    getApp();
  } catch {
    // If no default app yet, RNFB will lazily create one on first module use.
  }
};

export default initializeFirebase;
