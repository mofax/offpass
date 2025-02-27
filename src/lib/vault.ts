/**
 * Vault service for the Password Manager
 * Manages encryption, decryption, and operations on vaults
 */

import { 
  generateKeyFromPassword, 
  encrypt, 
  decrypt, 
  arrayBufferToBase64, 
  base64ToArrayBuffer 
} from "./crypto";
import { 
  saveVault, 
  getVault, 
  getAllVaults, 
  deleteVault 
} from "./storage";
import type { 
  EncryptedVault, 
  Vault, 
  VaultData, 
  Credential 
} from "./types";

/**
 * Creates a new vault with the given name and master password
 */
export async function createVault(name: string, masterPassword: string): Promise<string> {
  // Generate a unique ID for the vault
  const id = crypto.randomUUID();
  
  // Create empty vault data
  const vaultData: VaultData = {
    credentials: [],
    settings: {
      autoLockTimeout: 15, // Default: 15 minutes
      categories: ["Login", "Financial", "Personal", "Work"],
      defaultCategory: "Login",
    },
  };
  
  // Derive encryption key from master password
  const { key, salt } = await generateKeyFromPassword(masterPassword);
  
  // Encrypt the vault data
  const { encryptedData, iv } = await encrypt(key, vaultData);
  
  // Create the encrypted vault object
  const now = Date.now();
  const encryptedVault: EncryptedVault = {
    id,
    name,
    encryptedData: arrayBufferToBase64(encryptedData),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    createdAt: now,
    lastAccessed: now,
    lastModified: now,
  };
  
  // Save the encrypted vault to storage
  await saveVault(encryptedVault);
  
  return id;
}

/**
 * Opens a vault using the master password
 */
export async function openVault(id: string, masterPassword: string): Promise<{ vault: Vault; data: VaultData }> {
  // Get the encrypted vault from storage
  const encryptedVault = await getVault(id);
  if (!encryptedVault) {
    throw new Error("Vault not found");
  }
  
  try {
    // Convert base64 strings back to ArrayBuffer/Uint8Array
    const encryptedData = base64ToArrayBuffer(encryptedVault.encryptedData);
    const iv = new Uint8Array(base64ToArrayBuffer(encryptedVault.iv));
    const salt = new Uint8Array(base64ToArrayBuffer(encryptedVault.salt));
    
    // Derive the key from the master password and salt
    const { key } = await generateKeyFromPassword(masterPassword, salt);
    
    // Decrypt the vault data
    const vaultData = await decrypt<VaultData>(key, encryptedData, iv);
    
    // Create vault metadata object
    const vault: Vault = {
      id: encryptedVault.id,
      name: encryptedVault.name,
      createdAt: encryptedVault.createdAt,
      lastAccessed: Date.now(), // Update last accessed time
      lastModified: encryptedVault.lastModified,
    };
    
    // Update the last accessed time in storage
    await saveVault({
      ...encryptedVault,
      lastAccessed: vault.lastAccessed,
    });
    
    return { vault, data: vaultData };
  } catch (error) {
    throw new Error("Incorrect master password or corrupted data");
  }
}

/**
 * Updates a vault with new data
 */
export async function updateVault(
  id: string, 
  masterPassword: string, 
  data: VaultData,
  newName?: string
): Promise<Vault> {
  // Get the encrypted vault from storage
  const encryptedVault = await getVault(id);
  if (!encryptedVault) {
    throw new Error("Vault not found");
  }
  
  try {
    // Convert base64 strings back to ArrayBuffer/Uint8Array
    const salt = new Uint8Array(base64ToArrayBuffer(encryptedVault.salt));
    
    // Derive the key from the master password and salt
    const { key } = await generateKeyFromPassword(masterPassword, salt);
    
    // Encrypt the updated vault data
    const { encryptedData, iv } = await encrypt(key, data);
    
    // Update the encrypted vault
    const now = Date.now();
    const updatedVault: EncryptedVault = {
      ...encryptedVault,
      name: newName || encryptedVault.name,
      encryptedData: arrayBufferToBase64(encryptedData),
      iv: arrayBufferToBase64(iv),
      lastModified: now,
      lastAccessed: now,
    };
    
    // Save the updated vault to storage
    await saveVault(updatedVault);
    
    // Return the updated vault metadata
    return {
      id: updatedVault.id,
      name: updatedVault.name,
      createdAt: updatedVault.createdAt,
      lastAccessed: updatedVault.lastAccessed,
      lastModified: updatedVault.lastModified,
    };
  } catch (error) {
    throw new Error("Failed to update vault");
  }
}

/**
 * Gets all available vaults (metadata only, not decrypted content)
 */
export async function getVaults(): Promise<Vault[]> {
  const encryptedVaults = await getAllVaults();
  return encryptedVaults.map((ev) => ({
    id: ev.id,
    name: ev.name,
    createdAt: ev.createdAt,
    lastAccessed: ev.lastAccessed,
    lastModified: ev.lastModified,
  }));
}

/**
 * Deletes a vault
 */
export async function removeVault(id: string): Promise<void> {
  await deleteVault(id);
}

/**
 * Changes the master password for a vault
 */
export async function changeMasterPassword(
  id: string, 
  currentPassword: string, 
  newPassword: string
): Promise<void> {
  // Open the vault with the current password
  const { data } = await openVault(id, currentPassword);
  
  // Generate a new key with the new password
  const { key, salt } = await generateKeyFromPassword(newPassword);
  
  // Encrypt the vault data with the new key
  const { encryptedData, iv } = await encrypt(key, data);
  
  // Get the existing vault to preserve metadata
  const existingVault = await getVault(id);
  if (!existingVault) {
    throw new Error("Vault not found");
  }
  
  // Update the encrypted vault with the new encryption
  const now = Date.now();
  const updatedVault: EncryptedVault = {
    ...existingVault,
    encryptedData: arrayBufferToBase64(encryptedData),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    lastModified: now,
    lastAccessed: now,
  };
  
  // Save the updated vault
  await saveVault(updatedVault);
}

/**
 * Adds a credential to a vault
 */
export async function addCredential(
  vaultId: string, 
  masterPassword: string, 
  credential: Omit<Credential, "id" | "createdAt" | "lastModified">
): Promise<Credential> {
  // Open the vault
  const { data } = await openVault(vaultId, masterPassword);
  
  // Create a new credential with ID and timestamps
  const now = Date.now();
  const newCredential: Credential = {
    ...credential,
    id: crypto.randomUUID(),
    createdAt: now,
    lastModified: now,
  };
  
  // Add the credential to the vault
  data.credentials.push(newCredential);
  
  // Update the vault
  await updateVault(vaultId, masterPassword, data);
  
  return newCredential;
}

/**
 * Updates an existing credential in a vault
 */
export async function updateCredential(
  vaultId: string, 
  masterPassword: string, 
  credentialId: string, 
  updates: Partial<Omit<Credential, "id" | "createdAt">>
): Promise<Credential> {
  // Open the vault
  const { data } = await openVault(vaultId, masterPassword);
  
  // Find the credential to update
  const index = data.credentials.findIndex(c => c.id === credentialId);
  if (index === -1) {
    throw new Error("Credential not found");
  }
  
  // Update the credential
  const updatedCredential: Credential = {
    ...data.credentials[index],
    ...updates,
    lastModified: Date.now(),
  };
  
  // Replace the credential in the vault
  data.credentials[index] = updatedCredential;
  
  // Update the vault
  await updateVault(vaultId, masterPassword, data);
  
  return updatedCredential;
}

/**
 * Removes a credential from a vault
 */
export async function deleteCredential(
  vaultId: string, 
  masterPassword: string, 
  credentialId: string
): Promise<void> {
  // Open the vault
  const { data } = await openVault(vaultId, masterPassword);
  
  // Filter out the credential to delete
  data.credentials = data.credentials.filter(c => c.id !== credentialId);
  
  // Update the vault
  await updateVault(vaultId, masterPassword, data);
}

/**
 * Updates vault settings
 */
export async function updateVaultSettings(
  vaultId: string, 
  masterPassword: string, 
  settings: VaultData["settings"]
): Promise<void> {
  // Open the vault
  const { data } = await openVault(vaultId, masterPassword);
  
  // Update settings
  data.settings = {
    ...data.settings,
    ...settings,
  };
  
  // Update the vault
  await updateVault(vaultId, masterPassword, data);
}
