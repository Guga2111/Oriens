import { useNavigate } from 'react-router-dom';
import { LifeBuoy, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditableAvatar } from '@/components/common/EditableAvatar';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useProfileImage } from '@/hooks/useProfileImage';
import { toast } from 'sonner';

export function AppAccountMenu() {
  const { logout, username, userEmail, profileImageUrl } = useAuth();
  const { preferences, updatePreference, isUpdating } = useSettings();
  const uploadImage = useProfileImage();
  const navigate = useNavigate();
  const handleToggleTheme = async () => {
    if (!preferences) return;
    const newTheme = preferences.theme === "light" ? "dark" : "light";
    try {
      await updatePreference("theme", newTheme);
      toast.success(
        `Tema alterado para ${newTheme === "light" ? "claro" : "escuro"}`
      );
    } catch {
      // erro já exibido como toast pelo SettingsContext
    }
  };

  const theme = preferences?.theme || "light";
  const userFallback = (username || userEmail || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const goTo = (url: string) => {
    navigate(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 max-desktop:size-10" aria-label="Menu da conta">
          <Avatar className="size-6">
            <AvatarImage src={profileImageUrl} alt="" />
            <AvatarFallback>{userFallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" side="bottom" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <EditableAvatar
              src={profileImageUrl || username || ""}
              fallback={userFallback}
              alt="Foto de perfil"
              onImageChange={uploadImage}
            />
            <p className="text-sm font-medium leading-none">{username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => goTo("/config")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => goTo("/support")}>
            <LifeBuoy className="mr-2 h-4 w-4" />
            <span>Ajuda &amp; Suporte</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleToggleTheme} disabled={isUpdating}>
            {theme === "light" ? (
              <Moon className="mr-2 h-4 w-4" />
            ) : (
              <Sun className="mr-2 h-4 w-4" />
            )}
            <span>
              Tema {theme === "light" ? "escuro" : "claro"}
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={logout}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
