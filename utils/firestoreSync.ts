import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import {
  getSecureItem,
  setSecureItem,
  registerSyncProvider,
  onAuthenticated,
  getAuthenticationState,
} from "./secureStorage";
import { SyncInterface } from "./storageInterfaces";
import * as Crypto from "expo-crypto";
import { encode as encodeBase64, decode as decodeBase64 } from "base-64";
import { Platform } from "react-native";
import AesCrypto from "react-native-aes-crypto";
import Constants from "expo-constants";

const USER_DATA_COLLECTION = "user_data";
const ENCRYPTION_PREFIX = "aes:";
const SIMPLE_PREFIX = "simple:";
const PLAIN_PREFIX = "plain:";

// Constants for AES encryption
const KEY_SIZE = 256; // AES-256
const ITERATIONS = 10000; // For PBKDF2 key derivation
const isExpoGo = Constants.appOwnership === "expo";

/**
 * Encrypts data before storing in Firestore
 * Uses AES for native platforms, with fallback to simpler methods
 */
async function encryptForFirestore(data: any): Promise<string> {
  try {
    // Convert data to JSON string
    const jsonString = JSON.stringify(data);

    // Get user UID as encryption key basis (ensures each user's data has unique encryption)
    const user = auth().currentUser;
    if (!user?.uid) {
      throw new Error("No user ID available for encryption");
    }

    // Create a hash of the user's UID to use as encryption key
    const keyHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      user.uid + "MEDITATION_APP_SECRET_SALT" // Add app-specific salt
    );

    // Generate a random IV for each encryption (16 bytes for AES)
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const ivHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Use salt for key derivation (can be fixed since we already use a unique key per user)
    const salt = "MeditationAppStaticSalt";

    // If in Expo Go, directly use simple encryption to avoid unsupported methods
    if (isExpoGo) {
      return simpleEncrypt(jsonString, keyHex);
    }

    try {
      // Platform-specific encryption
      if (Platform.OS !== "web") {
        // Use native AES encryption
        const encrypted = await encryptWithAesNative(
          jsonString,
          keyHex,
          ivHex,
          salt
        );
        return `${ENCRYPTION_PREFIX}${ivHex}:${encrypted}`;
      } else {
        // For web platform (though this is unlikely in your React Native app)
        throw new Error("Web platform not supported directly");
      }
    } catch (specificError) {
      console.warn(
        "AES encryption failed, falling back to simple encryption",
        specificError
      );
      return simpleEncrypt(jsonString, keyHex);
    }
  } catch (error) {
    console.error("Encryption for Firestore failed:", error);
    // If encryption fails completely, return a version marked as plaintext
    return `${PLAIN_PREFIX}${JSON.stringify(data)}`;
  }
}

/**
 * Native platform encryption using AesCrypto
 */
async function encryptWithAesNative(
  text: string,
  keyHex: string,
  ivHex: string,
  salt: string
): Promise<string> {
  // Check if AesCrypto is available
  if (!AesCrypto) {
    throw new Error("AesCrypto not available");
  }

  // Derive a key using PBKDF2
  const key = await AesCrypto.pbkdf2(
    keyHex,
    salt,
    ITERATIONS,
    KEY_SIZE,
    "sha256"
  );

  // Encrypt using AES-CBC
  return await AesCrypto.encrypt(text, key, ivHex, "aes-256-cbc");
}

/**
 * Native platform decryption using AesCrypto
 */
async function decryptWithAesNative(
  encryptedBase64: string,
  keyHex: string,
  ivHex: string,
  salt: string
): Promise<string> {
  // Check if AesCrypto is available
  if (!AesCrypto) {
    throw new Error("AesCrypto not available");
  }

  // Derive the same key
  const key = await AesCrypto.pbkdf2(
    keyHex,
    salt,
    ITERATIONS,
    KEY_SIZE,
    "sha256"
  );

  // Decrypt
  return await AesCrypto.decrypt(
    encryptedBase64,
    key,
    ivHex,
    "aes-256-cbc" // AES-CBC mode
  );
}

/**
 * Decrypts data retrieved from Firestore
 */
async function decryptFromFirestore(encryptedString: string): Promise<any> {
  try {
    // If it's not encrypted (no known prefix), return as is
    if (
      !encryptedString.startsWith(ENCRYPTION_PREFIX) &&
      !encryptedString.startsWith(SIMPLE_PREFIX) &&
      !encryptedString.startsWith(PLAIN_PREFIX)
    ) {
      // Try to parse it as JSON first
      try {
        return JSON.parse(encryptedString);
      } catch (e) {
        // If not valid JSON, return as string
        return encryptedString;
      }
    }

    // Handle plaintext fallback
    if (encryptedString.startsWith(PLAIN_PREFIX)) {
      const plainData = encryptedString.substring(PLAIN_PREFIX.length);
      try {
        return JSON.parse(plainData);
      } catch {
        return plainData;
      }
    }

    // Get user UID for decryption key
    const user = auth().currentUser;
    if (!user?.uid) {
      throw new Error("No user ID available for decryption");
    }

    // Create the same hash of the user's UID
    const keyHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      user.uid + "MEDITATION_APP_SECRET_SALT"
    );

    // Fixed salt for key derivation (same as encryption)
    const salt = "MeditationAppStaticSalt";

    // Handle simple encryption format
    if (encryptedString.startsWith(SIMPLE_PREFIX)) {
      const decryptedString = await simpleDecrypt(encryptedString, keyHex);
      try {
        return JSON.parse(decryptedString);
      } catch {
        return decryptedString;
      }
    }

    // Handle AES encryption format
    if (encryptedString.startsWith(ENCRYPTION_PREFIX)) {
      try {
        // Remove prefix
        const data = encryptedString.substring(ENCRYPTION_PREFIX.length);

        // Split IV and encrypted data
        const [ivHex, encryptedData] = data.split(":");

        if (!ivHex || !encryptedData) {
          throw new Error("Invalid encrypted data format");
        }

        // Use native decryption
        if (Platform.OS !== "web") {
          const decryptedString = await decryptWithAesNative(
            encryptedData,
            keyHex,
            ivHex,
            salt
          );
          try {
            return JSON.parse(decryptedString);
          } catch {
            return decryptedString;
          }
        } else {
          throw new Error("Web platform not supported directly");
        }
      } catch (error) {
        console.warn(
          "AES decryption failed, attempting simple decrypt as fallback",
          error
        );
        // Try simple decrypt as a fallback
        return simpleDecrypt(encryptedString, keyHex).then((str) => {
          try {
            return JSON.parse(str);
          } catch {
            return str;
          }
        });
      }
    }

    throw new Error("Unknown encryption format");
  } catch (error) {
    console.error("Decryption from Firestore failed:", error);
    // If all decryption methods fail, return null to indicate failure
    return null;
  }
}

// Simple XOR encryption as a fallback
function simpleEncrypt(text: string, key: string): string {
  try {
    // Create a simple key from the hash
    const simpleKey = key.split("").map((c) => c.charCodeAt(0));
    const keyLength = simpleKey.length;

    // XOR each character with the key
    const result = text
      .split("")
      .map((char, index) => {
        const charCode = char.charCodeAt(0);
        const keyChar = simpleKey[index % keyLength];
        return String.fromCharCode(charCode ^ keyChar);
      })
      .join("");

    // Return as base64 to ensure it's transportable
    return `${SIMPLE_PREFIX}${encodeBase64(result)}`;
  } catch (e) {
    console.error("Simple encryption failed:", e);
    return `${PLAIN_PREFIX}${text}`;
  }
}

// Simple XOR decryption as a fallback
async function simpleDecrypt(
  encryptedText: string,
  key: string
): Promise<string> {
  try {
    // Remove prefix
    if (encryptedText.startsWith(SIMPLE_PREFIX)) {
      encryptedText = encryptedText.substring(SIMPLE_PREFIX.length);
    }

    // Decode from base64
    const decoded = decodeBase64(encryptedText);

    // Create a simple key from the hash
    const simpleKey = key.split("").map((c) => c.charCodeAt(0));
    const keyLength = simpleKey.length;

    // XOR each character with the key (XOR is reversible)
    const result = decoded
      .split("")
      .map((char, index) => {
        const charCode = char.charCodeAt(0);
        const keyChar = simpleKey[index % keyLength];
        return String.fromCharCode(charCode ^ keyChar);
      })
      .join("");

    return result;
  } catch (e) {
    console.error("Simple decryption failed:", e);
    throw e;
  }
}

/**
 * Saves native JavaScript objects/arrays to Firestore with encryption.
 * @param key The key under which to store the data
 * @param data The actual JavaScript object/array (not stringified)
 */
export async function syncObjectToFirestore(
  key: string,
  data: any
): Promise<void> {
  const user = auth().currentUser;
  if (!user) {
    console.log("Cannot sync to Firestore: No user logged in.");
    return;
  }

  try {
    const userDocRef = firestore()
      .collection(USER_DATA_COLLECTION)
      .doc(user.uid);

    // Handle data removal if null/undefined is passed
    let updateValue: any;
    if (data === null || data === undefined) {
      updateValue = firestore.FieldValue.delete();
      console.log(`Removing ${key} from Firestore for user ${user.uid}`);
    } else {
      // Encrypt the data before storing
      updateValue = await encryptForFirestore(data);
      console.log(`Syncing encrypted ${key} to Firestore for user ${user.uid}`);
    }

    const updateData: { [key: string]: any } = {
      [key]: updateValue,
      [`${key}_lastUpdated`]: firestore.FieldValue.serverTimestamp(),
      lastUpdated: firestore.FieldValue.serverTimestamp(),
    };

    // Use update to handle deletions properly
    try {
      await userDocRef.update(updateData);
    } catch (updateError: any) {
      // If document doesn't exist, fall back to set with merge
      if (updateError.code === "firestore/not-found") {
        // Don't try to set FieldValue.delete() in a new document
        if (data !== null && data !== undefined) {
          const setData = {
            [key]: updateValue, // encrypted data
            [`${key}_lastUpdated`]: firestore.FieldValue.serverTimestamp(),
            lastUpdated: firestore.FieldValue.serverTimestamp(),
          };
          await userDocRef.set(setData, { merge: true });
          console.log(
            `Created new document for user ${user.uid} with encrypted ${key}`
          );
        }
      } else {
        throw updateError; // Re-throw if it's a different error
      }
    }
  } catch (error) {
    console.error(`Error syncing ${key} to Firestore:`, error);
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use syncObjectToFirestore instead
 */
export async function syncItemToFirestore(
  key: string,
  stringifiedData: string
): Promise<void> {
  try {
    // If it's an empty string, send null to delete the field
    if (stringifiedData === "") {
      await syncObjectToFirestore(key, null);
      return;
    }

    // Try to parse the string into an object for better storage
    try {
      const parsedData = JSON.parse(stringifiedData);
      await syncObjectToFirestore(key, parsedData);
    } catch {
      // If parsing fails, store as raw string
      await syncObjectToFirestore(key, stringifiedData);
    }
  } catch (error) {
    console.error(`Error in legacy syncItemToFirestore for ${key}:`, error);
  }
}

// Create a sync provider that implements the SyncInterface
const firestoreSyncProvider: SyncInterface = {
  syncItem: async (key: string, data: any): Promise<void> => {
    return syncObjectToFirestore(key, data);
  },
};

// Register this provider with secureStorage
registerSyncProvider(firestoreSyncProvider);

/**
 * Fetches native JavaScript object/array data from Firestore and decrypts it.
 */
export async function fetchItemFromFirestore(
  key: string,
  retries = 3,
  delayMs = 1000
): Promise<{ data: any; timestamp: Date } | null> {
  const user = auth().currentUser;
  if (!user) return null;

  try {
    const userDocRef = firestore()
      .collection(USER_DATA_COLLECTION)
      .doc(user.uid);
    const docSnapshot = await userDocRef.get();

    if (docSnapshot.exists) {
      const data = docSnapshot.data();
      const encryptedValue = data?.[key]; // Get the encrypted value
      const timestampValue = data?.[`${key}_lastUpdated`];

      if (
        encryptedValue !== undefined &&
        timestampValue &&
        timestampValue.toDate
      ) {
        const timestamp = timestampValue.toDate();

        // Decrypt the data if it's a string (encrypted)
        if (typeof encryptedValue === "string") {
          const decryptedValue = await decryptFromFirestore(encryptedValue);
          return { data: decryptedValue, timestamp };
        }

        // If it's not a string, return as is (might be a FieldValue.delete())
        return { data: encryptedValue, timestamp };
      }
    }
    return null;
  } catch (error: any) {
    console.error(
      `Error fetching ${key} from Firestore (attempt ${4 - retries}):`,
      error
    );

    if (error.code === "firestore/unavailable" && retries > 0) {
      console.log(
        `Firestore unavailable for ${key}, retrying in ${
          delayMs / 1000
        }s... (${retries} retries left)`
      );
      await delay(delayMs);
      return fetchItemFromFirestore(key, retries - 1, delayMs * 2);
    }
    return null;
  }
}

/**
 * Helper function to introduce a delay.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches all user data from Firestore and decrypts it.
 */
export async function fetchAllUserDataFromFirestore(
  retries = 3,
  delayMs = 1000
): Promise<Record<string, any> | null> {
  const user = auth().currentUser;
  if (!user) return null;

  try {
    const userDocRef = firestore()
      .collection(USER_DATA_COLLECTION)
      .doc(user.uid);
    const docSnapshot = await userDocRef.get();

    if (docSnapshot.exists) {
      const allData = docSnapshot.data();
      const userData: Record<string, any> = {};

      if (allData) {
        const decryptionPromises: Promise<void>[] = [];

        for (const key in allData) {
          // Skip timestamp fields
          if (!key.endsWith("_lastUpdated") && key !== "lastUpdated") {
            const value = allData[key];

            // If it's a string, it might be encrypted
            if (typeof value === "string") {
              // Create a promise for each decryption task
              const decryptPromise = (async () => {
                try {
                  userData[key] = await decryptFromFirestore(value);
                } catch (error) {
                  console.error(
                    `Failed to decrypt ${key}, storing encrypted:`,
                    error
                  );
                  userData[key] = value; // Store as is if decryption fails
                }
              })();

              decryptionPromises.push(decryptPromise);
            } else {
              // If it's not a string, store as is
              userData[key] = value;
            }
          }
        }

        // Wait for all decryption operations to complete
        await Promise.all(decryptionPromises);
      }
      return userData;
    }
    return null;
  } catch (error: any) {
    console.error(
      `Error fetching all user data (attempt ${4 - retries}):`,
      error
    );

    if (error.code === "firestore/unavailable" && retries > 0) {
      console.log(
        `Firestore unavailable, retrying in ${
          delayMs / 1000
        }s... (${retries} retries left)`
      );
      await delay(delayMs);
      return fetchAllUserDataFromFirestore(retries - 1, delayMs * 2);
    }
    return null;
  }
}

// Keep track of keys already checked against Firestore in this session
const checkedKeys = new Set<string>();

/**
 * Performs an initial sync, fetching all data from Firestore and updating local storage.
 */
export function performInitialSync(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already authenticated. If so, run immediately.
    if (getAuthenticationState()) {
      console.log("Already authenticated, performing initial sync...");
      runSync().then(resolve).catch(reject);
      return;
    }

    // Otherwise, wait for authentication.
    console.log("Waiting for authentication to perform initial sync...");
    onAuthenticated(() => {
      console.log("Authentication successful, performing initial sync...");
      runSync().then(resolve).catch(reject);
    });
  });
}

/**
 * The core logic for the sync process.
 */
async function runSync(): Promise<void> {
  const allFirestoreData = await fetchAllUserDataFromFirestore();

  if (!allFirestoreData) {
    console.log("No data found in Firestore for initial sync or fetch failed.");
    return;
  }

  const syncPromises = Object.keys(allFirestoreData).map(async (key) => {
    try {
      const firestoreData = allFirestoreData[key];

      // Get current local data using getSecureItem
      const localData = await getSecureItem<any>(key);

      // Compare using stringification (simple deep comparison)
      const localStringData =
        localData !== null ? JSON.stringify(localData) : null;
      const firestoreStringData =
        firestoreData !== null ? JSON.stringify(firestoreData) : null;

      if (localStringData !== firestoreStringData) {
        console.log(
          `Updating local SecureStore for ${key} from Firestore during initial sync.`
        );
        // Save the fetched object/array directly with setSecureItem
        await setSecureItem(key, firestoreData);
      }
    } catch (error) {
      console.error(`Error updating key ${key} during initial sync:`, error);
    }
  });

  await Promise.all(syncPromises);

  console.log("Initial sync completed.");
  checkedKeys.clear();
}

export { checkedKeys };
