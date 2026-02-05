"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemeContextValue {
  colors: ThemeColors | null;
  isCustomTheme: boolean;
  refreshTheme: () => void;
}

const defaultColors: ThemeColors = {
  primary: "#9333EA", // purple-600
  secondary: "#EC4899", // pink-500
  accent: "#F97316", // orange-500
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: null,
  isCustomTheme: false,
  refreshTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [colors, setColors] = useState<ThemeColors | null>(null);

  const fetchTheme = useCallback(() => {
    if (session?.user) {
      fetch("/api/account/profile")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.themeColors) {
            setColors(data.themeColors);
          } else {
            setColors(null);
          }
        })
        .catch(() => setColors(null));
    } else {
      setColors(null);
    }
  }, [session]);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  // Apply CSS variables when colors change
  useEffect(() => {
    const root = document.documentElement;
    const activeColors = colors || defaultColors;

    root.style.setProperty("--theme-primary", activeColors.primary);
    root.style.setProperty("--theme-secondary", activeColors.secondary);
    root.style.setProperty("--theme-accent", activeColors.accent);

    // Also set gradient
    root.style.setProperty(
      "--theme-gradient",
      `linear-gradient(to right, ${activeColors.accent}, ${activeColors.secondary}, ${activeColors.primary})`
    );
  }, [colors]);

  return (
    <ThemeContext.Provider
      value={{ colors, isCustomTheme: !!colors, refreshTheme: fetchTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
