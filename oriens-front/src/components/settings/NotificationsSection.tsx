import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/context/SettingsContext";
import { useSound } from "@/hooks/useSound";
import { toast } from "sonner";
import { SettingsSection, SettingRow } from "./SettingsSection";

/**
 * Notificações e som (SPEC §11.8): os dois switches que já existiam, agora
 * em linhas de configuração com rótulo e descrição.
 */
export function NotificationsSection() {
  const { preferences, isUpdating, updatePreference } = useSettings();
  const playSwitchSound = useSound("/concluding-sound.wav");

  if (!preferences) {
    return null;
  }

  const handleNotificationChange = async (checked: boolean) => {
    try {
      const wasSoundEnabled = preferences.sound;
      await updatePreference("notifications", checked);
      if (wasSoundEnabled) playSwitchSound();
      toast.success(`Notificações ${checked ? "ativadas" : "desativadas"}`);
    } catch (error) {
      // erro já exibido como toast pelo SettingsContext
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
      // erro já exibido como toast pelo SettingsContext
    }
  };

  return (
    <SettingsSection
      title="Notificações e som"
      description="Escolha como o Oriens avisa você."
    >
      <SettingRow
        label="Notificações"
        description="Receba notificações sobre suas atividades."
      >
        <Switch
          className="relative after:absolute after:-inset-2 after:content-['']"
          aria-label="Notificações"
          disabled={isUpdating}
          checked={preferences.notifications}
          onCheckedChange={handleNotificationChange}
        />
      </SettingRow>

      <SettingRow
        label="Som"
        description="Ative ou desative os sons do sistema."
      >
        <Switch
          className="relative after:absolute after:-inset-2 after:content-['']"
          aria-label="Som"
          disabled={isUpdating}
          checked={preferences.sound}
          onCheckedChange={handleSoundChange}
        />
      </SettingRow>
    </SettingsSection>
  );
}
