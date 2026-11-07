import type { CSSProperties } from "react";
import type { StoreDesign, StoreShadows } from "./types";
import {
  DEFAULT_BODY_FONT_STACK,
  DEFAULT_HEADING_FONT_STACK,
  fontStack,
} from "./store-fonts";

const SHADOWS: Record<StoreShadows, string> = {
  soft: "0 18px 45px -24px rgb(15 23 42 / 0.35)",
  sharp: "6px 6px 0 0 rgb(15 23 42 / 0.9)",
  none: "none",
};

/**
 * Convierte el diseño del tenant en CSS custom properties.
 *
 * Se aplica como `style` en el wrapper del layout (Server Component),
 * de modo que las variables ya están en el HTML inicial: no hay
 * `useEffect`, no hay primer paint sin tema y no hay FOUC.
 *
 * También pisa los tokens `--brand*` existentes para que las utilidades
 * actuales (`text-brand`, `bg-brand-solid`, ...) adopten el color del
 * tenant sin refactorizar todos los componentes.
 */
export function designToCssVars(design: StoreDesign): CSSProperties {
  const { colors, fonts, ui } = design.theme;
  const primary = colors.primary;

  return {
    "--store-primary": primary,
    "--store-primary-hover": `color-mix(in srgb, ${primary} 86%, #1A1918)`,
    "--store-on-primary": "#1A1918",
    "--store-background": colors.background,
    "--store-surface": "#F4F3EF",
    "--store-ink": "#1A1918",
    "--store-ink-muted": "#737373",
    "--store-divider": "#E5E5E5",
    "--store-radius": ui.radius,
    "--store-shadow": SHADOWS[ui.shadows],
    "--store-font-heading": fontStack(fonts.heading, DEFAULT_HEADING_FONT_STACK),
    "--store-font-body": fontStack(fonts.body, DEFAULT_BODY_FONT_STACK),

    // Compatibilidad con los tokens globales de `app/globals.css`.
    "--brand": primary,
    "--brand-solid": primary,
    "--brand-accent": primary,
  } as CSSProperties;
}
