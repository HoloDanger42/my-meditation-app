import AsyncStorage from "@react-native-async-storage/async-storage";
import { encryptData, decryptData } from "./encryption";
import {
  syncItemToFirestore,
  fetchItemFromFirestore,
} from "./firestoreSync";
import { debounce } from "lodash";

// Define checkedKeys here
const checkedKeys = new Set<string>();

// Prefix to identify encrypted data
const OLD_ENCRYPTION_PREFIX = "enc:";
const NEW_ENCRYPTION_PREFIX = "aes:";

// Debounce the sync function to avoid excessive Firestore writes
const debouncedSync = debounce(syncItemToFirestore, 2000);

/**
 * Get item from storage, decrypting it
 */
export async function getSecureItem<T>(key: string): Promise<T | null> {
  try {
    // 1. Check local storage first
    const localData = await AsyncStorage.getItem(key);

    if (localData) {
      // Data found locally, process it
      if (localData.startsWith(NEW_ENCRYPTION_PREFIX)) {
        const encryptedData = localData.substring(NEW_ENCRYPTION_PREFIX.length);
        return await decryptData(encryptedData);
      } else if (localData.startsWith(OLD_ENCRYPTION_PREFIX)) {
        console.log(`Found legacy encrypted data for ${key}, migrating...`);
        // Handle migration or return null/error as appropriate
        // For now, let's assume migration means setting it securely and returning null for this read
        // Or perhaps better, attempt decryption if possible, or just clear it
        await removeSecureItem(key); // Remove old format
        return null; // Indicate data needs re-setting or is gone
      } else {
        // Unencrypted legacy data - migrate it
        console.log(`Migrating unencrypted ${key} to secure storage...`);
        let parsedData;
        try {
          parsedData = JSON.parse(localData);
        } catch {
          parsedData = localData; // Treat as string if not JSON
        }
        // Encrypt and save, which also triggers Firestore sync
        await setSecureItem(key, parsedData);
        // Return the data we just migrated
        return parsedData;
      }
    } else {
      // 2. No local data found. Check Firestore only if not recently checked.
      // This prevents fetching from Firestore if we just deleted the item locally.
      if (!checkedKeys.has(key)) {
        const firestoreResult = await fetchItemFromFirestore(key);
        checkedKeys.add(key); // Mark as checked for this session

        if (firestoreResult) {
          // Data found in Firestore, update local storage and return decrypted data
          console.log(`Updating local data for ${key} from Firestore.`);
          const prefixedData = `${NEW_ENCRYPTION_PREFIX}${firestoreResult.data}`;
          await AsyncStorage.setItem(key, prefixedData);
          // Decrypt the data fetched from Firestore before returning
          return await decryptData(firestoreResult.data);
        }
      }
      // No local data and either no Firestore data or already checked Firestore this session
      return null;
    }
  } catch (error) {
    console.error(`Error getting secure item for key ${key}:`, error);
    return null;
  }
}

/**
 * Set item in storage, encrypting it
 */
export async function setSecureItem(key: string, data: any): Promise<void> {
  try {
    const encryptedData = await encryptData(data);

    // Add prefix to identify as encrypted data
    const prefixedData = `${NEW_ENCRYPTION_PREFIX}${encryptedData}`;
    await AsyncStorage.setItem(key, prefixedData);

    // Trigger debounced sync to Firestore
    debouncedSync(key, encryptedData);
  } catch (error) {
    console.error(`Error setting secure item for key ${key}:`, error);
    throw new Error("Failed to store encrypted data");
  }
}

/**
 * Remove item from storage
 */
export async function removeSecureItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    debouncedSync(key, ""); // Pass empty string instead of null to indicate deletion
  } catch (error) {
    console.error(`Error removing secure item for key ${key}:`, error);
  }
}

/**
 * Migration function to encrypt existing data
 */
export async function migrateToEncryption(): Promise<void> {
  try {
    console.log("Starting data migration to encrypted storage...");

    // List of keys to encrypt
    const keysToEncrypt = [
      "journal_entries",
      "mood_entries",
      "meditation_sessions",
      "favorite_meditations",
      "breathing_sessions",
      "total_breathing_time",
    ];

    for (const key of keysToEncrypt) {
      // Get data
      const data = await AsyncStorage.getItem(key);

      if (
        data &&
        !data.startsWith(OLD_ENCRYPTION_PREFIX) &&
        !data.startsWith(NEW_ENCRYPTION_PREFIX)
      ) {
        console.log(`Migrating ${key} to encrypted storage...`);

        // Parse if JSON
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch {
          parsedData = data;
        }

        // Encrypt and store
        await setSecureItem(key, parsedData);
        console.log(`Successfully migrated ${key}`);
      }
    }

    console.log("Data migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
  }
}
