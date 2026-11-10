import type { CSSProperties } from "react";
import type { StoreDesign, StoreShadows, StorefrontLayout } from "./types";
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

const INK_ON_LIGHT = "#18181b";
const INK_ON_DARK = "#f4f4f5";
const WHITE = "#ffffff";
/** Tinta cálida usada cuando el fondo del acento es claro (boutique). */
const DARK_ON_ACCENT = "#141311";

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb | null {
  const value = hex.trim().replace(/^#/, "");
  if (value.length === 3) {
    return [
      parseInt(value[0] + value[0], 16),
      parseInt(value[1] + value[1], 16),
      parseInt(value[2] + value[2], 16),
    ];
  }
  if (value.length === 6) {
    const int = Number.parseInt(value, 16);
    if (Number.isNaN(int)) return null;
    return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  }
  return null;
}

function toHex([r, g, b]: Rgb): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function channelLuminance(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa WCAG de un color hex. */
function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb;
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Mezcla `b` sobre `a`. `weight` es la proporción de `b` (0–1). */
function mix(a: string, b: string, weight: number): string {
  const from = parseHex(a);
  const to = parseHex(b);
  if (!from || !to) return a;
  return toHex([
    from[0] + (to[0] - from[0]) * weight,
    from[1] + (to[1] - from[1]) * weight,
    from[2] + (to[2] - from[2]) * weight,
  ]);
}

function isDark(hex: string): boolean {
  return luminance(hex) < 0.4;
}

/**
 * Tinta legible sobre un color de acento. Se elige el candidato con mayor
 * contraste real (WCAG) en lugar de asumir blanco: el acento rosa de Aura
 * necesita texto oscuro y el azul de AG necesita texto blanco.
 */
function inkOn(background: string): string {
  const white = contrastRatio(background, WHITE);
  const dark = contrastRatio(background, DARK_ON_ACCENT);
  return white >= dark ? WHITE : DARK_ON_ACCENT;
}

/**
 * El tema editorial (Playfair, superficies cálidas) es exclusivo del layout
 * boutique. Las tiendas retail reciben el tema utilitario neutro.
 */
export function adminThemeForLayout(layout: StorefrontLayout): "editorial" | "utility" {
  return layout === "boutique" ? "editorial" : "utility";
}

/**
 * Convierte el diseño del tenant en CSS custom properties.
 *
 * Se aplica como `style` en el wrapper del layout (Server Component),
 * de modo que las variables ya están en el HTML inicial: no hay
 * `useEffect`, no hay primer paint sin tema y no hay FOUC.
 *
 * Los neutros (surface, ink, divider) se derivan del fondo y del acento de
 * cada tienda: un tenant retail conserva grises utilitarios y Aura recibe
 * matices cálidos sin hardcodear la paleta boutique para todo el mundo.
 *
 * También pisa los tokens `--brand*` existentes para que las utilidades
 * actuales (`text-brand`, `bg-brand-solid`, ...) adopten el color del
 * tenant sin refactorizar todos los componentes.
 */
export function designToCssVars(design: StoreDesign): CSSProperties {
  const { colors, fonts, ui } = design.theme;
  const primary = colors.primary;
  const background = colors.background;
  const darkCanvas = isDark(background);
  const ink = darkCanvas ? INK_ON_DARK : INK_ON_LIGHT;
  const onPrimary = inkOn(primary);

  const surface = mix(background, ink, darkCanvas ? 0.08 : 0.045);
  const muted = mix(background, ink, 0.62);
  const divider = mix(background, ink, darkCanvas ? 0.24 : 0.12);

  return {
    "--store-primary": primary,
    "--store-primary-hover": mix(primary, onPrimary, 0.12),
    "--store-on-primary": onPrimary,
    "--store-background": background,
    "--store-surface": surface,
    "--store-ink": ink,
    "--store-ink-muted": muted,
    "--store-divider": divider,
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
