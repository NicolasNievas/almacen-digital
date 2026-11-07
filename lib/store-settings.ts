import type {
  AdminLayout,
  BusinessType,
  CheckoutType,
  StoreDesign,
  StoreSettings,
  StorefrontLayout,
  StoreShadows,
  StoreTheme,
} from "./types";

export const STOREFRONT_LAYOUTS: readonly StorefrontLayout[] = ["boutique", "retail"];
export const ADMIN_LAYOUTS: readonly AdminLayout[] = ["sidebar-fixed", "navbar-top"];
export const STORE_SHADOWS: readonly StoreShadows[] = ["soft", "sharp", "none"];

/**
 * Paletas base por layout. Son el espejo exacto de los defaults de
 * `normalize_store_design` en la migración 008.
 */
const DEFAULT_THEMES: Record<StorefrontLayout, StoreTheme> = {
  retail: {
    colors: { primary: "#1E40AF", background: "#FAFAFA" },
    fonts: { heading: "Inter", body: "Inter" },
    ui: { radius: "0.375rem", shadows: "soft" },
  },
  boutique: {
    colors: { primary: "#FAD4D8", background: "#FAF9F6" },
    fonts: { heading: "Playfair Display", body: "Inter" },
    ui: { radius: "0.5rem", shadows: "soft" },
  },
};

/** Diseño por defecto para una tienda nueva según su rubro. */
export function defaultDesignForBusinessType(businessType: BusinessType): StoreDesign {
  const storefrontLayout: StorefrontLayout = businessType === "CLOTHING" ? "boutique" : "retail";
  const theme = DEFAULT_THEMES[storefrontLayout];

  return {
    storefront_layout: storefrontLayout,
    admin_layout: storefrontLayout === "boutique" ? "sidebar-fixed" : "navbar-top",
    theme: {
      colors: { ...theme.colors },
      fonts: { ...theme.fonts },
      ui: { ...theme.ui },
    },
  };
}

export const DEFAULT_STORE_DESIGN: StoreDesign = defaultDesignForBusinessType("MAYORISTA");

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  business_type: "MAYORISTA",
  checkout_type: "WHATSAPP",
  fulfillment: {
    shipping_enabled: false,
    pickup_enabled: true,
  },
  features: {
    variants_enabled: false,
    gallery_enabled: false,
    pos_enabled: true,
    stock_alerts: true,
    custom_notes: false,
  },
  design: DEFAULT_STORE_DESIGN,
};

const BUSINESS_TYPES: readonly BusinessType[] = ["MAYORISTA", "GASTRONOMY", "CLOTHING"];
const CHECKOUT_TYPES: readonly CheckoutType[] = ["WHATSAPP", "MERCADO_PAGO"];

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FONT_NAME = /^[A-Za-z0-9][A-Za-z0-9 -]{0,63}$/;
const CSS_LENGTH = /^(0|[0-9]+(\.[0-9]+)?(px|rem|em|%))$/;

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isStorefrontLayout(value: string | null): value is StorefrontLayout {
  return STOREFRONT_LAYOUTS.includes(value as StorefrontLayout);
}

function isAdminLayout(value: string | null): value is AdminLayout {
  return ADMIN_LAYOUTS.includes(value as AdminLayout);
}

function isStoreShadow(value: string | null): value is StoreShadows {
  return STORE_SHADOWS.includes(value as StoreShadows);
}

function hexColor(value: unknown, fallback: string): string {
  const text = asText(value);
  return text && HEX_COLOR.test(text) ? text : fallback;
}

function fontName(value: unknown, fallback: string): string {
  const text = asText(value);
  return text && FONT_NAME.test(text) ? text : fallback;
}

function cssLength(value: unknown, fallback: string): string {
  const text = asText(value);
  return text && CSS_LENGTH.test(text) ? text : fallback;
}

/**
 * Normaliza el bloque `design` con la misma semántica que Postgres.
 * El layout resuelto define la paleta base cuando faltan tokens.
 */
export function normalizeDesign(raw: unknown, businessType: BusinessType): StoreDesign {
  const value = asRecord(raw);
  const requestedLayout = asText(value.storefront_layout);

  const storefrontLayout: StorefrontLayout = isStorefrontLayout(requestedLayout)
    ? requestedLayout
    : businessType === "CLOTHING"
      ? "boutique"
      : "retail";

  const requestedAdmin = asText(value.admin_layout);
  const adminLayout: AdminLayout = isAdminLayout(requestedAdmin)
    ? requestedAdmin
    : storefrontLayout === "boutique"
      ? "sidebar-fixed"
      : "navbar-top";

  const theme = asRecord(value.theme);
  const colors = asRecord(theme.colors);
  const fonts = asRecord(theme.fonts);
  const ui = asRecord(theme.ui);
  const fallback = DEFAULT_THEMES[storefrontLayout];
  const requestedShadows = asText(ui.shadows);

  return {
    storefront_layout: storefrontLayout,
    admin_layout: adminLayout,
    theme: {
      colors: {
        primary: hexColor(colors.primary, fallback.colors.primary),
        background: hexColor(colors.background, fallback.colors.background),
      },
      fonts: {
        heading: fontName(fonts.heading, fallback.fonts.heading),
        body: fontName(fonts.body, fallback.fonts.body),
      },
      ui: {
        radius: cssLength(ui.radius, fallback.ui.radius),
        shadows: isStoreShadow(requestedShadows) ? requestedShadows : fallback.ui.shadows,
      },
    },
  };
}

/**
 * Normaliza el JSONB de Supabase. Nunca confiamos en la forma del dato:
 * si falta una clave o viene con un valor inválido, aplicamos el default.
 */
export function normalizeSettings(raw: unknown): StoreSettings {
  const value = asRecord(raw);
  const fulfillment = asRecord(value.fulfillment);
  const features = asRecord(value.features);

  const businessType = BUSINESS_TYPES.includes(value.business_type as BusinessType)
    ? (value.business_type as BusinessType)
    : DEFAULT_STORE_SETTINGS.business_type;
  const checkoutType = CHECKOUT_TYPES.includes(value.checkout_type as CheckoutType)
    ? (value.checkout_type as CheckoutType)
    : DEFAULT_STORE_SETTINGS.checkout_type;

  return {
    business_type: businessType,
    checkout_type: checkoutType,
    fulfillment: {
      shipping_enabled: bool(
        fulfillment.shipping_enabled,
        DEFAULT_STORE_SETTINGS.fulfillment.shipping_enabled,
      ),
      pickup_enabled: bool(
        fulfillment.pickup_enabled,
        DEFAULT_STORE_SETTINGS.fulfillment.pickup_enabled,
      ),
    },
    features: {
      variants_enabled: bool(
        features.variants_enabled,
        DEFAULT_STORE_SETTINGS.features.variants_enabled,
      ),
      gallery_enabled: bool(features.gallery_enabled, DEFAULT_STORE_SETTINGS.features.gallery_enabled),
      pos_enabled: bool(features.pos_enabled, DEFAULT_STORE_SETTINGS.features.pos_enabled),
      stock_alerts: bool(features.stock_alerts, DEFAULT_STORE_SETTINGS.features.stock_alerts),
      custom_notes: bool(features.custom_notes, DEFAULT_STORE_SETTINGS.features.custom_notes),
    },
    design: normalizeDesign(value.design, businessType),
  };
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  MAYORISTA: "Mayorista",
  GASTRONOMY: "Gastronomía",
  CLOTHING: "Indumentaria",
};

export const BUSINESS_TYPE_DESCRIPTIONS: Record<BusinessType, string> = {
  MAYORISTA: "Packs, escalones de precio y reposición rápida.",
  GASTRONOMY: "Notas por ítem, delivery y retiro programado.",
  CLOTHING: "Talles, colores y galería de imágenes.",
};
