import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePasswordManager } from "@/lib/context";
import { PlusCircle, Lock, Settings, LogOut } from "lucide-react";

interface SidebarProps {
  onAddCredential: () => void;
  onOpenSettings: () => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export default function Sidebar({
  onAddCredential,
  onOpenSettings,
  selectedCategory,
  onSelectCategory,
}: SidebarProps) {
  const { 
    vaultData, 
    currentVault, 
    lockVault 
  } = usePasswordManager();
  
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get unique categories from credentials
  const categories = vaultData?.credentials
    ? Array.from(
        new Set([
          ...(vaultData.settings?.categories || []),
          ...vaultData.credentials.map((cred) => cred.category).filter(Boolean),
        ] as string[])
      )
    : [];
  
  const handleCategoryClick = (category: string | null) => {
    onSelectCategory(category);
  };

  return (
    <div className="w-64 h-full bg-card/50 backdrop-blur-sm border-r border-border p-4 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{currentVault?.name}</h2>
        <Button variant="outline" size="icon" onClick={lockVault} title="Lock Vault">
          <Lock className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="mb-4">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      
      <Button 
        onClick={onAddCredential} 
        className="mb-6"
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Password
      </Button>
      
      <div className="flex-1 overflow-auto">
        <div className="mb-2 text-sm font-medium text-muted-foreground">
          Categories
        </div>
        <div className="space-y-1">
          <button
            onClick={() => handleCategoryClick(null)}
            className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md text-left ${
              selectedCategory === null
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted/50"
            }`}
          >
            All Items
          </button>
          
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md text-left ${
                selectedCategory === category
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted/50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-auto pt-4 border-t border-border">
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={onOpenSettings}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
