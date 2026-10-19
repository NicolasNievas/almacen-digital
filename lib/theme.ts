"use client";

import { useSyncExternalStore } from "react";

export const THEME_EVENT = "theme-change";

export function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    media.removeEventListener("change", callback);
  };
}

export function getSnapshot(): "dark" | "light" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function getServerSnapshot(): "dark" | "light" {
  return "light";
}

/** Tema activo ("dark" | "light") sincronizado con la clase `.dark` del <html>. */
export function useTheme(): "dark" | "light" {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
