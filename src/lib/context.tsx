/**
 * React context for the Password Manager
 */

import {
	createContext,
	useContext,
	useState,
	useEffect,
	type ReactNode,
} from 'react';
import type { Vault, VaultData, Credential, AppSettings } from './types';
import {
	getVaults,
	openVault,
	createVault,
	updateVault,
	removeVault,
	addCredential as addCredentialToVault,
	updateCredential as updateCredentialInVault,
	deleteCredential as deleteCredentialFromVault,
	updateVaultSettings as updateSettingsInVault,
} from './vault';
import { getSettings, saveSettings } from './storage';

interface PasswordManagerState {
	// Vault management
	vaults: Vault[];
	currentVault: Vault | null;
	vaultData: VaultData | null;
	masterPassword: string | null;
	isLocked: boolean;

	// Settings
	settings: AppSettings;

	// Actions
	loadVaults: () => Promise<void>;
	createNewVault: (name: string, password: string) => Promise<string>;
	openExistingVault: (id: string, password: string) => Promise<void>;
	lockVault: () => void;
	deleteVault: (id: string) => Promise<void>;
	renameVault: (id: string, newName: string) => Promise<void>;
	changeMasterPassword: (
		currentPassword: string,
		newPassword: string
	) => Promise<void>;

	// Credential management
	addCredential: (
		credential: Omit<Credential, 'id' | 'createdAt' | 'lastModified'>
	) => Promise<Credential>;
	updateCredential: (
		id: string,
		updates: Partial<Omit<Credential, 'id' | 'createdAt'>>
	) => Promise<Credential>;
	deleteCredential: (id: string) => Promise<void>;

	// Settings management
	updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
	updateVaultSettings: (
		settings: Partial<VaultData['settings']>
	) => Promise<void>;

	// Loading states
	isLoading: boolean;
	error: string | null;
}

const defaultSettings: AppSettings = {
	darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
	autoLockTimeout: 15, // 15 minutes
};

const PasswordManagerContext = createContext<PasswordManagerState | undefined>(
	undefined
);

export function PasswordManagerProvider({ children }: { children: ReactNode }) {
	// State
	const [vaults, setVaults] = useState<Vault[]>([]);
	const [currentVault, setCurrentVault] = useState<Vault | null>(null);
	const [vaultData, setVaultData] = useState<VaultData | null>(null);
	const [masterPassword, setMasterPassword] = useState<string | null>(null);
	const [isLocked, setIsLocked] = useState(true);
	const [settings, setSettings] = useState<AppSettings>(defaultSettings);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [autoLockTimer, setAutoLockTimer] = useState<number | null>(null);

	// Load vaults on mount
	useEffect(() => {
		loadVaults();
		loadSettings();
	}, []);

	// Set up auto-lock timer when vault is opened
	useEffect(() => {
		if (currentVault && !isLocked && settings.autoLockTimeout > 0) {
			// Clear any existing timer
			if (autoLockTimer !== null) {
				window.clearTimeout(autoLockTimer);
			}

			// Set new timer
			const timeoutId = window.setTimeout(
				() => {
					lockVault();
				},
				settings.autoLockTimeout * 60 * 1000
			);

			setAutoLockTimer(timeoutId);

			// Clean up on unmount
			return () => {
				window.clearTimeout(timeoutId);
			};
		}
	}, [currentVault, isLocked, settings.autoLockTimeout]);

	// Apply dark mode setting
	useEffect(() => {
		if (settings.darkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, [settings.darkMode]);

	// Load settings from storage
	async function loadSettings() {
		try {
			const savedSettings = await getSettings();
			if (savedSettings) {
				setSettings(savedSettings);
			}
		} catch (err) {
			console.error('Failed to load settings', err);
		}
	}

	// Load all available vaults
	async function loadVaults() {
		setIsLoading(true);
		setError(null);

		try {
			const allVaults = await getVaults();
			setVaults(allVaults);
		} catch (err) {
			setError('Failed to load vaults');
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	}

	// Create a new vault
	async function createNewVault(name: string, password: string) {
		setIsLoading(true);
		setError(null);

		try {
			const vaultId = await createVault(name, password);
			await loadVaults();
			return vaultId;
		} catch (err) {
			setError('Failed to create vault');
			console.error(err);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}

	// Open an existing vault
	async function openExistingVault(id: string, password: string) {
		setIsLoading(true);
		setError(null);

		try {
			const { vault, data } = await openVault(id, password);

			setCurrentVault(vault);
			setVaultData(data);
			setMasterPassword(password);
			setIsLocked(false);
		} catch (err) {
			setError('Failed to open vault. Incorrect password?');
			console.error(err);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}

	// Lock the current vault
	function lockVault() {
		setVaultData(null);
		setMasterPassword(null);
		setIsLocked(true);

		// Clear auto-lock timer
		if (autoLockTimer !== null) {
			window.clearTimeout(autoLockTimer);
			setAutoLockTimer(null);
		}
	}

	// Delete a vault
	async function deleteVault(id: string) {
		setIsLoading(true);
		setError(null);

		try {
			await removeVault(id);

			// If deleting the current vault, reset the state
			if (currentVault && currentVault.id === id) {
				setCurrentVault(null);
				setVaultData(null);
				setMasterPassword(null);
				setIsLocked(true);
			}

			await loadVaults();
		} catch (err) {
			setError('Failed to delete vault');
			console.error(err);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}

	// Rename a vault
	async function renameVault(id: string, newName: string) {
		setIsLoading(true);
		setError(null);

		try {
			if (
				!masterPassword ||
				!vaultData ||
				!currentVault ||
				currentVault.id !== id
			) {
				throw new Error('Vault not open or mismatch');
			}

			const updatedVault = await updateVault(
				id,
				masterPassword,
				vaultData,
				newName
			);

			setCurrentVault(updatedVault);
			await loadVaults();
		} catch (err) {
			setError('Failed to rename vault');
			console.error(err);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}

	// Change the master password
	async function changeMasterPassword(
		currentPassword: string,
		newPassword: string
	) {
		setIsLoading(true);
		setError(null);

		try {
			if (!currentVault) {
				throw new Error('No vault is open');
			}

			await updateVault(
				currentVault.id,
				currentPassword,
				vaultData!,
				undefined
			);
			setMasterPassword(newPassword);
		} catch (err) {
			setError('Failed to change master password');
			console.error(err);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}

	// Add a credential to the current vault
	async function addCredential(
		credential: Omit<Credential, 'id' | 'createdAt' | 'lastModified'>
	) {
		setIsLoading(true);
		setError(null);

		try {
			if (!currentVault || !masterPassword || !vaultData) {
				throw new Error('No vault is open');
			}

			const newCredential = await addCredentialToVault(
				currentVault.id,
				masterPassword,
				credential
			);

			// Update local state
			setVaultData({
				...vaultData,
				credentials: [...vaultData.credentials, newCredential],
			});

			return newCredential;
		} catch (err) {
			setError('Failed to add credential');
			console.error(err);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}

	// Update a credential in the current vault
	async function updateCredential(
		id: string,
		updates: Partial<Omit<Credential, 'id' | 'createdAt'>>
	) {
		setIsLoading(true);
		setError(null);

		try {
			if (!currentVault || !masterPassword || !vaultData) {
				throw new Error('No vault is open');
			}

			const updatedCredential = await updateCredentialInVault(
				currentVault.id,
				masterPassword,
				id,
				updates
			);

			// Update local state
			setVaultData({
				...vaultData,
				credentials: vaultData.credentials.map((c) =>
					c.id === id ? updatedCredential : c
				),
			});

			return updatedCredential;
		} catch (err) {
			setError('Failed to update credential');
			console.error(err);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}

	// Delete a credential from the current vault
	async function deleteCredential(id: string) {
		setIsLoading(true);
		setError(null);

		try {
			if (!currentVault || !masterPassword || !vaultData) {
				throw new Error('No vault is open');
			}

			await deleteCredentialFromVault(
				currentVault.id,
				masterPassword,
				id
			);

			// Update local state
			setVaultData({
				...vaultData,
				credentials: vaultData.credentials.filter((c) => c.id !== id),
			});
		} catch (err) {
			setError('Failed to delete credential');
			console.error(err);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}

	// Update app settings
	async function updateSettings(newSettings: Partial<AppSettings>) {
		try {
			const updatedSettings = {
				...settings,
				...newSettings,
			};

			await saveSettings(updatedSettings);
			setSettings(updatedSettings);
		} catch (err) {
			setError('Failed to update settings');
			console.error(err);
			throw err;
		}
	}

	// Update vault settings
	async function updateVaultSettings(
		newSettings: Partial<VaultData['settings']>
	) {
		setIsLoading(true);
		setError(null);

		try {
			if (!currentVault || !masterPassword || !vaultData) {
				throw new Error('No vault is open');
			}

			const updatedSettings = {
				...vaultData.settings,
				...newSettings,
			};

			await updateSettingsInVault(
				currentVault.id,
				masterPassword,
				updatedSettings
			);

			// Update local state
			setVaultData({
				...vaultData,
				settings: updatedSettings,
			});
		} catch (err) {
			setError('Failed to update vault settings');
			console.error(err);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}

	const value: PasswordManagerState = {
		vaults,
		currentVault,
		vaultData,
		masterPassword,
		isLocked,
		settings,
		isLoading,
		error,
		loadVaults,
		createNewVault,
		openExistingVault,
		lockVault,
		deleteVault,
		renameVault,
		changeMasterPassword,
		addCredential,
		updateCredential,
		deleteCredential,
		updateSettings,
		updateVaultSettings,
	};

	return (
		<PasswordManagerContext.Provider value={value}>
			{children}
		</PasswordManagerContext.Provider>
	);
}

export function usePasswordManager() {
	const context = useContext(PasswordManagerContext);
	if (context === undefined) {
		throw new Error(
			'usePasswordManager must be used within a PasswordManagerProvider'
		);
	}
	return context;
}
