import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { type Credential } from '@/lib/types';
import { usePasswordManager } from '@/lib/context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generatePassword, checkPasswordStrength } from '@/lib/crypto';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';

interface CredentialFormProps {
	isOpen: boolean;
	onClose: () => void;
	editingCredential: Credential | null;
}

// Form validation schema
const formSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required'),
	url: z.string().optional(),
	notes: z.string().optional(),
	category: z.string().optional(),
	tags: z.string().optional(),
});

export default function CredentialForm({
	isOpen,
	onClose,
	editingCredential,
}: CredentialFormProps) {
	const { vaultData, addCredential, updateCredential } = usePasswordManager();
	const [showPassword, setShowPassword] = useState(false);
	const [passwordStrength, setPasswordStrength] = useState(0);

	const isEditing = Boolean(editingCredential);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: editingCredential?.title || '',
			username: editingCredential?.username || '',
			password: editingCredential?.password || '',
			url: editingCredential?.url || '',
			notes: editingCredential?.notes || '',
			category:
				editingCredential?.category ||
				vaultData?.settings?.defaultCategory ||
				'Login',
			tags: editingCredential?.tags?.join(', ') || '',
		},
	});

	// Update password strength when password changes
	const watchPassword = form.watch('password');
	useState(() => {
		setPasswordStrength(checkPasswordStrength(watchPassword));
	});

	// Get available categories
	const categories = vaultData?.settings?.categories || [
		'Login',
		'Financial',
		'Personal',
		'Work',
	];

	// Handle form submission
	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			const credentialData = {
				title: values.title,
				username: values.username,
				password: values.password,
				url: values.url,
				notes: values.notes,
				category: values.category,
				tags: values.tags
					? values.tags.split(',').map((tag) => tag.trim())
					: undefined,
			};

			if (isEditing && editingCredential) {
				await updateCredential(editingCredential.id, credentialData);
			} else {
				await addCredential(credentialData);
			}

			onClose();
		} catch (error) {
			console.error('Error saving credential:', error);
		}
	}

	// Generate a random password
	function handleGeneratePassword() {
		const password = generatePassword(16, {
			uppercase: true,
			lowercase: true,
			numbers: true,
			symbols: true,
		});

		form.setValue('password', password);
		setPasswordStrength(checkPasswordStrength(password));
	}

	// Get color for password strength
	function getPasswordStrengthColor() {
		switch (passwordStrength) {
			case 0:
			case 1:
				return 'bg-red-500';
			case 2:
				return 'bg-orange-500';
			case 3:
				return 'bg-yellow-500';
			case 4:
			default:
				return 'bg-green-500';
		}
	}

	// Get label for password strength
	function getPasswordStrengthLabel() {
		switch (passwordStrength) {
			case 0:
			case 1:
				return 'Weak';
			case 2:
				return 'Fair';
			case 3:
				return 'Good';
			case 4:
			default:
				return 'Strong';
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? 'Edit' : 'Add'} Password
					</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Title</FormLabel>
									<FormControl>
										<Input
											placeholder="E.g., Work Email"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="username"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Username</FormLabel>
									<FormControl>
										<Input
											placeholder="E.g., john.doe@example.com"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password</FormLabel>
									<div className="flex items-center space-x-2">
										<FormControl>
											<div className="relative w-full">
												<Input
													type={
														showPassword
															? 'text'
															: 'password'
													}
													{...field}
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="absolute right-0 top-0 h-full"
													onClick={() =>
														setShowPassword(
															!showPassword
														)
													}
												>
													{showPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</Button>
											</div>
										</FormControl>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={handleGeneratePassword}
											title="Generate Password"
										>
											<RefreshCw className="h-4 w-4" />
										</Button>
									</div>

									{/* Password strength indicator */}
									{field.value && (
										<div className="mt-1">
											<div className="flex items-center justify-between mb-1">
												<span className="text-xs">
													Strength:{' '}
													{getPasswordStrengthLabel()}
												</span>
											</div>
											<div className="h-1 w-full bg-muted rounded-full overflow-hidden">
												<div
													className={`h-full ${getPasswordStrengthColor()}`}
													style={{
														width: `${(passwordStrength / 4) * 100}%`,
													}}
												/>
											</div>
										</div>
									)}

									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="url"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Website URL</FormLabel>
									<FormControl>
										<Input
											placeholder="E.g., https://example.com"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="category"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Category</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a category" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{categories.map((category) => (
												<SelectItem
													key={category}
													value={category}
												>
													{category}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="tags"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Tags</FormLabel>
									<FormControl>
										<Input
											placeholder="E.g., work, important (comma separated)"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Add any additional notes here"
											className="min-h-[100px]"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={onClose}
							>
								Cancel
							</Button>
							<Button type="submit">
								{isEditing ? 'Update' : 'Save'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
