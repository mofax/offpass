import { useState } from 'react';
import { usePasswordManager } from '@/lib/context';
import VaultSelect from './VaultSelect';
import Sidebar from './Sidebar';
import CredentialList from './CredentialList';
import CredentialForm from './CredentialForm';
import SettingsDialog from './SettingsDialog';
import { type Credential } from '@/lib/types';

export default function PasswordManager() {
	const { isLocked, vaultData } = usePasswordManager();
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedCategory, setSelectedCategory] = useState<string | null>(
		null
	);
	const [showCredentialForm, setShowCredentialForm] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [editingCredential, setEditingCredential] =
		useState<Credential | null>(null);

	// Handler for adding a new credential
	const handleAddCredential = () => {
		setEditingCredential(null);
		setShowCredentialForm(true);
	};

	// Handler for editing an existing credential
	const handleEditCredential = (credential: Credential) => {
		setEditingCredential(credential);
		setShowCredentialForm(true);
	};

	// If no vault is unlocked, show the vault selection screen
	if (isLocked || !vaultData) {
		return (
			<div className="h-screen flex items-center justify-center bg-background">
				<VaultSelect />
			</div>
		);
	}

	// Vault is unlocked, show the main interface
	return (
		<div className="h-screen flex bg-background">
			{/* Sidebar with categories and search */}
			<Sidebar
				onAddCredential={handleAddCredential}
				onOpenSettings={() => setShowSettings(true)}
				selectedCategory={selectedCategory}
				onSelectCategory={setSelectedCategory}
			/>

			{/* Main content area with credential list */}
			<main className="flex-1 overflow-auto">
				<CredentialList
					searchTerm={searchTerm}
					selectedCategory={selectedCategory}
					onEditCredential={handleEditCredential}
				/>
			</main>

			{/* Credential form dialog */}
			<CredentialForm
				isOpen={showCredentialForm}
				onClose={() => setShowCredentialForm(false)}
				editingCredential={editingCredential}
			/>

			{/* Settings dialog */}
			<SettingsDialog
				isOpen={showSettings}
				onClose={() => setShowSettings(false)}
			/>
		</div>
	);
}
