import { Button } from "@/components/ui/button";
import { UserProfileNav } from "@/components/dashboard/UserProfileNav";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Sun, Moon } from "lucide-react";
import { toast } from "sonner";

export function AppHeader() {
  const { logout } = useAuth();
  const { preferences, updatePreference, isUpdating } = useSettings();

  const handleToggleTheme = async () => {
    if (!preferences) return;

    const newTheme = preferences.theme === "light" ? "dark" : "light";

    try {
      await updatePreference("theme", newTheme);
      toast.success(`Tema alterado para ${newTheme === "light" ? "claro" : "escuro"}`);
    } catch (error) {
    }
  };

  const theme = preferences?.theme || "light";

  return (
    <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-8">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Oriens
          </h1>
          <p className="text-xs text-muted-foreground">Organize seu dia</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleTheme}
          disabled={isUpdating}
          className="h-9 w-9"
        >
          {theme === "light" ? (
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          ) : (
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          )}
          <span className="sr-only">Alternar tema</span>
        </Button>
        <NotificationBell />
        <UserProfileNav />
        <Button variant="ghost" onClick={logout}>
          Sair
        </Button>
      </div>
    </header>
  );
}

