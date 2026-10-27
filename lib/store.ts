import type { Store } from "./types";
import { DEFAULT_STORE_SETTINGS } from "./store-settings";

/**
 * Slug de la tienda que administra el panel. En un despliegue real cada
 * comercio tiene su propio proyecto/entorno; este valor permite que el panel
 * sepa qué tenant está gestionando.
 */
export const DEFAULT_ADMIN_STORE_SLUG =
  process.env.NEXT_PUBLIC_ADMIN_STORE_SLUG ?? "ag-mayorista";

/**
 * Fallback de marca: se usa mientras la tienda no cargó desde Supabase o si
 * el entorno no tiene variables configuradas. La fuente de verdad es `stores`.
 */
export const STORE: Store = {
  id: "fallback-store",
  slug: DEFAULT_ADMIN_STORE_SLUG,
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? "AG Mayorista",
  subtitle: process.env.NEXT_PUBLIC_STORE_SUBTITLE ?? "Ventas por mayor y menor",
  slogan:
    process.env.NEXT_PUBLIC_STORE_SLOGAN ??
    "Donde cuidar tu bolsillo también es invertir en tu futuro.",
  whatsapp: process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? "5491123456789",
  alias: process.env.NEXT_PUBLIC_STORE_ALIAS ?? "almacen.barrio.mp",
  cbu: process.env.NEXT_PUBLIC_STORE_CBU ?? "0000000000000000000000",
  titular: process.env.NEXT_PUBLIC_STORE_TITULAR ?? "Nombre del Titular",
  settings: DEFAULT_STORE_SETTINGS,
  active: true,
};

/** Marca del producto SaaS (landing). */
export const SAAS_BRAND = {
  name: "Nexo",
  product: "Nexo Commerce",
  tagline: "El sistema operativo de tu comercio",
  description:
    "Catálogo online, punto de venta, stock y métricas en una sola plataforma. Configurá cada tienda según su rubro y vendé por WhatsApp o Mercado Pago.",
} as const;

export const DEMO_STORES = [
  {
    slug: "ag-mayorista",
    name: "AG Mayorista",
    type: "MAYORISTA" as const,
    label: "Almacén / Mayorista",
    description:
      "Packs, escalones de precio por cantidad y control de stock para vender por mayor y menor sin fricción.",
    accent: "from-blue-600 via-blue-500 to-cyan-400",
    icon: "boxes",
    highlights: ["Packs y combos", "Precios por cantidad", "Retiro en local"],
  },
  {
    slug: "rotiseria-express",
    name: "Rotisería Express",
    type: "GASTRONOMY" as const,
    label: "Gastronomía",
    description:
      "Pedidos con aclaraciones por ítem, delivery a domicilio y retiro programado en franjas horarias.",
    accent: "from-orange-500 via-amber-500 to-yellow-400",
    icon: "utensils",
    highlights: ["Notas: “sin cebolla”", "Delivery + takeaway", "Pedido por WhatsApp"],
  },
  {
    slug: "aura-studio",
    name: "Aura Studio",
    type: "CLOTHING" as const,
    label: "Indumentaria / Moda",
    description:
      "Variantes de talle y color, galería de imágenes y checkout con Mercado Pago listo para conectar.",
    accent: "from-fuchsia-600 via-purple-500 to-indigo-400",
    icon: "shirt",
    highlights: ["Talles y colores", "Galería múltiple", "Mercado Pago"],
  },
] as const;
