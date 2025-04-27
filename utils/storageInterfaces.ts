/**
 * This file contains shared interfaces to break circular dependencies
 * between secureStorage.tsx and firestoreSync.ts
 */

// Interface for the storage operations
export interface StorageInterface {
  getItem: <T>(key: string) => Promise<T | null>;
  setItem: (key: string, data: any) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// Interface for sync operations
export interface SyncInterface {
  syncItem: (key: string, data: any) => Promise<void>;
}