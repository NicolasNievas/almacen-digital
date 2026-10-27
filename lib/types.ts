export type PricingType = "SIMPLE" | "TIERED" | "BUNDLE";
export type PricingTier = { min_quantity: number; unit_price: number };

/** Tipo de comercio que define la experiencia de la tienda. */
export type BusinessType = "MAYORISTA" | "GASTRONOMY" | "CLOTHING";

/** Medio de cobro del checkout web. */
export type CheckoutType = "WHATSAPP" | "MERCADO_PAGO";

export type FulfillmentType = "PICKUP" | "DELIVERY";

/** Configuración dinámica guardada en `stores.settings` (JSONB). */
export type StoreSettings = {
  business_type: BusinessType;
  checkout_type: CheckoutType;
  fulfillment: {
    shipping_enabled: boolean;
    pickup_enabled: boolean;
  };
  features: {
    variants_enabled: boolean;
    gallery_enabled: boolean;
    pos_enabled: boolean;
    stock_alerts: boolean;
    custom_notes: boolean;
  };
};

/** Tienda / tenant. */
export type Store = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  slogan: string;
  whatsapp: string;
  alias: string;
  cbu: string;
  titular: string;
  settings: StoreSettings;
  active: boolean;
};

export type ProductVariant = {
  size?: string;
  color?: string;
};

export type Product = {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  category_id: string;
  unit_price: number;
  pricing_type: PricingType;
  pricing_tiers: PricingTier[];
  bundle_size?: number;
  bundle_price?: number;
  stock: number; // SIEMPRE en unidades físicas base
  active: boolean;
  tags: string[];
  image_url?: string;
  /** Galería (la primera imagen también se usa como portada). */
  images: string[];
  /** Talles disponibles (solo indumentaria). */
  sizes: string[];
  /** Colores disponibles (solo indumentaria). */
  colors: string[];
};

/**
 * Línea del carrito. `lineId` permite tener el mismo producto varias veces
 * con distinto talle/color o aclaraciones.
 */
export type CartLine = {
  lineId: string;
  product: Product;
  quantity: number;
  variant?: ProductVariant;
  note?: string;
};

export type Category = { id: string; name: string; sort_order?: number; store_id?: string };

/** Datos para crear/editar un producto (sin `id`). */
export type ProductInput = {
  name: string;
  description: string | null;
  category_id: string;
  unit_price: number;
  pricing_type: PricingType;
  pricing_tiers: PricingTier[];
  bundle_size: number | null;
  bundle_price: number | null;
  stock: number;
  active: boolean;
  tags: string[];
  image_url: string | null;
  images: string[];
  sizes: string[];
  colors: string[];
};

/** Fallback de marca cuando todavía no se cargó la tienda desde Supabase. */
export type StoreBrand = Pick<
  Store,
  "name" | "subtitle" | "slogan" | "whatsapp" | "alias" | "cbu" | "titular"
>;

/** Forma del JSON de Fase 1 (`data/products_mock.json`). */
export type StoreData = {
  store: StoreBrand;
  categories: Category[];
  products: Product[];
};

export type OrderSource = "WEB" | "POS";

export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED" | (string & {});

export type Order = {
  id: string;
  store_id: string;
  source: OrderSource;
  customer_name: string | null;
  customer_phone: string | null;
  pickup_time: string | null;
  payment_method: string | null;
  fulfillment_type: FulfillmentType;
  delivery_address: string | null;
  notes: string | null;
  total: number;
  status: OrderStatus;
  created_at: string;
};

export type OrderItemRow = {
  quantity: number;
  line_total: number;
  product_name: string;
  image_url?: string | null;
  variant?: ProductVariant;
  note?: string | null;
};

export type OrderWithItems = Order & { items: OrderItemRow[] };

/** Datos que completa el cliente en el checkout. */
export type Checkout = {
  name: string;
  phone: string;
  fulfillment: FulfillmentType;
  /** Solo para retiro. */
  pickupTime: string;
  /** Solo para delivery. */
  address: string;
  payment: string;
  notes: string;
};
