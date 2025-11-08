import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { UserPreferences, Theme } from "@/types/settings";
import settingsService from "@/services/settingsService";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface SettingsContextType {
  preferences: UserPreferences | null;
  isLoading: boolean;
  isUpdating: boolean;
  updatePreference: (key: keyof UserPreferences, value: boolean | Theme) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

const STORAGE_KEY = "oriens-user-preferences";

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { userId, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadFromLocalStorage = useCallback((): UserPreferences | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Erro ao carregar preferências do localStorage:", error);
    }
    return null;
  }, []);

  const saveToLocalStorage = useCallback((prefs: UserPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      localStorage.setItem("oriens-theme", prefs.theme);
    } catch (error) {
      console.error("Erro ao salvar preferências no localStorage:", error);
    }
  }, []);

  const refreshPreferences = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await settingsService.getPreferences(userId);
      setPreferences(data);
      saveToLocalStorage(data);

      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(data.theme);
    } catch (error) {
      console.error("Erro ao buscar preferências:", error);
      const cached = loadFromLocalStorage();
      if (cached) {
        setPreferences(cached);
      } else {
        const defaultPrefs: UserPreferences = {
          notifications: true,
          sound: true,
          theme: "light",
        };
        setPreferences(defaultPrefs);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, isAuthenticated, saveToLocalStorage, loadFromLocalStorage]);

  const updatePreference = useCallback(
    async (key: keyof UserPreferences, value: boolean | Theme) => {
      if (!userId || !preferences) {
        toast.error("Usuário não autenticado");
        return;
      }

      const previousPreferences = { ...preferences };

      try {
        setIsUpdating(true);

        const updatedPreferences = { ...preferences, [key]: value };
        setPreferences(updatedPreferences);
        saveToLocalStorage(updatedPreferences);

        if (key === "theme") {
          const root = window.document.documentElement;
          root.classList.remove("light", "dark");
          root.classList.add(value as Theme);
        }

        const result = await settingsService.updatePreference(
          userId,
          key,
          value
        );

        setPreferences(result);
        saveToLocalStorage(result);
      } catch (error) {
        console.error("Erro ao atualizar preferência:", error);

        setPreferences(previousPreferences);
        saveToLocalStorage(previousPreferences);

        if (key === "theme") {
          const root = window.document.documentElement;
          root.classList.remove("light", "dark");
          root.classList.add(previousPreferences.theme);
        }

        toast.error("Erro ao atualizar preferência");
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [userId, preferences, saveToLocalStorage]
  );

  useEffect(() => {
    if (isAuthenticated && userId) {
      const cached = loadFromLocalStorage();
      if (cached) {
        setPreferences(cached);
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(cached.theme);
      }
      refreshPreferences();
    } else {
      setPreferences(null);
      setIsLoading(false);
    }
  }, [userId, isAuthenticated, refreshPreferences, loadFromLocalStorage]);

  const value: SettingsContextType = {
    preferences,
    isLoading,
    isUpdating,
    updatePreference,
    refreshPreferences,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings deve ser usado dentro de um SettingsProvider");
  }
  return context;
}
