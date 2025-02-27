import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type Credential } from '@/lib/types';
import { Eye, EyeOff, Copy, Edit, Trash } from 'lucide-react';
import { usePasswordManager } from '@/lib/context';

interface CredentialListProps {
	searchTerm: string;
	selectedCategory: string | null;
	onEditCredential: (credential: Credential) => void;
}

export default function CredentialList({
	searchTerm,
	selectedCategory,
	onEditCredential,
}: CredentialListProps) {
	const { vaultData, deleteCredential } = usePasswordManager();
	const [visiblePasswords, setVisiblePasswords] = useState<
		Record<string, boolean>
	>({});

	if (!vaultData) {
		return <div className="p-4">No vault data available.</div>;
	}

	// Filter credentials based on search term and selected category
	const filteredCredentials = vaultData.credentials.filter((credential) => {
		const matchesSearch =
			searchTerm === '' ||
			credential.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			credential.username
				.toLowerCase()
				.includes(searchTerm.toLowerCase()) ||
			(credential.url &&
				credential.url
					.toLowerCase()
					.includes(searchTerm.toLowerCase()));

		const matchesCategory =
			selectedCategory === null ||
			credential.category === selectedCategory;

		return matchesSearch && matchesCategory;
	});

	// Toggle password visibility
	const togglePasswordVisibility = (id: string) => {
		setVisiblePasswords((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
	};

	// Copy to clipboard
	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
	};

	// Format date for display
	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString();
	};

	// Confirm and delete credential
	const handleDelete = async (id: string, title: string) => {
		if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
			try {
				await deleteCredential(id);
			} catch (error) {
				console.error('Error deleting credential:', error);
			}
		}
	};

	return (
		<div className="p-4 flex-1 overflow-auto">
			<h2 className="text-2xl font-bold mb-4">
				{selectedCategory === null ? 'All Items' : selectedCategory}
				<span className="text-muted-foreground ml-2 text-sm">
					({filteredCredentials.length})
				</span>
			</h2>

			{filteredCredentials.length === 0 ? (
				<div className="text-muted-foreground text-center p-8">
					{searchTerm
						? 'No matching credentials found.'
						: 'No credentials in this category.'}
				</div>
			) : (
				<div className="space-y-4">
					{filteredCredentials.map((credential) => (
						<Card key={credential.id} className="overflow-hidden">
							<CardContent className="p-0">
								<div className="p-4">
									<div className="flex justify-between items-start mb-2">
										<h3 className="font-medium">
											{credential.title}
										</h3>
										<div className="flex space-x-2">
											<Button
												variant="ghost"
												size="icon"
												onClick={() =>
													onEditCredential(credential)
												}
												title="Edit"
											>
												<Edit className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() =>
													handleDelete(
														credential.id,
														credential.title
													)
												}
												title="Delete"
											>
												<Trash className="h-4 w-4" />
											</Button>
										</div>
									</div>

									{credential.category && (
										<div className="text-sm text-muted-foreground mb-2">
											Category: {credential.category}
										</div>
									)}

									{credential.url && (
										<div className="mb-2">
											<a
												href={
													credential.url.startsWith(
														'http'
													)
														? credential.url
														: `https://${credential.url}`
												}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary underline text-sm"
											>
												{credential.url}
											</a>
										</div>
									)}

									<div className="grid grid-cols-[auto,1fr,auto] gap-2 items-center mb-2">
										<span className="text-sm font-medium">
											Username:
										</span>
										<span className="text-sm truncate">
											{credential.username}
										</span>
										<Button
											variant="ghost"
											size="icon"
											onClick={() =>
												copyToClipboard(
													credential.username
												)
											}
											title="Copy Username"
										>
											<Copy className="h-4 w-4" />
										</Button>
									</div>

									<div className="grid grid-cols-[auto,1fr,auto,auto] gap-2 items-center">
										<span className="text-sm font-medium">
											Password:
										</span>
										<span className="text-sm font-mono truncate">
											{visiblePasswords[credential.id]
												? credential.password
												: '••••••••••••'}
										</span>
										<Button
											variant="ghost"
											size="icon"
											onClick={() =>
												togglePasswordVisibility(
													credential.id
												)
											}
											title={
												visiblePasswords[credential.id]
													? 'Hide Password'
													: 'Show Password'
											}
										>
											{visiblePasswords[credential.id] ? (
												<EyeOff className="h-4 w-4" />
											) : (
												<Eye className="h-4 w-4" />
											)}
										</Button>
										<Button
											variant="ghost"
											size="icon"
											onClick={() =>
												copyToClipboard(
													credential.password
												)
											}
											title="Copy Password"
										>
											<Copy className="h-4 w-4" />
										</Button>
									</div>

									{credential.notes && (
										<div className="mt-2 p-2 bg-muted/30 rounded text-sm">
											{credential.notes}
										</div>
									)}

									<div className="mt-2 text-xs text-muted-foreground">
										Last modified:{' '}
										{formatDate(credential.lastModified)}
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
