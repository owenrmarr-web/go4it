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

/**
 * Convert a hex color to relative luminance (WCAG 2.0).
 * Returns a value between 0 (black) and 1 (white).
 */
function getLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Return "#ffffff" or "#111827" (gray-900) based on background luminance. */
function getContrastColor(hex: string): string {
  return getLuminance(hex) > 0.4 ? "#111827" : "#ffffff";
}

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

    // Contrast-aware text colors for each theme color
    root.style.setProperty("--theme-primary-contrast", getContrastColor(activeColors.primary));
    root.style.setProperty("--theme-secondary-contrast", getContrastColor(activeColors.secondary));
    root.style.setProperty("--theme-accent-contrast", getContrastColor(activeColors.accent));

    // Sort colors by luminance (darkest first) for safe text/border usage on white backgrounds
    const ranked = [
      { hex: activeColors.primary, lum: getLuminance(activeColors.primary) },
      { hex: activeColors.secondary, lum: getLuminance(activeColors.secondary) },
      { hex: activeColors.accent, lum: getLuminance(activeColors.accent) },
    ].sort((a, b) => a.lum - b.lum);

    root.style.setProperty("--theme-darkest", ranked[0].hex);
    root.style.setProperty("--theme-second-darkest", ranked[1].hex);
    root.style.setProperty("--theme-lightest", ranked[2].hex);
    root.style.setProperty("--theme-darkest-contrast", getContrastColor(ranked[0].hex));
    root.style.setProperty("--theme-second-darkest-contrast", getContrastColor(ranked[1].hex));

    // For gradient backgrounds, pick contrast based on the darkest color in the gradient
    const minLum = ranked[0].lum;
    root.style.setProperty("--theme-gradient-contrast", minLum > 0.4 ? "#111827" : "#ffffff");

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
