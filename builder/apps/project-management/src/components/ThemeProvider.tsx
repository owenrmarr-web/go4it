"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Allow ?theme=dark query param to force dark mode (e.g. for iframes)
    const params = new URLSearchParams(window.location.search);
    const paramTheme = params.get("theme") as Theme | null;
    const saved = localStorage.getItem("go4it-theme") as Theme | null;
    const initial = paramTheme === "dark" || paramTheme === "light" ? paramTheme : saved === "dark" ? "dark" : "light";
    setTheme(initial);
    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("go4it-theme", next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

const defaultTheme: ThemeContextValue = { theme: "light", toggleTheme: () => {} };

export function useTheme() {
  const context = useContext(ThemeContext);
  return context ?? defaultTheme;
}
