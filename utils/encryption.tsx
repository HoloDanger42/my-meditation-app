import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { encode as encodeBase64, decode as decodeBase64 } from "base-64";
import AesCrypto from "react-native-aes-crypto";
import Constants from "expo-constants";

// Key to use for storing the encryption key itself
const ENCRYPTION_KEY_STORAGE = "MEDITATION_APP_ENCRYPTION_KEY";
const ENCRYPTION_IV_STORAGE = "MEDITATION_APP_ENCRYPTION_IV";
const ENCRYPTION_SALT_STORAGE = "MEDITATION_APP_ENCRYPTION_SALT";
const KEY_SIZE = 256; // AES-256
const ITERATIONS = 10000; // For PBKDF2 key derivation

// Check if we're running in Expo Go
const isExpoGo = Constants.appOwnership === "expo";

/**
 * Generate a secure random salt for key derivation
 */
export async function generateSalt(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a secure random key for encryption
 */
export async function generateEncryptionKey(): Promise<string> {
  // Generate 256-bit (32 bytes) random key
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a secure random IV (Initialization Vector)
 */
export async function generateIV(): Promise<string> {
  // 16 bytes for AES
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get the encryption key (generate if it doesn't exist)
 */
export async function getEncryptionKey(): Promise<string> {
  try {
    let key;

    if (Platform.OS === "web") {
      key = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE);
    } else {
      key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE);
    }

    if (!key) {
      key = await generateEncryptionKey();

      if (Platform.OS === "web") {
        await AsyncStorage.setItem(ENCRYPTION_KEY_STORAGE, key);
      } else {
        await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE, key);
      }
    }

    return key;
  } catch (error) {
    console.error("Error getting encryption key:", error);
    throw new Error("Failed to get encryption key");
  }
}

/**
 * Get the salt for key derivation (generate if it doesn't exist)
 */
export async function getSalt(): Promise<string> {
  try {
    let salt;

    if (Platform.OS === "web") {
      salt = await AsyncStorage.getItem(ENCRYPTION_SALT_STORAGE);
    } else {
      salt = await SecureStore.getItemAsync(ENCRYPTION_SALT_STORAGE);
    }

    if (!salt) {
      salt = await generateSalt();

      if (Platform.OS === "web") {
        await AsyncStorage.setItem(ENCRYPTION_SALT_STORAGE, salt);
      } else {
        await SecureStore.setItemAsync(ENCRYPTION_SALT_STORAGE, salt);
      }
    }

    return salt;
  } catch (error) {
    console.error("Error getting salt:", error);
    throw new Error("Failed to get encryption salt");
  }
}

/**
 * Get the IV (generate if it doesn't exist)
 */
export async function getIV(): Promise<string> {
  try {
    let iv;

    if (Platform.OS === "web") {
      iv = await AsyncStorage.getItem(ENCRYPTION_IV_STORAGE);
    } else {
      iv = await SecureStore.getItemAsync(ENCRYPTION_IV_STORAGE);
    }

    if (!iv) {
      iv = await generateIV();

      if (Platform.OS === "web") {
        await AsyncStorage.setItem(ENCRYPTION_IV_STORAGE, iv);
      } else {
        await SecureStore.setItemAsync(ENCRYPTION_IV_STORAGE, iv);
      }
    }

    return iv;
  } catch (error) {
    console.error("Error getting IV:", error);
    throw new Error("Failed to get encryption IV");
  }
}

/**
 * Encrypt data using appropriate method for the platform
 */
export async function encryptData(data: any): Promise<string> {
  try {
    const jsonString = typeof data === "string" ? data : JSON.stringify(data);

    // Get encryption materials
    const keyHex = await getEncryptionKey();
    const ivHex = await getIV();
    const salt = await getSalt();

    try {
      // If in Expo Go, directly use simple encryption to avoid unsupported methods
      if (isExpoGo) {
        return simpleEncrypt(jsonString, keyHex);
      }

      // Platform-specific encryption for other environments
      if (Platform.OS === "web") {
        return await encryptWeb(jsonString, keyHex, ivHex, salt);
      } else {
        return await encryptNative(jsonString, keyHex, ivHex, salt);
      }
    } catch (specificError) {
      // If platform-specific encryption fails, try fallback
      if (!isExpoGo) {
        console.warn(
          "Platform-specific encryption failed, using fallback",
          specificError
        );
      }
      return await encryptWeb(jsonString, keyHex, ivHex, salt);
    }
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error(
      "Failed to encrypt data. Data protection cannot be guaranteed."
    );
  }
}

/**
 * Decrypt data depending on platform
 */
export async function decryptData(encryptedData: string): Promise<any> {
  try {
    // Check if this is a plaintext fallback from a failed encryption
    if (encryptedData.startsWith("plain:")) {
      const plainData = encryptedData.substring(6); // Remove 'plain:' prefix
      try {
        return JSON.parse(plainData);
      } catch {
        return plainData;
      }
    }

    // Check if this is a simple encryption (which is likely in Expo Go)
    if (encryptedData.startsWith("simple:")) {
      const keyHex = await getEncryptionKey();
      return simpleDecrypt(encryptedData, keyHex);
    }

    // Get encryption materials
    const keyHex = await getEncryptionKey();
    const ivHex = await getIV();
    const salt = await getSalt();

    // If in Expo Go, try simple decryption directly
    if (isExpoGo) {
      return simpleDecrypt(encryptedData, keyHex);
    }

    // For other environments, decrypt based on platform
    let decryptedString;
    try {
      if (Platform.OS === "web") {
        decryptedString = await decryptWeb(encryptedData, keyHex, ivHex, salt);
      } else {
        decryptedString = await decryptNative(
          encryptedData,
          keyHex,
          ivHex,
          salt
        );
      }
    } catch (specificError) {
      // If platform-specific decryption fails, try web fallback
      if (!isExpoGo) {
        console.warn(
          "Platform-specific decryption failed, using fallback",
          specificError
        );
      }
      decryptedString = await decryptWeb(encryptedData, keyHex, ivHex, salt);
    }

    // Parse JSON if possible
    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  } catch (error) {
    console.error("Decryption error:", error);

    // Return the raw encrypted data as a last resort
    return encryptedData;
  }
}

/**
 * Native platform encryption using AesCrypto
 */
async function encryptNative(
  text: string,
  keyHex: string,
  ivHex: string,
  salt: string
): Promise<string> {
  // Check if AesCrypto is available
  if (!AesCrypto) {
    if (!isExpoGo) {
      console.warn(
        "AesCrypto not available, falling back to web implementation"
      );
    }
    return encryptWeb(text, keyHex, ivHex, salt);
  }

  try {
    // Derive a key using PBKDF2
    const key = await AesCrypto.pbkdf2(
      keyHex,
      salt,
      ITERATIONS,
      KEY_SIZE,
      "sha256"
    );

    // Encrypt using AES-CBC
    const encrypted = await AesCrypto.encrypt(text, key, ivHex, "aes-256-cbc");

    return encrypted;
  } catch (error) {
    if (!isExpoGo) {
      console.warn(
        "Native encryption failed, falling back to web implementation",
        error
      );
    }
    return encryptWeb(text, keyHex, ivHex, salt);
  }
}

/**
 * Native platform decryption using AesCrypto
 */
async function decryptNative(
  encryptedBase64: string,
  keyHex: string,
  ivHex: string,
  salt: string
): Promise<string> {
  // Check if AesCrypto is available
  if (!AesCrypto) {
    console.warn("AesCrypto not available, falling back to web implementation");
    return decryptWeb(encryptedBase64, keyHex, ivHex, salt);
  }

  try {
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
  } catch (error) {
    console.warn(
      "Native decryption failed, falling back to web implementation",
      error
    );
    return decryptWeb(encryptedBase64, keyHex, ivHex, salt);
  }
}

/**
 * Web platform encryption using Web Crypto API
 */
async function encryptWeb(
  text: string,
  keyHex: string,
  ivHex: string,
  salt: string
): Promise<string> {
  // Check if Web Crypto API is available
  if (
    typeof window === "undefined" ||
    !window.crypto ||
    !window.crypto.subtle
  ) {
    if (!isExpoGo) {
      console.warn("Web Crypto API not available, using simple encryption");
    }
    return simpleEncrypt(text, keyHex);
  }

  try {
    // Convert hex to Uint8Array
    const keyData = hexToUint8Array(keyHex);
    const ivData = hexToUint8Array(ivHex);
    const saltData = hexToUint8Array(salt);
    const textData = new TextEncoder().encode(text);

    // Derive key using PBKDF2
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
      ["encrypt"]
    );

    // Encrypt with AES-CBC
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-CBC", iv: ivData },
      derivedKey,
      textData
    );

    // Convert to Base64 string for storage
    const encryptedArray = new Uint8Array(encryptedBuffer);
    return encodeBase64(String.fromCharCode(...encryptedArray));
  } catch (error) {
    if (!isExpoGo) {
      console.warn(
        "Web Crypto API encryption failed, using simple encryption",
        error
      );
    }
    return simpleEncrypt(text, keyHex);
  }
}

/**
 * Web platform decryption using Web Crypto API
 */
async function decryptWeb(
  encryptedBase64: string,
  keyHex: string,
  ivHex: string,
  salt: string
): Promise<string> {
  // Check if this is a simple encryption
  if (encryptedBase64.startsWith("simple:")) {
    return simpleDecrypt(encryptedBase64, keyHex);
  }

  // Check if Web Crypto API is available
  if (
    typeof window === "undefined" ||
    !window.crypto ||
    !window.crypto.subtle
  ) {
    if (!isExpoGo) {
      console.warn("Web Crypto API not available for decryption");
    }
    // Try simple decryption as a fallback
    return simpleDecrypt(encryptedBase64, keyHex);
  }

  try {
    // Convert encrypted Base64 to ArrayBuffer
    const encryptedBytes = Uint8Array.from(
      decodeBase64(encryptedBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    // Convert hex to Uint8Array
    const keyData = hexToUint8Array(keyHex);
    const ivData = hexToUint8Array(ivHex);
    const saltData = hexToUint8Array(salt);

    // Derive the same key
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

    // Decrypt
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: ivData,
      },
      derivedKey,
      encryptedBytes
    );

    // Convert to string
    return new TextDecoder().decode(new Uint8Array(decryptedBuffer));
  } catch (error) {
    if (!isExpoGo) {
      console.warn("Web Crypto API decryption failed:", error);
    }
    // Try simple decryption as a fallback
    return simpleDecrypt(encryptedBase64, keyHex);
  }
}

/**
 * Helper to convert hex string to Uint8Array
 */
function hexToUint8Array(hexString: string): Uint8Array {
  return new Uint8Array(
    hexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
}

/**
 * Simple XOR-based encryption as a last resort
 * Note: This is not cryptographically secure, but better than plaintext
 */
function simpleEncrypt(text: string, key: string): Promise<string> {
  try {
    // Create a simple key from the hex key
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
    return Promise.resolve(`simple:${encodeBase64(result)}`);
  } catch (e) {
    console.error("Simple encryption failed:", e);
    return Promise.resolve(`plain:${text}`);
  }
}

/**
 * Simple XOR-based decryption as a last resort
 */
function simpleDecrypt(encryptedText: string, key: string): Promise<string> {
  try {
    // If it starts with our marker, remove it
    if (encryptedText.startsWith("simple:")) {
      encryptedText = encryptedText.substring(7);
    }

    // Decode from base64
    const decoded = decodeBase64(encryptedText);

    // Create a simple key from the hex key
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

    return Promise.resolve(result);
  } catch (e) {
    console.error("Simple decryption failed:", e);
    return Promise.resolve(encryptedText);
  }
}
