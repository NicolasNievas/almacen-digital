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

export type Category = { id: string; name: string };

export type Store = {
  name: string;
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
