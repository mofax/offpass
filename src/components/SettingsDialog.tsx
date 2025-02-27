import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePasswordManager } from '@/lib/context';
import { exportData, importData } from '@/lib/storage';
import {
	Moon,
	Sun,
	Download,
	Upload,
	Key,
	Clock,
	Trash2,
	Tags,
} from 'lucide-react';

interface SettingsDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function SettingsDialog({
	isOpen,
	onClose,
}: SettingsDialogProps) {
	const {
		settings,
		updateSettings,
		vaultData,
		updateVaultSettings,
		masterPassword,
		currentVault,
		changeMasterPassword,
		deleteVault,
	} = usePasswordManager();

	const [newMasterPassword, setNewMasterPassword] = useState('');
	const [confirmNewMasterPassword, setConfirmNewMasterPassword] =
		useState('');
	const [currentPassword, setCurrentPassword] = useState('');
	const [passwordChangeError, setPasswordChangeError] = useState('');
	const [newCategories, setNewCategories] = useState(
		vaultData?.settings?.categories?.join(', ') || ''
	);

	const handleExport = async () => {
		try {
			const exportedData = await exportData();

			// Create a blob from the data
			const blob = new Blob([exportedData], { type: 'application/json' });
			const url = URL.createObjectURL(blob);

			// Create a link and trigger download
			const a = document.createElement('a');
			a.href = url;
			a.download = `offpass-backup-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();

			// Clean up
			URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error('Export failed:', error);
		}
	};

	const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			const reader = new FileReader();

			reader.onload = async (e) => {
				const content = e.target?.result as string;
				if (content) {
					await importData(content);
					// Reload the page to reflect changes
					window.location.reload();
				}
			};

			reader.readAsText(file);
		} catch (error) {
			console.error('Import failed:', error);
		}
	};

	const handleChangeMasterPassword = async () => {
		setPasswordChangeError('');

		if (!currentVault || !masterPassword) {
			setPasswordChangeError('No vault is currently open');
			return;
		}

		if (newMasterPassword !== confirmNewMasterPassword) {
			setPasswordChangeError('New passwords do not match');
			return;
		}

		if (newMasterPassword.length < 8) {
			setPasswordChangeError(
				'New password must be at least 8 characters'
			);
			return;
		}

		try {
			await changeMasterPassword(currentPassword, newMasterPassword);
			setCurrentPassword('');
			setNewMasterPassword('');
			setConfirmNewMasterPassword('');
			alert('Master password changed successfully');
		} catch (error) {
			setPasswordChangeError(
				'Failed to change password. Current password may be incorrect.'
			);
		}
	};

	const handleUpdateCategories = async () => {
		if (!vaultData || !masterPassword || !currentVault) return;

		try {
			const categories = newCategories
				.split(',')
				.map((cat) => cat.trim())
				.filter(Boolean);

			await updateVaultSettings({ categories });
			alert('Categories updated successfully');
		} catch (error) {
			console.error('Failed to update categories:', error);
		}
	};

	const handleUpdateAutoLockTimeout = async (minutes: number) => {
		try {
			await updateSettings({ autoLockTimeout: minutes });
		} catch (error) {
			console.error('Failed to update auto-lock timeout:', error);
		}
	};

	const handleDeleteVault = async () => {
		if (!currentVault) return;

		const confirmDelete = window.confirm(
			'Are you sure you want to delete this vault? This action cannot be undone.'
		);

		if (!confirmDelete) return;

		const vaultName = prompt(
			'To confirm deletion, please type the vault name:'
		);

		if (vaultName !== currentVault.name) {
			alert('Vault name does not match. Deletion canceled.');
			return;
		}

		try {
			await deleteVault(currentVault.id);
			onClose();
			window.location.reload();
		} catch (error) {
			console.error('Failed to delete vault:', error);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>

				<Tabs defaultValue="appearance" className="mt-4">
					<TabsList className="grid grid-cols-4">
						<TabsTrigger value="appearance">Appearance</TabsTrigger>
						<TabsTrigger value="security">Security</TabsTrigger>
						<TabsTrigger value="vault">Vault</TabsTrigger>
						<TabsTrigger value="backup">Backup</TabsTrigger>
					</TabsList>

					<TabsContent value="appearance" className="space-y-4 py-4">
						<div>
							<h3 className="text-lg font-medium mb-2">Theme</h3>
							<div className="flex items-center space-x-2">
								<Button
									variant={
										settings.darkMode
											? 'outline'
											: 'default'
									}
									className="flex-1"
									onClick={() =>
										updateSettings({ darkMode: false })
									}
								>
									<Sun className="mr-2 h-4 w-4" />
									Light
								</Button>
								<Button
									variant={
										settings.darkMode
											? 'default'
											: 'outline'
									}
									className="flex-1"
									onClick={() =>
										updateSettings({ darkMode: true })
									}
								>
									<Moon className="mr-2 h-4 w-4" />
									Dark
								</Button>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="security" className="space-y-4 py-4">
						<div>
							<h3 className="text-lg font-medium mb-2">
								Auto-Lock Timeout
							</h3>
							<p className="text-sm text-muted-foreground mb-2">
								Set how long until the vault automatically locks
								after inactivity
							</p>
							<div className="flex items-center space-x-2">
								<Button
									variant={
										settings.autoLockTimeout === 5
											? 'default'
											: 'outline'
									}
									onClick={() =>
										handleUpdateAutoLockTimeout(5)
									}
								>
									5 min
								</Button>
								<Button
									variant={
										settings.autoLockTimeout === 15
											? 'default'
											: 'outline'
									}
									onClick={() =>
										handleUpdateAutoLockTimeout(15)
									}
								>
									15 min
								</Button>
								<Button
									variant={
										settings.autoLockTimeout === 30
											? 'default'
											: 'outline'
									}
									onClick={() =>
										handleUpdateAutoLockTimeout(30)
									}
								>
									30 min
								</Button>
								<Button
									variant={
										settings.autoLockTimeout === 60
											? 'default'
											: 'outline'
									}
									onClick={() =>
										handleUpdateAutoLockTimeout(60)
									}
								>
									1 hour
								</Button>
							</div>
						</div>

						<div className="pt-4 border-t">
							<h3 className="text-lg font-medium mb-2">
								<Key className="inline-block mr-2 h-4 w-4" />
								Change Master Password
							</h3>
							<div className="space-y-2">
								<div>
									<Label htmlFor="current-password">
										Current Password
									</Label>
									<Input
										id="current-password"
										type="password"
										value={currentPassword}
										onChange={(e) =>
											setCurrentPassword(e.target.value)
										}
									/>
								</div>
								<div>
									<Label htmlFor="new-password">
										New Password
									</Label>
									<Input
										id="new-password"
										type="password"
										value={newMasterPassword}
										onChange={(e) =>
											setNewMasterPassword(e.target.value)
										}
									/>
								</div>
								<div>
									<Label htmlFor="confirm-password">
										Confirm New Password
									</Label>
									<Input
										id="confirm-password"
										type="password"
										value={confirmNewMasterPassword}
										onChange={(e) =>
											setConfirmNewMasterPassword(
												e.target.value
											)
										}
									/>
								</div>

								{passwordChangeError && (
									<div className="text-destructive text-sm">
										{passwordChangeError}
									</div>
								)}

								<Button onClick={handleChangeMasterPassword}>
									Change Password
								</Button>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="vault" className="space-y-4 py-4">
						<div>
							<h3 className="text-lg font-medium mb-2">
								<Tags className="inline-block mr-2 h-4 w-4" />
								Categories
							</h3>
							<p className="text-sm text-muted-foreground mb-2">
								Manage categories for organizing your passwords
							</p>
							<div className="space-y-2">
								<Input
									placeholder="Categories (comma separated)"
									value={newCategories}
									onChange={(e) =>
										setNewCategories(e.target.value)
									}
								/>
								<Button onClick={handleUpdateCategories}>
									Update Categories
								</Button>
							</div>
						</div>

						<div className="pt-4 border-t">
							<h3 className="text-lg font-medium mb-2 text-destructive">
								<Trash2 className="inline-block mr-2 h-4 w-4" />
								Delete Vault
							</h3>
							<p className="text-sm text-muted-foreground mb-2">
								This action is permanent and cannot be undone
							</p>
							<Button
								variant="destructive"
								onClick={handleDeleteVault}
							>
								Delete Current Vault
							</Button>
						</div>
					</TabsContent>

					<TabsContent value="backup" className="space-y-4 py-4">
						<div>
							<h3 className="text-lg font-medium mb-2">
								<Download className="inline-block mr-2 h-4 w-4" />
								Export Data
							</h3>
							<p className="text-sm text-muted-foreground mb-2">
								Export your encrypted vault for backup purposes
							</p>
							<Button onClick={handleExport}>
								Export Vaults
							</Button>
						</div>

						<div className="pt-4 border-t">
							<h3 className="text-lg font-medium mb-2">
								<Upload className="inline-block mr-2 h-4 w-4" />
								Import Data
							</h3>
							<p className="text-sm text-muted-foreground mb-2">
								Import previously exported vault data
							</p>
							<div className="flex items-center gap-2">
								<Button asChild>
									<label htmlFor="import-file">
										Choose File
										<input
											id="import-file"
											type="file"
											accept=".json"
											className="hidden"
											onChange={handleImport}
										/>
									</label>
								</Button>
							</div>
						</div>
					</TabsContent>
				</Tabs>

				<DialogFooter>
					<Button onClick={onClose}>Close</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
