import * as SecureStore from "expo-secure-store";
import {
  old_readAndDecryptFromAsyncStorage,
  removeOldAsyncStorageItem,
} from "./migrationUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SyncInterface } from "./storageInterfaces";

// Will be set by firestoreSync.ts after initialization
let syncProvider: SyncInterface | null = null;

/**
 * Registers a sync provider to handle Firestore synchronization
 * Called by firestoreSync.ts during initialization
 */
export function registerSyncProvider(provider: SyncInterface): void {
  syncProvider = provider;
}

/**
 * Get item from secure storage.
 */
export async function getSecureItem<T>(key: string): Promise<T | null> {
  try {
    const jsonString = await SecureStore.getItemAsync(key, {
      requireAuthentication: false,
    });

    if (jsonString) {
      try {
        return JSON.parse(jsonString) as T;
      } catch (e) {
        console.error(`Error parsing JSON for key ${key}:`, e);
        await SecureStore.deleteItemAsync(key);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error getting secure item for key ${key}:`, error);
    return null;
  }
}

/**
 * Set item in secure storage.
 */
export async function setSecureItem(key: string, data: any): Promise<void> {
  try {
    // Ensure data is not null/undefined before stringifying
    if (data === null || typeof data === undefined) {
      console.warn(
        `Attempted to store null/undefined for key ${key}. Removing item instead.`
      );
      await removeSecureItem(key);
      return;
    }

    const jsonString = JSON.stringify(data);
    await SecureStore.setItemAsync(key, jsonString, {
      requireAuthentication: false,
    });

    // Sync the original object to Firestore if a provider is registered
    if (syncProvider) {
      syncProvider.syncItem(key, data).catch((error) => {
        console.error(`Background sync failed for key ${key}:`, error);
      });
    }
  } catch (error) {
    console.error(`Error setting secure item for key ${key}:`, error);
    throw new Error("Failed to store secure data");
  }
}

/**
 * Remove item from secure storage.
 */
export async function removeSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key, {});
    
    // Use sync provider with null to delete the field in Firestore
    if (syncProvider) {
      syncProvider.syncItem(key, null).catch((error) => {
        console.error(`Background sync (removal) failed for key ${key}:`, error);
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
