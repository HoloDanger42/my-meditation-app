import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  encode as encodeBase64,
  decode as decodeBase64,
  decode,
} from "base-64";
import AesCrypto, { decrypt, encrypt } from "react-native-aes-crypto";
import Constants from "expo-constants";

const ENCRYPTION_KEY_STORAGE = "MEDITATION_APP_ENCRYPTION_KEY";
const ENCRYPTION_IV_STORAGE = "MEDITATION_APP_ENCRYPTION_IV";
const ENCRYPTION_SALT_STORAGE = "MEDITATION_APP_ENCRYPTION_SALT";
const KEY_SIZE = 256;
const ITERATIONS = 10000;
const isExpoGo = Constants.installationId !== undefined;

function hexToUint8Array(hexString: string): Uint8Array {
  const match = hexString.match(/.{1,2}/g);
  if (!match) return new Uint8Array();
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

async function old_getEncryptionKey(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE);
    } else {
      return await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE);
    }
  } catch (error) {
    console.error("Migration: Error getting OLD encryption key:", error);
    return null;
  }
}

async function old_getIV(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return await AsyncStorage.getItem(ENCRYPTION_IV_STORAGE);
    } else {
      return await SecureStore.getItemAsync(ENCRYPTION_IV_STORAGE);
    }
  } catch (error) {
    console.error("Migration: Error getting OLD IV:", error);
    return null;
  }
}

async function old_getSalt(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return await AsyncStorage.getItem(ENCRYPTION_SALT_STORAGE);
    } else {
      return await SecureStore.getItemAsync(ENCRYPTION_SALT_STORAGE);
    }
  } catch (error) {
    console.error("Migration: Error getting OLD salt:", error);
    return null;
  }
}

async function old_simpleDecrypt(
  encryptedText: string,
  key: string
): Promise<string> {
  try {
    if (encryptedText.startsWith("simple:")) {
      encryptedText = encryptedText.substring(7);
    }
    const decoded = decodeBase64(encryptedText);
    const simpleKey = key.split("").map((c) => c.charCodeAt(0));
    const keyLength = simpleKey.length;
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
    console.error("Migration: Simple decryption failed:", e);
    return encryptedText;
  }
}

async function old_decryptWeb(
  encryptedBase64: string,
  keyHex: string,
  ivHex: string,
  salt: string
): Promise<string> {
  if (encryptedBase64.startsWith("simple:")) {
    return old_simpleDecrypt(encryptedBase64, keyHex);
  }
  if (
    typeof window === "undefined" ||
    !window.crypto ||
    !window.crypto.subtle
  ) {
    console.warn("Migration: Web Crypto API not available for decryption.");
    return old_simpleDecrypt(encryptedBase64, keyHex);
  }
  try {
    const encryptedBytes = Uint8Array.from(
      decodeBase64(encryptedBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const keyData = hexToUint8Array(keyHex);
    const ivData = hexToUint8Array(ivHex);
    const saltData = hexToUint8Array(salt);
    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltData,
        iterations: ITERATIONS,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-CBC", length: KEY_SIZE },
      false,
      ["decrypt"]
    );
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-CBC", iv: ivData },
      derivedKey,
      encryptedBytes
    );
    return new TextDecoder().decode(new Uint8Array(decryptedBuffer));
  } catch (error) {
    console.warn("Migration: Web Crypto API decryption failed:", error);
    return old_simpleDecrypt(encryptedBase64, keyHex);
  }
}

async function old_decryptNative(
  encryptedBase64: string,
  keyHex: string,
  ivHex: string,
  salt: string
): Promise<string> {
  if (!AesCrypto) {
    console.warn(
      "Migration: AesCrypto not available, falling back to web implementation"
    );
    return old_decryptWeb(encryptedBase64, keyHex, ivHex, salt);
  }
  try {
    const key = await AesCrypto.pbkdf2(
      keyHex,
      salt,
      ITERATIONS,
      KEY_SIZE,
      "sha256"
    );
    return await AesCrypto.decrypt(encryptedBase64, key, ivHex, "aes-256-cbc");
  } catch (error) {
    console.warn(
      "Migration: Native decryption failed, falling back to web implementation",
      error
    );
    return old_decryptWeb(encryptedBase64, keyHex, ivHex, salt);
  }
}

async function old_decryptData(rawDataFromStorage: string): Promise<any> {
  console.log(
    `Migration Debug: old_decryptData received input starting with: ${rawDataFromStorage.substring(
      0,
      100
    )}...`
  );

  try {
    if (!rawDataFromStorage) return null;

    let dataToProcess = rawDataFromStorage;
    let isPotentiallyEncrypted = false;

    if (rawDataFromStorage.startsWith("plain:")) {
      const plainData = rawDataFromStorage.substring(6);
      console.log("Migration: Detected 'plain:' prefix.");
      try {
        return JSON.parse(plainData);
      } catch {
        return plainData;
      }
    } else if (rawDataFromStorage.startsWith("simple:")) {
      console.log("Migration: Detected 'simple:' prefix.");
      dataToProcess = rawDataFromStorage.substring(7);
      isPotentiallyEncrypted = true;
    } else if (rawDataFromStorage.startsWith("aes:")) {
      console.log("Migration: Detected 'aes:' prefix.");
      dataToProcess = rawDataFromStorage.substring(4);
      isPotentiallyEncrypted = true;
    } else {
      // No known prefix, could be plain JSON or maybe encrypted without prefix
      console.log("Migration: No known prefix detected.");
      dataToProcess = rawDataFromStorage;
      // Assume it might be encrypted if it doesn't look like JSON
      isPotentiallyEncrypted = !(
        dataToProcess.trim().startsWith("{") ||
        dataToProcess.trim().startsWith("[")
      );
    }

    if (isPotentiallyEncrypted) {
      const keyHex = await old_getEncryptionKey();
      const ivHex = await old_getIV();
      const salt = await old_getSalt();

      if (keyHex && ivHex && salt) {
        console.log("Migration: Keys found. Attempting decryption...");
        try {
          let decryptedString;
          // Prioritize simple decrypt if original prefix was 'simple:' or if ExpoGo/Web fallback needed
          if (
            rawDataFromStorage.startsWith("simple:") ||
            isExpoGo ||
            Platform.OS === "web"
          ) {
            console.log("Migration: Attempting simple decryption path...");
            // Pass the stripped dataToProcess
            decryptedString = await old_simpleDecrypt(dataToProcess, keyHex);
          } else {
            console.log("Migration: Attempting native decryption path...");
            // Pass the stripped dataToProcess
            decryptedString = await old_decryptNative(
              dataToProcess,
              keyHex,
              ivHex,
              salt
            );
          }

          // Decryption attempt finished (may have fallen back to simple within native/web)
          console.log(
            "Migration: Decryption attempt complete. Trying to parse result."
          );
          try {
            // Try parsing the result of decryption
            return JSON.parse(decryptedString);
          } catch (parseError) {
            console.warn(
              "Migration: Failed to parse decrypted string as JSON. Returning raw decrypted string.",
              parseError
            );
            return decryptedString;
          }
        } catch (decryptionError) {
          // Catch errors from the decryption functions themselves (e.g., base64 errors if stripping prefix didn't help)
          console.error(
            "Migration: Decryption function failed:",
            decryptionError
          );
          // Fall through to try parsing the original raw data
        }
      } else {
        console.warn(
          "Migration: Data looked encrypted, but old key/IV/salt not found. Cannot decrypt."
        );
      }
    }

    try {
      console.log(
        "Migration: Fallback - Attempting to parse original raw data directly as JSON."
      );
      return JSON.parse(rawDataFromStorage);
    } catch (jsonError) {
      console.error(
        `Migration: FINAL FAILURE - Failed to decrypt AND failed to parse raw data as JSON. Raw data: ${rawDataFromStorage.substring(
          0,
          100
        )}...`,
        jsonError
      );
    }

    return null;
  } catch (error) {
    console.error("Migration: Critical error within old_decryptData:", error);
    return null;
  }
}

export async function old_readAndDecryptFromAsyncStorage<T>(
  key: string
): Promise<T | null> {
  try {
    const rawDataFromStorage = await AsyncStorage.getItem(key);

    if (rawDataFromStorage === null) {
      return null;
    }

    console.log(
      `Migration Debug: Raw data from AsyncStorage for key '${key}':`,
      rawDataFromStorage.substring(0, 100) +
        (rawDataFromStorage.length > 100 ? "..." : "")
    );

    const decryptedData = await old_decryptData(rawDataFromStorage);

    if (decryptedData === null) {
      console.error(
        `Migration: Failed to decrypt or parse data for key '${key}'.`
      );
      return null;
    }

    return decryptedData as T;
  } catch (error) {
    console.error(
      `Migration: Error reading/decrypting old AsyncStorage key ${key}`,
      error
    );
    return null;
  }
}

export async function removeOldAsyncStorageItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(
      `Migration: Error removing old AsyncStorage key ${key}`,
      error
    );
  }
}
