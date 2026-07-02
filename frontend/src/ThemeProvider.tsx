import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { applyTheme, getStoredTheme, type ThemeId } from "./theme";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Provides the active theme and a setter that animates the accent transition
 * and persists the choice. The theme is already applied to <html> before React
 * mounts (see main.tsx), so state starts in sync with the DOM — no flash.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => getStoredTheme());

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState((prev) => {
      if (prev !== id) applyTheme(id, /* animate */ true);
      return id;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
