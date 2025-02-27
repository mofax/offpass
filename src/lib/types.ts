/**
 * Types for the Password Manager
 */

export interface Credential {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: string;
  tags?: string[];
  lastModified: number;
  createdAt: number;
}

export interface Vault {
  id: string;
  name: string;
  createdAt: number;
  lastAccessed: number;
  lastModified: number;
}

export interface EncryptedVault {
  id: string;
  name: string;
  encryptedData: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt used for key derivation
  createdAt: number;
  lastAccessed: number;
  lastModified: number;
}

export interface VaultData {
  credentials: Credential[];
  settings?: {
    autoLockTimeout?: number; // Time in minutes before auto-lock
    categories?: string[];
    defaultCategory?: string;
  };
}

export interface MasterPasswordStatus {
  isSet: boolean;
  lastChanged?: number;
}

export interface AppSettings {
  darkMode: boolean;
  autoLockTimeout: number; // Time in minutes before auto-lock
  defaultVaultId?: string;
}

export type PasswordGenerationOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

export enum SyncStatus {
  SYNCED = 'synced',
  SYNCING = 'syncing',
  ERROR = 'error',
  NOT_SYNCED = 'not-synced',
}
