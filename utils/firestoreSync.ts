import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore"; // Import types
import auth from "@react-native-firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_DATA_COLLECTION = "user_data";
const NEW_ENCRYPTION_PREFIX = "aes:";

/**
 * Saves encrypted user data to Firestore.
 */
export async function syncItemToFirestore(
  key: string,
  encryptedData: string
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

    // Use server timestamp for tracking updates
    const updateData: { [key: string]: any } = {
      [key]: encryptedData,
      [`${key}_lastUpdated`]: firestore.FieldValue.serverTimestamp(),
      // Correctly use serverTimestamp() for the general lastUpdated field
      lastUpdated: firestore.FieldValue.serverTimestamp(),
    };

    // Set with merge: true to only update the specific key and the timestamps
    await userDocRef.set(updateData, { merge: true });
    console.log(`Synced ${key} to Firestore for user ${user.uid}`);
  } catch (error) {
    console.error(`Error syncing ${key} to Firestore:`, error);
  }
}

/**
 * Fetches encrypted user data from Firestore.
 */
export async function fetchItemFromFirestore(
  key: string,
  retries = 3, // Add retry parameter
  delayMs = 1000 // Add delay parameter
): Promise<{ data: string; timestamp: Date } | null> {
  const user = auth().currentUser;
  if (!user) return null;

  try {
    const userDocRef = firestore()
      .collection(USER_DATA_COLLECTION)
      .doc(user.uid);
    const docSnapshot = await userDocRef.get();

    if (docSnapshot.exists) {
      const data = docSnapshot.data();
      const encryptedValue = data?.[key];
      const timestampValue = data?.[`${key}_lastUpdated`];

      if (encryptedValue && timestampValue && typeof encryptedValue === 'string' && timestampValue.toDate) {
        const timestamp = timestampValue.toDate(); // Convert Firestore Timestamp to JS Date
        return { data: encryptedValue, timestamp };
      }
    }
    return null;
  } catch (error: any) {
    console.error(`Error fetching ${key} from Firestore (attempt ${4 - retries}):`, error);

    // Check if it's an 'unavailable' error and if retries are left
    if (error.code === 'firestore/unavailable' && retries > 0) {
      console.log(`Firestore unavailable for ${key}, retrying in ${delayMs / 1000}s... (${retries} retries left)`);
      await delay(delayMs);
      // Retry with one less retry attempt and double the delay (exponential backoff)
      return fetchItemFromFirestore(key, retries - 1, delayMs * 2);
    }

    // If it's not an 'unavailable' error or retries are exhausted, return null
    return null;
  }
}

/**
 * Helper function to introduce a delay.
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches all user data from Firestore with retry logic for unavailable errors.
 */
export async function fetchAllUserDataFromFirestore(
  retries = 3,
  delayMs = 1000
): Promise<Record<string, string> | null> {
  const user = auth().currentUser;
  if (!user) return null;

  try {
    const userDocRef = firestore()
      .collection(USER_DATA_COLLECTION)
      .doc(user.uid);
    const docSnapshot = await userDocRef.get();

    if (docSnapshot.exists) {
      const allData = docSnapshot.data();
      // Filter out timestamp fields, keep only data fields
      const userData: Record<string, string> = {};
      if (allData) { // Check if allData is not undefined
        for (const key in allData) {
          if (!key.endsWith("_lastUpdated") && key !== "lastUpdated") {
            // Ensure the value is a string or handle other types appropriately
            if (typeof allData[key] === 'string') {
              userData[key] = allData[key];
            } else {
              // Handle non-string data if necessary, e.g., stringify or log a warning
              console.warn(`Non-string data found for key ${key} in Firestore. Skipping or converting.`);
              // Optionally convert to string: userData[key] = String(allData[key]);
            }
          }
        }
      }
      return userData;
    }
    return null;
  } catch (error: any) { // Use 'any' or a more specific error type
    console.error(`Error fetching all user data (attempt ${4 - retries}):`, error);

    // Check if it's an 'unavailable' error and if retries are left
    if (error.code === 'firestore/unavailable' && retries > 0) {
      console.log(`Firestore unavailable, retrying in ${delayMs / 1000}s... (${retries} retries left)`);
      await delay(delayMs);
      // Retry with one less retry attempt and double the delay (exponential backoff)
      return fetchAllUserDataFromFirestore(retries - 1, delayMs * 2);
    }

    // If it's not an 'unavailable' error or retries are exhausted, return null
    return null;
  }
}

// Keep track of keys already checked against Firestore in this session
const checkedKeys = new Set<string>();

/**
 * Performs an initial sync, fetching all data from Firestore and updating local storage.
 */
export async function performInitialSync(): Promise<void> {
  console.log("Performing initial sync from Firestore...");
  // Call the updated function (no need to pass args, defaults will be used)
  const allFirestoreData = await fetchAllUserDataFromFirestore();

  if (!allFirestoreData) {
    console.log("No data found in Firestore for initial sync or fetch failed.");
    return;
  }

  for (const key in allFirestoreData) {
    try {
      const encryptedData = allFirestoreData[key];

      // Check if local data exists and is different
      const localData = await AsyncStorage.getItem(key);
      const localEncrypted = localData?.startsWith(NEW_ENCRYPTION_PREFIX)
        ? localData.substring(NEW_ENCRYPTION_PREFIX.length)
        : null;

      if (localEncrypted !== encryptedData) {
        console.log(
          `Updating local ${key} from Firestore during initial sync.`
        );
        const prefixedData = `${NEW_ENCRYPTION_PREFIX}${encryptedData}`;
        await AsyncStorage.setItem(key, prefixedData);
      }
    } catch (error) {
      console.error(`Error updating key ${key} during initial sync:`, error);
    }
  }

  console.log("Initial sync completed.");
  checkedKeys.clear();
}

export { checkedKeys };
