import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePasswordManager } from "@/lib/context";

// Form validation schema
const formSchema = z.object({
  action: z.enum(["create", "open"]),
  vaultId: z.string().optional(),
  vaultName: z.string().min(1, "Vault name is required").optional(),
  password: z.string().min(1, "Password is required"),
});

export default function VaultSelect() {
  const { 
    vaults, 
    isLoading, 
    createNewVault, 
    openExistingVault, 
    error 
  } = usePasswordManager();
  
  const [mode, setMode] = useState<"create" | "open">("open");
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      action: "open",
      vaultId: vaults.length > 0 ? vaults[0].id : undefined,
      vaultName: "",
      password: "",
    },
  });
  
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (values.action === "create" && values.vaultName) {
        await createNewVault(values.vaultName, values.password);
      } else if (values.action === "open" && values.vaultId) {
        await openExistingVault(values.vaultId, values.password);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  }
  
  function handleModeChange(newMode: "create" | "open") {
    setMode(newMode);
    form.setValue("action", newMode);
    
    // Reset fields based on mode
    if (newMode === "create") {
      form.setValue("vaultId", undefined);
      form.setValue("vaultName", "");
    } else {
      form.setValue("vaultName", undefined);
      if (vaults.length > 0) {
        form.setValue("vaultId", vaults[0].id);
      }
    }
  }
  
  return (
    <Card className="w-[400px] bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Password Manager</CardTitle>
        <CardDescription>
          {mode === "open" 
            ? "Open an existing vault" 
            : "Create a new password vault"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex space-x-2 mb-4">
              <Button 
                type="button"
                variant={mode === "open" ? "default" : "outline"} 
                onClick={() => handleModeChange("open")}
                className="flex-1"
                disabled={vaults.length === 0}
              >
                Open Vault
              </Button>
              <Button 
                type="button"
                variant={mode === "create" ? "default" : "outline"} 
                onClick={() => handleModeChange("create")}
                className="flex-1"
              >
                Create Vault
              </Button>
            </div>
            
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />
            
            {mode === "open" && (
              <FormField
                control={form.control}
                name="vaultId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Vault</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vault" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vaults.map((vault) => (
                          <SelectItem key={vault.id} value={vault.id}>
                            {vault.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {mode === "create" && (
              <FormField
                control={form.control}
                name="vaultName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vault Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vault name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {mode === "open" ? "Master Password" : "Create Master Password"}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder={mode === "open" ? "Enter password" : "Create a strong password"} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {error && (
              <div className="text-destructive text-sm">{error}</div>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading 
                ? "Processing..." 
                : mode === "open" 
                  ? "Unlock Vault" 
                  : "Create Vault"
              }
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center text-xs text-muted-foreground">
        All passwords are encrypted with AES-256
      </CardFooter>
    </Card>
  );
}
