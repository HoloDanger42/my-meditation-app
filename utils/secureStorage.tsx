import AsyncStorage from "@react-native-async-storage/async-storage";
import { encryptData, decryptData } from "./encryption";
import {
  syncItemToFirestore,
  fetchItemFromFirestore,
  checkedKeys,
} from "./firestoreSync";
import { debounce } from "lodash";

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
    if (!checkedKeys.has(key)) {
      const firestoreResult = await fetchItemFromFirestore(key);
      checkedKeys.add(key); // Mark as checked

      if (firestoreResult) {
        const localData = await AsyncStorage.getItem(key);
        let shouldUpdateLocal = !localData; // Update if local doesn't exist

        if (localData && localData.startsWith(NEW_ENCRYPTION_PREFIX)) {
          // Firestore data is different from local data
          const localEncrypted = localData.substring(
            NEW_ENCRYPTION_PREFIX.length
          );
          if (localEncrypted !== firestoreResult.data) {
            console.log(
              `Firestore data for ${key} seems newer. Updating local.`
            );
            shouldUpdateLocal = true;
          }
        }

        if (shouldUpdateLocal) {
          console.log(`Updating local data for ${key} from Firestore.`);
          const prefixedData = `${NEW_ENCRYPTION_PREFIX}${firestoreResult.data}`;
          await AsyncStorage.setItem(key, prefixedData);
        }
      }
    }

    const data = await AsyncStorage.getItem(key);

    if (!data) return null;

    // Check encryption type
    if (data.startsWith(NEW_ENCRYPTION_PREFIX)) {
      // Modern AES encryption
      const encryptedData = data.substring(NEW_ENCRYPTION_PREFIX.length);
      return await decryptData(encryptedData);
    } else if (data.startsWith(OLD_ENCRYPTION_PREFIX)) {
      console.log(`Found legacy encrypted data for ${key}, migrating...`);
      return null;
    } else {
      // Unencrypted legacy data
      console.log(`Migrating unencrypted ${key} to secure storage...`);
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }
      await setSecureItem(key, parsedData); // Save securely (triggers sync)
      return parsedData;
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
