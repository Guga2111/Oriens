import { createContext, useContext, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {

  const value: ThemeContextType = {
    theme: "light", 
    setTheme: () => {
      console.warn(
        "setTheme() está deprecated. Use useSettings().updatePreference('theme', value) ao invés."
      );
    },
    toggleTheme: () => {
      console.warn(
        "toggleTheme() está deprecated. Use useSettings().updatePreference('theme', value) ao invés."
      );
    },
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};