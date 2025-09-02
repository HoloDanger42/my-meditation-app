// Set RNFirebase modular migration flags as early as possible
// Silence noisy deprecation warnings for namespaced API
// You can flip strict mode on to immediately throw where deprecated calls remain.
// Note: Keep this file imported before any @react-native-firebase/* imports.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

// Enable this temporarily to locate any lingering namespaced API usage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// (globalThis as any).RNFB_MODULAR_DEPRECATION_STRICT_MODE = true;
