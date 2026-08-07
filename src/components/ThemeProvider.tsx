"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme);
    }
    applyTheme(newTheme);
  };

  const syncThemeWithBackend = async (newTheme: Theme) => {
    try {
      await fetch(`${getApiUrl()}/api/auth/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch (err) {
      console.error("Failed to persist theme to backend:", err);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    syncThemeWithBackend(nextTheme);
  };

  useEffect(() => {
    // 1. Initial local storage check
    const localTheme = localStorage.getItem("theme") as Theme | null;
    if (localTheme && (localTheme === "dark" || localTheme === "light")) {
      setThemeState(localTheme);
      applyTheme(localTheme);
    }

    // 2. Sync from backend DB if user is logged in
    const fetchUserTheme = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/auth/me`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.theme && (data.user.theme === "dark" || data.user.theme === "light")) {
            setTheme(data.user.theme);
          }
        }
      } catch (err) {
        // Not logged in or network error, fallback to local storage
      }
    };

    fetchUserTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
