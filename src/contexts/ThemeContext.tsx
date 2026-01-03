import React, { createContext, useContext, useEffect, useState, useSyncExternalStore, useCallback } from "react";

type Theme = "light" | "dark";
type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  themePreference: ThemePreference;
  toggle: () => void;
  setTheme: (t: ThemePreference) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Use useSyncExternalStore for reliable system theme detection
function useSystemTheme(): Theme {
  const subscribe = useCallback((callback: () => void) => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", callback);
    return () => mediaQuery.removeEventListener("change", callback);
  }, []);
  
  const getSnapshot = useCallback(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }, []);
  
  const getServerSnapshot = useCallback(() => "light" as Theme, []);
  
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useSystemTheme();
  
  // Track the user's preference (light, dark, or system)
  // Initialize with a function to read from localStorage (only runs on client)
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem("theme") as ThemePreference | null;
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored;
    }
    return "system";
  });
  
  const [mounted, setMounted] = useState(false);
  
  // Set mounted after first render
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Compute the actual theme based on preference
  const theme: Theme = themePreference === "system" ? systemTheme : themePreference;

  // Apply dark class to document
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, mounted]);

  const toggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setThemePreference(newTheme);
    window.localStorage.setItem("theme", newTheme);
  };
  
  const setThemeFunc = (t: ThemePreference) => {
    setThemePreference(t);
    window.localStorage.setItem("theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, themePreference, toggle, setTheme: setThemeFunc, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
