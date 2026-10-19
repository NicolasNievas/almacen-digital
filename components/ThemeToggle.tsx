"use client";

import { useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_EVENT, useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const theme = useTheme();

  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage puede estar bloqueado; ignoramos.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className="rounded-lg border border-neutral-200 bg-white p-1.5 text-neutral-600 transition-colors hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
