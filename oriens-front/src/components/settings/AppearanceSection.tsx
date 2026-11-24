import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSettings } from "@/context/SettingsContext";
import { useSound } from "@/hooks/useSound";
import { toast } from "sonner";
import { SettingsSection, SettingRow } from "./SettingsSection";
import { DEFAULT_TASK_VIEW, TASK_VIEWS } from "@/lib/task-view";
import type { TaskView, Theme } from "@/types/settings";

/**
 * Aparência (SPEC §11.8): o tema vira um `ToggleGroup` Claro/Escuro — dois
 * estados visíveis, com rótulo em texto.
 */
export function AppearanceSection() {
  const { preferences, isUpdating, updatePreference } = useSettings();
  const playSwitchSound = useSound("/concluding-sound.wav");

  if (!preferences) {
    return null;
  }

  const handleThemeChange = async (value: string) => {
    if (!value || value === preferences.theme) return;
    const newTheme: Theme = value === "dark" ? "dark" : "light";
    try {
      await updatePreference("theme", newTheme);
      if (preferences.sound) playSwitchSound();
      toast.success(
        `Tema alterado para ${newTheme === "light" ? "claro" : "escuro"}`
      );
    } catch (error) {
      // erro já exibido como toast pelo SettingsContext
    }
  };

  const taskView = preferences.taskView ?? DEFAULT_TASK_VIEW;
  const handleTaskViewChange = async (value: string) => {
    const next = TASK_VIEWS.find(view => view.value === value);
    if (!next || next.value === taskView) return;
    try {
      await updatePreference("taskView", next.value as TaskView);
      toast.success(`Tarefas abrem em ${next.label.toLowerCase()}`);
    } catch (error) {
      // erro já exibido como toast pelo SettingsContext
    }
  };

  return (
    <SettingsSection
      title="Aparência"
      description="Escolha o tema e como as tarefas abrem no Oriens."
    >
      <SettingRow
        label="Tema"
        description="Claro ou escuro, com transição imediata."
      >
        <ToggleGroup
          type="single"
          value={preferences.theme}
          onValueChange={handleThemeChange}
          disabled={isUpdating}
          aria-label="Tema"
        >
          <ToggleGroupItem value="light" aria-label="Claro">
            Claro
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" aria-label="Escuro">
            Escuro
          </ToggleGroupItem>
        </ToggleGroup>
      </SettingRow>
      <SettingRow
        label="Abrir tarefas em"
        description="Painel ao lado da lista, modal ou tela cheia. Também dá para trocar no próprio painel da tarefa."
      >
        <ToggleGroup
          type="single"
          value={taskView}
          onValueChange={handleTaskViewChange}
          disabled={isUpdating}
          aria-label="Abrir tarefas em"
        >
          {TASK_VIEWS.map(view => (
            <ToggleGroupItem key={view.value} value={view.value} aria-label={view.label}>
              <view.icon aria-hidden />
              {view.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </SettingRow>
    </SettingsSection>
  );
}
