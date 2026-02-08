"use client";

import { useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem("fpl-theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage unavailable
  }
  return "system";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Apply stored theme on mount
    applyTheme(getStoredTheme());
    setMounted(true);

    // Listen for system theme changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Prevent flash of wrong theme
  if (!mounted) return null;

  return <>{children}</>;
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  const cycle = useCallback(() => {
    const order: Theme[] = ["light", "dark", "system"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setThemeState(next);
    try {
      localStorage.setItem("fpl-theme", next);
    } catch {
      // localStorage unavailable
    }
    applyTheme(next);
  }, [theme]);

  const icon = theme === "dark" ? "☽" : theme === "light" ? "☀" : "◐";
  const label = `Theme: ${theme}`;

  return (
    <button
      onClick={cycle}
      className="p-1.5 text-white/60 hover:text-white transition-colors text-sm"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}
