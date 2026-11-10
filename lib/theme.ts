"use client";

import { useSyncExternalStore } from "react";

export const THEME_EVENT = "theme-change";

export type Theme = "dark" | "light";

/**
 * Aplica el tema en el `<html>`, lo persiste y notifica a `useTheme`.
 * Es la única implementación: toggle, switch segmentado y cualquier otro
 * control llaman acá en lugar de duplicar la lógica.
 */
export function applyTheme(next: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem("theme", next);
  } catch {
    // localStorage puede estar bloqueado; el tema sigue funcionando en la sesión.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    media.removeEventListener("change", callback);
  };
}

export function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function getServerSnapshot(): Theme {
  return "light";
}

/** Tema activo ("dark" | "light") sincronizado con la clase `.dark` del <html>. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
