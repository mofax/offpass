import { decodeBase64, encodeBase64} from "@std/encoding";
/**
 * Crypto service for the Password Manager
 * Handles encryption and decryption of vault data using AES-256
 */

/**
 * Generates a key from the master password using PBKDF2
 * @param password The master password
 * @param salt The salt (should be stored with the vault)
 * @returns A CryptoKey for use with AES-256-GCM
 */
export async function generateKeyFromPassword(password: string, salt?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  // Generate salt if not provided
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }

  // Convert password to key material
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  // Derive a key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return { key, salt };
}

/**
 * Encrypts data using AES-256-GCM
 * @param key The encryption key
 * @param data The data to encrypt
 * @returns Encrypted data and the IV used
 */
export async function encrypt(key: CryptoKey, data: unknown): Promise<{ encryptedData: Uint8Array; iv: Uint8Array }> {
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Convert data to string and then to ArrayBuffer
  const encodedData = new TextEncoder().encode(JSON.stringify(data));

  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encodedData
  );

  return { encryptedData: new Uint8Array(encryptedData), iv };
}

/**
 * Decrypts data using AES-256-GCM
 * @param key The decryption key
 * @param encryptedData The encrypted data
 * @param iv The IV used for encryption
 * @returns Decrypted data
 */
export async function decrypt<T>(key: CryptoKey, encryptedData: Uint8Array, iv: Uint8Array): Promise<T> {
  // Decrypt the data
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encryptedData
  );

  // Convert ArrayBuffer back to string and parse JSON
  const decryptedText = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decryptedText) as T;
}

/**
 * Generates a random password
 * @param length Password length (default: 16)
 * @param options Options for password generation
 * @returns A randomly generated password
 */
export function generatePassword(
  length = 16,
  options = {
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  }
): string {
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const numberChars = "0123456789";
  const symbolChars = "!@#$%^&*()_-+=<>?";

  let chars = "";
  if (options.uppercase) chars += uppercaseChars;
  if (options.lowercase) chars += lowercaseChars;
  if (options.numbers) chars += numberChars;
  if (options.symbols) chars += symbolChars;

  if (chars.length === 0) {
    throw new Error("At least one character type must be selected");
  }

  let password = "";
  const randomArray = new Uint8Array(length);
  crypto.getRandomValues(randomArray);

  for (let i = 0; i < length; i++) {
    password += chars[randomArray[i] % chars.length];
  }

  return password;
}

/**
 * Checks the strength of a password
 * @param password The password to check
 * @returns A score from 0 (weak) to 4 (strong)
 */
export function checkPasswordStrength(password: string): number {
  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Complexity checks
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  // Cap at 4
  return Math.min(4, score);
}

/**
 * Converts ArrayBuffer to Base64 string (for storage)
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  return encodeBase64(buffer);
}

/**
 * Converts Base64 string to ArrayBuffer (for retrieval)
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  return decodeBase64(base64);
}
