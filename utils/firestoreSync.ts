import firestore from "@react-native-firebase/firestore";
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
    const updateData = {
      [key]: encryptedData,
      [`${key}_lastUpdated`]: firestore.FieldValue.serverTimestamp(),
      lastUpdated: firestore.FieldValue,
    };

    // Set with merge: true to only update the specific key
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
  key: string
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

      if (encryptedValue && timestampValue) {
        const timestamp = timestampValue.toDate(); // Convert Firestore Timestamp to JS Date
        return { data: encryptedValue, timestamp };
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${key} from Firestore:`, error);
    return null;
  }
}

/**
 * Fetches all user data from Firestore.
 */
export async function fetchAllUserDataFromFirestore(): Promise<Record<
  string,
  string
> | null> {
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
      for (const key in allData) {
        if (!key.endsWith("_lastUpdated") && key !== "lastUpdated") {
          userData[key] = allData[key];
        }
      }
      return userData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching all user data from Firestore:", error);
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
  const allFirestoreData = await fetchAllUserDataFromFirestore();

  if (!allFirestoreData) {
    console.log("No data found in Firestore for initial sync.");
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
