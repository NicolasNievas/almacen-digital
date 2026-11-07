import { Inter, Playfair_Display } from "next/font/google";
import type { StoreDesign } from "./types";

/**
 * Registro de fuentes disponibles para los tenants.
 *
 * `next/font` se ejecuta en build time: no se puede pedir una fuente
 * arbitraria desde el JSONB en runtime. Por eso la DB valida un nombre
 * y acá lo mapeamos a una fuente ya self-hosteada por Next.
 *
 * Para sumar una fuente: importarla, crear su instancia con `variable`
 * y agregarla a `FONT_VARIABLE_CLASS` + `STORE_FONT_STACKS`.
 */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const FONT_VARIABLE_CLASS: Record<string, string> = {
  Inter: inter.variable,
  "Playfair Display": playfair.variable,
};

/**
 * Stack CSS para cada fuente del registro. `Geist` ya se carga en el
 * root layout (`--font-geist-sans`), por eso no se importa de nuevo.
 */
export const STORE_FONT_STACKS: Record<string, string> = {
  Inter: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  "Playfair Display": "var(--font-playfair), Georgia, 'Times New Roman', serif",
  Geist: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
};

export const DEFAULT_BODY_FONT_STACK = STORE_FONT_STACKS.Inter;
export const DEFAULT_HEADING_FONT_STACK = STORE_FONT_STACKS.Inter;

export function fontStack(name: string, fallback: string): string {
  return STORE_FONT_STACKS[name] ?? fallback;
}

/**
 * Devuelve solo las clases de las fuentes que el tenant realmente usa.
 * Se aplican al wrapper del layout para definir las CSS variables.
 */
export function storeFontClassName(design: StoreDesign): string {
  const used = new Set([design.theme.fonts.heading, design.theme.fonts.body]);
  return [...used]
    .map((name) => FONT_VARIABLE_CLASS[name] ?? "")
    .filter(Boolean)
    .join(" ");
}
