export type PricingType = "SIMPLE" | "TIERED" | "BUNDLE";
export type PricingTier = { min_quantity: number; unit_price: number };

export type Product = {
  id: string;
  name: string;
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
};

export type CartLine = { product: Product; quantity: number };

export type Category = { id: string; name: string; sort_order?: number };

/** Datos para crear/editar un producto (sin `id`). */
export type ProductInput = {
  name: string;
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
};

export type Store = {
  name: string;
  subtitle: string;
  slogan: string;
  whatsapp: string;
  alias: string;
  cbu: string;
  titular: string;
};

/** Forma del JSON de Fase 1 (`data/products_mock.json`). */
export type StoreData = {
  store: Store;
  categories: Category[];
  products: Product[];
};

export type OrderSource = "WEB" | "POS";

export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED" | (string & {});

export type Order = {
  id: string;
  source: OrderSource;
  customer_name: string | null;
  pickup_time: string | null;
  payment_method: string | null;
  total: number;
  status: OrderStatus;
  created_at: string;
};

export type OrderItemRow = {
  quantity: number;
  line_total: number;
  product_name: string;
};

export type OrderWithItems = Order & { items: OrderItemRow[] };
