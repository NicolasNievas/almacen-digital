import { normalizeSettings } from "../store-settings";
import type {
  Category,
  Order,
  OrderItemRow,
  OrderWithItems,
  PricingTier,
  Product,
  ProductVariant,
  Store,
} from "../types";

type Row = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return value == null ? fallback : String(value);
}

function nullableStr(value: unknown): string | null {
  return value == null ? null : String(value);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function variant(value: unknown): ProductVariant | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const size = typeof raw.size === "string" && raw.size ? raw.size : undefined;
  const color = typeof raw.color === "string" && raw.color ? raw.color : undefined;
  return size || color ? { ...(size ? { size } : {}), ...(color ? { color } : {}) } : undefined;
}

export function normalizeStore(row: Row): Store {
  return {
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name, "Mi comercio"),
    subtitle: str(row.subtitle),
    slogan: str(row.slogan),
    whatsapp: str(row.whatsapp),
    alias: str(row.alias),
    cbu: str(row.cbu),
    titular: str(row.titular),
    settings: normalizeSettings(row.settings),
    active: row.active !== false,
  };
}

export function normalizeCategory(row: Row): Category {
  return {
    id: str(row.id),
    name: str(row.name, "Sin categoría"),
    sort_order: Number(row.sort_order ?? 0),
    ...(row.store_id == null ? {} : { store_id: str(row.store_id) }),
  };
}

/**
 * Las columnas `numeric` de Postgres pueden llegar como string según la versión
 * de PostgREST. Normalizamos todo al tipo `Product` para que la UI nunca reciba
 * datos raros.
 */
export function normalizeProduct(row: Row): Product {
  const images = stringArray(row.images);
  const imageUrl = row.image_url == null ? undefined : String(row.image_url);
  const gallery = images.length > 0 ? images : imageUrl ? [imageUrl] : [];

  return {
    id: str(row.id),
    store_id: str(row.store_id),
    name: str(row.name),
    description: row.description == null ? undefined : String(row.description),
    category_id: str(row.category_id),
    unit_price: Number(row.unit_price ?? 0),
    pricing_type: (row.pricing_type as Product["pricing_type"]) ?? "SIMPLE",
    pricing_tiers: Array.isArray(row.pricing_tiers) ? (row.pricing_tiers as PricingTier[]) : [],
    bundle_size: row.bundle_size == null ? undefined : Number(row.bundle_size),
    bundle_price: row.bundle_price == null ? undefined : Number(row.bundle_price),
    stock: Number(row.stock ?? 0),
    active: Boolean(row.active),
    tags: stringArray(row.tags),
    image_url: gallery[0] ?? imageUrl,
    images: gallery,
    sizes: stringArray(row.sizes),
    colors: stringArray(row.colors),
  };
}

export function normalizeOrder(row: Row): Order {
  return {
    id: str(row.id),
    store_id: str(row.store_id),
    source: (row.source as Order["source"]) ?? "WEB",
    customer_name: nullableStr(row.customer_name),
    customer_phone: nullableStr(row.customer_phone),
    pickup_time: nullableStr(row.pickup_time),
    payment_method: nullableStr(row.payment_method),
    fulfillment_type: row.fulfillment_type === "DELIVERY" ? "DELIVERY" : "PICKUP",
    delivery_address: nullableStr(row.delivery_address),
    notes: nullableStr(row.notes),
    total: Number(row.total ?? 0),
    status: str(row.status),
    created_at: str(row.created_at),
  };
}

export function normalizeOrderItem(raw: unknown): OrderItemRow {
  const item = (raw ?? {}) as Row & {
    products?: { name?: unknown; image_url?: unknown } | null;
  };
  const product = item.products ?? undefined;

  return {
    quantity: Number(item.quantity ?? 0),
    line_total: Number(item.line_total ?? 0),
    product_name: product?.name == null ? "—" : String(product.name),
    image_url: product?.image_url == null ? null : String(product.image_url),
    variant: variant(item.variant),
    note: nullableStr(item.note),
  };
}

export function normalizeOrderWithItems(row: Row): OrderWithItems {
  const items = Array.isArray(row.order_items) ? row.order_items : [];
  return {
    ...normalizeOrder(row),
    items: items.map(normalizeOrderItem),
  };
}
