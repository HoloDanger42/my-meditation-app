export enum DataSensitivityLevel {
  CRITICAL = "critical",
  IMPORTANT = "important",
  BASIC = "basic",
}

export interface DataClassification {
  level: DataSensitivityLevel;
  requiresAuth: boolean;
  allowExport: boolean;
  retentionDays?: number; // Optional retention policy
}

// Data classification mapping
const DATA_CLASSIFICATIONS: Record<string, DataClassification> = {
  // CRITICAL - Highly sensitive personal/mental health data
  mood_entries: {
    level: DataSensitivityLevel.CRITICAL,
    requiresAuth: true,
    allowExport: true,
    retentionDays: 365 * 2, // 2 years
  },
  journal_entries: {
    level: DataSensitivityLevel.CRITICAL,
    requiresAuth: true,
    allowExport: true,
    retentionDays: 365 * 2,
  },

  // IMPORTANT - Usage patterns and analytics
  meditation_sessions: {
    level: DataSensitivityLevel.IMPORTANT,
    requiresAuth: true,
    allowExport: true,
    retentionDays: 365,
  },
  breathing_sessions: {
    level: DataSensitivityLevel.IMPORTANT,
    requiresAuth: true,
    allowExport: true,
    retentionDays: 365,
  },
  total_breathing_time: {
    level: DataSensitivityLevel.IMPORTANT,
    requiresAuth: true,
    allowExport: true,
  },
  last_breathing_technique: {
    level: DataSensitivityLevel.IMPORTANT,
    requiresAuth: true,
    allowExport: true,
  },
  recommendation_analytics: {
    level: DataSensitivityLevel.IMPORTANT,
    requiresAuth: true,
    allowExport: true,
    retentionDays: 180,
  },

  // BASIC - App functionality data
  theme_preference: {
    level: DataSensitivityLevel.BASIC,
    requiresAuth: false,
    allowExport: false,
  },
  meditation_reminder_time: {
    level: DataSensitivityLevel.BASIC,
    requiresAuth: false,
    allowExport: false,
  },
  journal_reminder_time: {
    level: DataSensitivityLevel.BASIC,
    requiresAuth: false,
    allowExport: false,
  },
  mood_reminder_time: {
    level: DataSensitivityLevel.BASIC,
    requiresAuth: false,
    allowExport: false,
  },
  personalized_reminder_time: {
    level: DataSensitivityLevel.BASIC,
    requiresAuth: false,
    allowExport: false,
  },
  favorite_meditations: {
    level: DataSensitivityLevel.BASIC,
    requiresAuth: false,
    allowExport: false,
  },
  audit_logs: {
    level: DataSensitivityLevel.IMPORTANT,
    requiresAuth: true,
    allowExport: true,
    retentionDays: 90,
  },
};

import * as SecureStore from "expo-secure-store";
import {
  old_readAndDecryptFromAsyncStorage,
  removeOldAsyncStorageItem,
} from "./migrationUtils";
import { SyncInterface } from "./storageInterfaces";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { encode as encodeBase64, decode as decodeBase64 } from "base-64";
import { getAuth } from "@react-native-firebase/auth";

// Mutex to prevent concurrent authentication prompts
let authMutex = Promise.resolve();

/**
 * Executes a function that requires authentication, ensuring only one
 * such function runs at a time to prevent overlapping UI prompts.
 */
async function withAuthMutex<T>(fn: () => Promise<T>): Promise<T> {
  const previous = authMutex;
  let release: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  authMutex = previous.then(() => next);

  try {
    await previous;
    return await fn();
  } finally {
    release!();
  }
}

/**
 * Checks if the device has a screen lock (biometrics, PIN, etc.) enabled.
 * This is crucial for storing critical data securely.
 */
let _LocalAuthMod: any | null = null;
let _localAuthTried = false;
async function getLocalAuthModule() {
  if (_LocalAuthMod || _localAuthTried) return _LocalAuthMod;
  _localAuthTried = true;
  try {
    _LocalAuthMod = await import("expo-local-authentication");
  } catch (e) {
    console.warn(
      "expo-local-authentication native module not available; continuing without biometric enrollment checks."
    );
    _LocalAuthMod = null;
  }
  return _LocalAuthMod;
}

export async function isDeviceSecurityEnabled(): Promise<boolean> {
  const mod = await getLocalAuthModule();
  if (!mod || typeof mod.isEnrolledAsync !== "function") return false;
  try {
    return await mod.isEnrolledAsync();
  } catch {
    return false;
  }
}

const AUDIT_LOG_KEY = "audit_logs";

// Debounce config for syncing audit logs to Firestore
const AUDIT_SYNC_DEBOUNCE_MS = 3000;
let auditSyncTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingAuditLogsData: any = null;

function scheduleAuditLogsSync(data: any) {
  pendingAuditLogsData = data;
  if (auditSyncTimeout) clearTimeout(auditSyncTimeout);
  auditSyncTimeout = setTimeout(() => {
    if (syncProvider) {
      syncProvider
        .syncItem(AUDIT_LOG_KEY, pendingAuditLogsData)
        .catch((error: any) => {
          console.error(
            `Background sync failed for key ${AUDIT_LOG_KEY}:`,
            error
          );
        });
    }
    auditSyncTimeout = null;
  }, AUDIT_SYNC_DEBOUNCE_MS);
}

/**
 * Encrypts data for local storage in AsyncStorage.
 */
async function encryptForAsyncStorage(data: any): Promise<string> {
  const jsonString = JSON.stringify(data);
  const user = getAuth().currentUser;
  if (!user?.uid) return jsonString; // Store plaintext if no user

  const key = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    user.uid + "LOCAL_AUDIT_SECRET"
  );
  const simpleKey = key.split("").map((c) => c.charCodeAt(0));
  const keyLength = simpleKey.length;
  const result = jsonString
    .split("")
    .map((char, index) => {
      const charCode = char.charCodeAt(0);
      const keyChar = simpleKey[index % keyLength];
      return String.fromCharCode(charCode ^ keyChar);
    })
    .join("");
  return `local_enc_v1:${encodeBase64(result)}`;
}

/**
 * Decrypts data from local storage in AsyncStorage.
 */
async function decryptFromAsyncStorage(encryptedData: string): Promise<any> {
  if (!encryptedData.startsWith("local_enc_v1:")) {
    try {
      return JSON.parse(encryptedData); // Not encrypted or old format
    } catch {
      return encryptedData;
    }
  }

  const user = getAuth().currentUser;
  if (!user?.uid) throw new Error("Cannot decrypt: No user available.");

  const base64Data = encryptedData.substring("local_enc_v1:".length);
  const decoded = decodeBase64(base64Data);

  const key = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    user.uid + "LOCAL_AUDIT_SECRET"
  );
  const simpleKey = key.split("").map((c) => c.charCodeAt(0));
  const keyLength = simpleKey.length;

  const decryptedString = decoded
    .split("")
    .map((char, index) => {
      const charCode = char.charCodeAt(0);
      const keyChar = simpleKey[index % keyLength];
      return String.fromCharCode(charCode ^ keyChar);
    })
    .join("");

  try {
    return JSON.parse(decryptedString);
  } catch {
    return decryptedString;
  }
}

/**
 * Get the data classification for a given key
 */
export function getDataClassification(key: string): DataClassification {
  return (
    DATA_CLASSIFICATIONS[key] || {
      level: DataSensitivityLevel.BASIC,
      requiresAuth: false,
      allowExport: false,
    }
  );
}

/**
 * Check if a data key is classified as critical
 */
export function isCriticalData(key: string): boolean {
  const classification = getDataClassification(key);
  return classification.level === DataSensitivityLevel.CRITICAL;
}

/**
 * Check if a data key requires authentication
 */
export function requiresAuthentication(key: string): boolean {
  const classification = getDataClassification(key);
  return classification.requiresAuth;
}

/**
 * Get all keys by classification level
 */
export function getKeysByClassification(level: DataSensitivityLevel): string[] {
  return Object.keys(DATA_CLASSIFICATIONS).filter(
    (key) => DATA_CLASSIFICATIONS[key].level === level
  );
}

/**
 * Get all exportable data keys
 */
export function getExportableKeys(): string[] {
  return Object.keys(DATA_CLASSIFICATIONS).filter(
    (key) => DATA_CLASSIFICATIONS[key].allowExport
  );
}

// Will be set by firestoreSync.ts after initialization
let syncProvider: SyncInterface | null = null;

/**
 * Registers a sync provider to handle Firestore synchronization
 * Called by firestoreSync.ts during initialization
 */
export function registerSyncProvider(provider: SyncInterface): void {
  syncProvider = provider;
}

// Authentication state management
let isAppAuthenticated = false;
let authenticationCallbacks: (() => void)[] = [];

/**
 * Set the app authentication state
 */
export function setAuthenticationState(authenticated: boolean): void {
  const wasAuthenticated = isAppAuthenticated;
  isAppAuthenticated = authenticated;

  // If we just got authenticated, call any pending callbacks
  if (!wasAuthenticated && authenticated) {
    authenticationCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Error in authentication callback:", error);
      }
    });
    authenticationCallbacks = [];
  }
}

/**
 * Get current authentication state
 */
export function getAuthenticationState(): boolean {
  return isAppAuthenticated;
}

/**
 * Add callback to be called when authentication succeeds
 */
export function onAuthenticated(callback: () => void): void {
  if (isAppAuthenticated) {
    callback();
  } else {
    authenticationCallbacks.push(callback);
  }
}

/**
 * Get item from secure storage with classification-based security
 */
export async function getSecureItem<T>(key: string): Promise<T | null> {
  // Special handling for audit_logs to read from AsyncStorage
  if (key === AUDIT_LOG_KEY) {
    try {
      const encryptedValue = await AsyncStorage.getItem(key);
      if (encryptedValue === null) return null;
      return await decryptFromAsyncStorage(encryptedValue);
    } catch (error) {
      console.error("Failed to get audit log from AsyncStorage:", error);
      return null;
    }
  }

  const classification = getDataClassification(key);

  // Check authentication requirement for sensitive data
  if (classification.requiresAuth && !isAppAuthenticated) {
    await logDataAccess(key, "read"); // Log failed access attempt
    console.warn(`Access denied for ${key}: Authentication required`);
    return null;
  }

  const requireHardwareAuth =
    classification.level === DataSensitivityLevel.CRITICAL;

  // If hardware auth is needed, wrap the call in the mutex
  if (requireHardwareAuth) {
    return withAuthMutex(async () => {
      const jsonString = await SecureStore.getItemAsync(key, {
        requireAuthentication: true,
      });
      if (jsonString) {
        await logDataAccess(key, "read");
        try {
          return JSON.parse(jsonString) as T;
        } catch (e) {
          console.error(`Error parsing JSON for key ${key}:`, e);
          await SecureStore.deleteItemAsync(key);
          return null;
        }
      }
      return null;
    });
  }

  // For non-critical data, access directly
  const jsonString = await SecureStore.getItemAsync(key, {
    requireAuthentication: false,
  });

  if (jsonString) {
    await logDataAccess(key, "read"); // Log successful access
    try {
      return JSON.parse(jsonString) as T;
    } catch (e) {
      console.error(`Error parsing JSON for key ${key}:`, e);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  }
  return null;
}

/**
 * Set item in secure storage with classification-based security
 */
export async function setSecureItem(key: string, data: any): Promise<void> {
  // Special handling for audit_logs to avoid SecureStore size limits
  if (key === AUDIT_LOG_KEY) {
    try {
      if (data === null || typeof data === "undefined") {
        await AsyncStorage.removeItem(key);
      } else {
        const encryptedValue = await encryptForAsyncStorage(data);
        await AsyncStorage.setItem(key, encryptedValue);
      }

      // Debounced sync to Firestore for audit logs to avoid floods
      scheduleAuditLogsSync(data);
      return;
    } catch (error: any) {
      console.error(
        `Error setting audit log in AsyncStorage for key ${key}:`,
        error
      );
      throw new Error("Failed to store secure data");
    }
  }

  const classification = getDataClassification(key);
  const needsHardwareAuth =
    classification.level === DataSensitivityLevel.CRITICAL;

  // Before saving critical data, check if a screen lock is even set up.
  if (needsHardwareAuth) {
    const securityEnabled = await isDeviceSecurityEnabled();
    if (!securityEnabled) {
      // This is where you would typically show an alert to the user.
      // For now, we'll throw an error that can be caught by the UI.
      throw new Error(
        "Device screen lock is not enabled. Please set up a PIN, pattern, or biometric lock in your device settings to save sensitive data."
      );
    }
  }

  // Check authentication requirement for sensitive data
  if (classification.requiresAuth && !isAppAuthenticated) {
    throw new Error(`Cannot store ${key}: Authentication required`);
  }

  // Ensure data is not null/undefined before stringifying
  if (data === null || typeof data === undefined) {
    console.warn(
      `Attempted to store null/undefined for key ${key}. Removing item instead.`
    );
    await removeSecureItem(key);
    return;
  }

  const jsonString = JSON.stringify(data);

  // If hardware auth is needed, wrap the call in the mutex
  if (needsHardwareAuth) {
    await withAuthMutex(async () => {
      await SecureStore.setItemAsync(key, jsonString, {
        requireAuthentication: true,
      });
    });
  } else {
    await SecureStore.setItemAsync(key, jsonString, {
      requireAuthentication: false,
    });
  }

  await logDataAccess(key, "write"); // Log successful write

  // Sync the original object to Firestore if a provider is registered
  if (syncProvider) {
    syncProvider.syncItem(key, data).catch((error: any) => {
      console.error(`Background sync failed for key ${key}:`, error);
    });
  }
}

/**
 * Remove item from secure storage.
 */
export async function removeSecureItem(key: string): Promise<void> {
  // Special handling for audit_logs
  if (key === AUDIT_LOG_KEY) {
    try {
      await AsyncStorage.removeItem(key);
      // Debounced sync deletion
      scheduleAuditLogsSync(null);
    } catch (error: any) {
      console.error(
        `Error removing audit log from AsyncStorage for key ${key}:`,
        error
      );
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key, {});
    await logDataAccess(key, "delete"); // Log successful deletion

    // Use sync provider with null to delete the field in Firestore
    if (syncProvider) {
      syncProvider.syncItem(key, null).catch((error: any) => {
        console.error(
          `Background sync (removal) failed for key ${key}:`,
          error
        );
      });
    }
  } catch (error) {
    console.error(`Error removing secure item for key ${key}:`, error);
  }
}

const MIGRATION_FLAG_KEY = "migration_to_securestore_v1_complete";

/**
 * Performs a one-time migration from old AsyncStorage+custom encryption
 * to the new SecureStore-based storage.
 */
export async function runDataMigrationIfNeeded(): Promise<void> {
  try {
    // Check if migration was already completed using the new SecureStore flag
    const migrationComplete = await SecureStore.getItemAsync(
      MIGRATION_FLAG_KEY
    );
    if (migrationComplete === "true") {
      return;
    }

    console.log("Starting data migration check...");

    const keysToMigrate = [
      "mood_entries",
      "meditation_sessions",
      "favorite_meditations",
      "journal_entries",
      "last_breathing_technique",
      "meditation_reminder_time",
      "journal_reminder_time",
      "mood_reminder_time",
      "personalized_reminder_time",
      "recommendation_analytics",
      "theme_preference",
    ];

    let migrationNeeded = false;
    // Check if any old data actually exists before logging start message
    for (const key of keysToMigrate) {
      const oldDataExists = await AsyncStorage.getItem(key);
      if (oldDataExists !== null) {
        migrationNeeded = true;
        break;
      }
    }

    if (!migrationNeeded) {
      console.log("No old data found in AsyncStorage. Migration not needed.");
      // Set the flag anyway to prevent future checks
      await SecureStore.setItemAsync(MIGRATION_FLAG_KEY, "true");
      return;
    }

    console.log("Old data found. Starting data migration to SecureStore...");
    let migrationSuccess = true;

    for (const key of keysToMigrate) {
      try {
        const oldData = await old_readAndDecryptFromAsyncStorage<any>(key);

        if (oldData !== null) {
          await setSecureItem(key, oldData);
          console.log(`Successfully migrated data for key: ${key}`);
          await removeOldAsyncStorageItem(key);
        } else {
          const checkAgain = await AsyncStorage.getItem(key);
          if (checkAgain !== null) {
            console.warn(
              `Data read as null/failed decryption for key ${key}, but removing from AsyncStorage.`
            );
            await removeOldAsyncStorageItem(key);
          }
        }
      } catch (error) {
        console.error(`Error migrating key ${key}:`, error);
        migrationSuccess = false;
      }
    }

    if (migrationSuccess) {
      await SecureStore.setItemAsync(MIGRATION_FLAG_KEY, "true");
      console.log("Data migration completed successfully.");
    } else {
      console.error(
        "Data migration finished with errors for one or more keys. Flag not set. Please check logs."
      );
    }
  } catch (error) {
    console.error("Critical error during migration process:", error);
  }
}

/**
 * Export all user data that is allowed to be exported
 */
export async function exportUserData(): Promise<Record<string, any>> {
  const exportableKeys = getExportableKeys();
  const exportData: Record<string, any> = {};

  for (const key of exportableKeys) {
    try {
      const data = await getSecureItem(key);
      if (data !== null) {
        exportData[key] = data;
      }
    } catch (error) {
      console.error(`Failed to export data for key ${key}:`, error);
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    dataClassification: "user_export",
    data: exportData,
  };
}

/**
 * Clean up expired data based on retention policies
 */
export async function cleanupExpiredData(): Promise<void> {
  for (const [key, classification] of Object.entries(DATA_CLASSIFICATIONS)) {
    if (classification.retentionDays) {
      try {
        const data = await getSecureItem<any>(key);
        if (Array.isArray(data)) {
          const cutoffDate = new Date();
          cutoffDate.setDate(
            cutoffDate.getDate() - classification.retentionDays
          );

          const filteredData = data.filter(
            (item) => new Date(item.timestamp || item.date) > cutoffDate
          );

          if (filteredData.length !== data.length) {
            await setSecureItem(key, filteredData);
            console.log(
              `Cleaned up ${
                data.length - filteredData.length
              } expired entries for ${key}`
            );
          }
        }
      } catch (error) {
        console.error(`Error cleaning up expired data for key ${key}:`, error);
      }
    }
  }
}

/**
 * Log data access for audit purposes (for CRITICAL data only)
 */
async function logDataAccess(
  key: string,
  action: "read" | "write" | "delete"
): Promise<void> {
  if (isCriticalData(key)) {
    // Avoid recursive logging when we are updating the audit logs
    if (key === AUDIT_LOG_KEY) return;

    const auditLog = {
      key,
      action,
      timestamp: new Date().toISOString(),
      authenticated: isAppAuthenticated,
    };

    try {
      const existingLogs = (await getSecureItem<any[]>(AUDIT_LOG_KEY)) || [];
      existingLogs.unshift(auditLog);
      // Keep only last 100 audit entries
      const trimmedLogs = existingLogs.slice(0, 100);
      await setSecureItem(AUDIT_LOG_KEY, trimmedLogs);
    } catch (error) {
      console.error("Failed to log data access:", error);
    }
  }
}
