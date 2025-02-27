/**
 * Storage service for the Password Manager
 * Uses IndexedDB for persistent storage of encrypted vaults
 */

import { type EncryptedVault, type AppSettings } from './types';

const DB_NAME = 'offpass-db';
const DB_VERSION = 1;

// Database structure
const STORES = {
	VAULTS: 'vaults',
	SETTINGS: 'settings',
};

/**
 * Initializes the IndexedDB database
 */
export async function initDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = (_) => {
			reject(new Error('Failed to open database'));
		};

		request.onsuccess = (event) => {
			resolve((event.target as IDBOpenDBRequest).result);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create object stores if they don't exist
			if (!db.objectStoreNames.contains(STORES.VAULTS)) {
				const vaultStore = db.createObjectStore(STORES.VAULTS, {
					keyPath: 'id',
				});
				vaultStore.createIndex('name', 'name', { unique: false });
				vaultStore.createIndex('lastModified', 'lastModified', {
					unique: false,
				});
			}

			if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
				db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
			}
		};
	});
}

/**
 * Saves an encrypted vault to IndexedDB
 */
export async function saveVault(vault: EncryptedVault): Promise<void> {
	const db = await initDatabase();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORES.VAULTS], 'readwrite');
		const store = transaction.objectStore(STORES.VAULTS);

		const request = store.put(vault);

		request.onerror = () => {
			reject(new Error('Failed to save vault'));
		};

		request.onsuccess = () => {
			resolve();
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

/**
 * Retrieves an encrypted vault from IndexedDB by ID
 */
export async function getVault(id: string): Promise<EncryptedVault | null> {
	const db = await initDatabase();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORES.VAULTS], 'readonly');
		const store = transaction.objectStore(STORES.VAULTS);

		const request = store.get(id);

		request.onerror = () => {
			reject(new Error('Failed to retrieve vault'));
		};

		request.onsuccess = () => {
			resolve(request.result || null);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

/**
 * Retrieves all vaults from IndexedDB
 */
export async function getAllVaults(): Promise<EncryptedVault[]> {
	const db = await initDatabase();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORES.VAULTS], 'readonly');
		const store = transaction.objectStore(STORES.VAULTS);

		const request = store.getAll();

		request.onerror = () => {
			reject(new Error('Failed to retrieve vaults'));
		};

		request.onsuccess = () => {
			resolve(request.result || []);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

/**
 * Deletes a vault from IndexedDB by ID
 */
export async function deleteVault(id: string): Promise<void> {
	const db = await initDatabase();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORES.VAULTS], 'readwrite');
		const store = transaction.objectStore(STORES.VAULTS);

		const request = store.delete(id);

		request.onerror = () => {
			reject(new Error('Failed to delete vault'));
		};

		request.onsuccess = () => {
			resolve();
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

/**
 * Saves app settings to IndexedDB
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
	const db = await initDatabase();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
		const store = transaction.objectStore(STORES.SETTINGS);

		const request = store.put({ id: 'app-settings', ...settings });

		request.onerror = () => {
			reject(new Error('Failed to save settings'));
		};

		request.onsuccess = () => {
			resolve();
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

/**
 * Retrieves app settings from IndexedDB
 */
export async function getSettings(): Promise<AppSettings | null> {
	const db = await initDatabase();
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORES.SETTINGS], 'readonly');
		const store = transaction.objectStore(STORES.SETTINGS);

		const request = store.get('app-settings');

		request.onerror = () => {
			reject(new Error('Failed to retrieve settings'));
		};

		request.onsuccess = () => {
			resolve(request.result || null);
		};

		transaction.oncomplete = () => {
			db.close();
		};
	});
}

/**
 * Exports all encrypted vault data for backup
 */
export async function exportData(): Promise<string> {
	const vaults = await getAllVaults();
	const settings = await getSettings();

	const exportData = {
		vaults,
		settings,
		exportDate: new Date().toISOString(),
		version: DB_VERSION,
	};

	return JSON.stringify(exportData);
}

/**
 * Imports data from a backup file
 */
export async function importData(jsonData: string): Promise<void> {
	try {
		const data = JSON.parse(jsonData);

		// Validate the data format
		if (!data.vaults || !Array.isArray(data.vaults)) {
			throw new Error('Invalid backup format');
		}

		// Import vaults
		for (const vault of data.vaults) {
			await saveVault(vault);
		}

		// Import settings if present
		if (data.settings) {
			await saveSettings(data.settings);
		}

		return Promise.resolve();
	} catch (error) {
		return Promise.reject(error);
	}
}
