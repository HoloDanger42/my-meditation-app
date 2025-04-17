import AsyncStorage from "@react-native-async-storage/async-storage";
import { encryptData, decryptData } from "./encryption";

// Prefix to identify encrypted data
const OLD_ENCRYPTION_PREFIX = "enc:";
const NEW_ENCRYPTION_PREFIX = "aes:";

/**
 * Get item from storage, decrypting it
 */
export async function getSecureItem<T>(key: string): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(key);

    if (!data) return null;

    // Check encryption type
    if (data.startsWith(NEW_ENCRYPTION_PREFIX)) {
      // Modern AES encryption
      const encryptedData = data.substring(NEW_ENCRYPTION_PREFIX.length);
      return await decryptData(encryptedData);
    } else {
      // Unencrypted legacy data
      try {
        return JSON.parse(data);
      } catch {
        return data as unknown as T;
      }
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
    await AsyncStorage.setItem(key, `${NEW_ENCRYPTION_PREFIX}${encryptedData}`);
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
