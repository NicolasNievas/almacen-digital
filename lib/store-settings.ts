import type { BusinessType, CheckoutType, StoreSettings } from "./types";

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
};

const BUSINESS_TYPES: BusinessType[] = ["MAYORISTA", "GASTRONOMY", "CLOTHING"];
const CHECKOUT_TYPES: CheckoutType[] = ["WHATSAPP", "MERCADO_PAGO"];

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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
