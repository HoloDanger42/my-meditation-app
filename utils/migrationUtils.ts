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

async function old_decryptData(encryptedData: string): Promise<any> {
  try {
    if (!encryptedData) return null;

    if (encryptedData.startsWith("plain:")) {
      const plainData = encryptedData.substring(6);
      try {
        return JSON.parse(plainData);
      } catch {
        return plainData;
      }
    }

    const keyHex = await old_getEncryptionKey();
    const ivHex = await old_getIV();
    const salt = await old_getSalt();

    if (!keyHex || !ivHex || !salt) {
      console.error(
        "Migration: Could not retrieve old key/IV/salt. Decryption impossible."
      );
      if (keyHex && encryptedData.startsWith("simple:")) {
        return old_simpleDecrypt(encryptedData, keyHex);
      }
      throw new Error("Missing old encryption materials");
    }

    if (encryptedData.startsWith("simple:")) {
      const decryptedSimple = await old_simpleDecrypt(encryptedData, keyHex);
      try {
        return JSON.parse(decryptedSimple);
      } catch {
        return decryptedSimple;
      }
    }

    if (isExpoGo) {
      console.warn("Migration: Attempting simple decrypt for Expo Go data");
      const decryptedSimple = await old_simpleDecrypt(encryptedData, keyHex);
      try {
        return JSON.parse(decryptedSimple);
      } catch {
        return decryptedSimple;
      }
    }

    let decryptedString;
    try {
      if (Platform.OS === "web") {
        decryptedString = await old_decryptWeb(
          encryptedData,
          keyHex,
          ivHex,
          salt
        );
      } else {
        decryptedString = await old_decryptNative(
          encryptedData,
          keyHex,
          ivHex,
          salt
        );
      }
    } catch (specificError) {
      console.error(
        "Migration: Decryption failed after fallbacks.",
        specificError
      );
      throw new Error("Decryption failed");
    }
  } catch (error) {
    console.error("Migration: Decryption error:", error);
    return null;
  }
}

export async function old_readAndDecryptFromAsyncStorage<T>(
  key: string
): Promise<T | null> {
  try {
    const encryptedData = await AsyncStorage.getItem(key);

    if (encryptedData === null) {
      return null;
    }

    const decryptedData = await old_decryptData(encryptedData);

    if (decryptedData === null) {
      console.error(
        `Migration: Failed to decrypt data for key: ${key}. Original data: ${encryptedData.substring(
          0,
          50
        )}...`
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
