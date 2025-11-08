import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bell, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { SettingSwitch } from "./SettingSwitch";
import { useSettings } from "@/context/SettingsContext";
import { useSound } from "@/hooks/useSound";
import { toast } from "sonner";
import { Theme } from "@/types/settings";

export function PreferencesCard() {
  const { preferences, isUpdating, updatePreference } = useSettings();
  const playSwitchSound = useSound("/concluding-sound.wav");

  if (!preferences) {
    return null;
  }

  const handleThemeChange = async (checked: boolean) => {
    const newTheme: Theme = checked ? "dark" : "light";
    try {
      await updatePreference("theme", newTheme);
      if (preferences.sound) playSwitchSound();
      toast.success(`Tema alterado para ${newTheme === "light" ? "claro" : "escuro"}`);
    } catch (error) {
    }
  };

  const handleNotificationChange = async (checked: boolean) => {
    try {
      const wasSoundEnabled = preferences.sound;
      await updatePreference("notifications", checked);
      if (wasSoundEnabled) playSwitchSound();
      toast.success(`Notificações ${checked ? "ativadas" : "desativadas"}`);
    } catch (error) {
    }
  };

  const handleSoundChange = async (checked: boolean) => {
    try {
      const wasSoundEnabled = preferences.sound;

      if (wasSoundEnabled && !checked) playSwitchSound();

      await updatePreference("sound", checked);

      if (!wasSoundEnabled && checked) playSwitchSound();

      toast.success(`Som ${checked ? "ativado" : "desativado"}`);
    } catch (error) {
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências do Sistema</CardTitle>
        <CardDescription>
          Configure suas preferências de tema e notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SettingSwitch
          icon={
            preferences.theme === "light" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )
          }
          label="Tema"
          description="Alterne entre tema claro e escuro"
          checked={preferences.theme === "dark"}
          disabled={isUpdating}
          onCheckedChange={handleThemeChange}
        />

        <Separator />

        <SettingSwitch
          icon={<Bell className="h-5 w-5" />}
          label="Notificações"
          description="Receba notificações sobre suas atividades"
          checked={preferences.notifications}
          disabled={isUpdating}
          onCheckedChange={handleNotificationChange}
        />

        <Separator />

        <SettingSwitch
          icon={
            preferences.sound ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )
          }
          label="Som"
          description="Ative ou desative sons do sistema"
          checked={preferences.sound}
          disabled={isUpdating}
          onCheckedChange={handleSoundChange}
        />
      </CardContent>
    </Card>
  );
}
