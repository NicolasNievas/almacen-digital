import { createClient } from "./client";
import type { Category, Order, OrderWithItems, PricingTier, Product, ProductInput } from "../types";

/**
 * Las columnas `numeric` de Postgres pueden llegar como string según la versión
 * de PostgREST, y la tabla real no tiene la columna `tags` del JSON de Fase 1.
 * Normalizamos todo al tipo `Product` para que la UI nunca reciba datos raros.
 */
function normalizeProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    category_id: String(row.category_id ?? ""),
    unit_price: Number(row.unit_price ?? 0),
    pricing_type: (row.pricing_type as Product["pricing_type"]) ?? "SIMPLE",
    pricing_tiers: Array.isArray(row.pricing_tiers) ? (row.pricing_tiers as PricingTier[]) : [],
    bundle_size: row.bundle_size == null ? undefined : Number(row.bundle_size),
    bundle_price: row.bundle_price == null ? undefined : Number(row.bundle_price),
    stock: Number(row.stock ?? 0),
    active: Boolean(row.active),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    image_url: row.image_url == null ? undefined : String(row.image_url),
  };
}

/** Catálogo público: solo categorías y productos activos. */
export async function fetchCatalog(): Promise<{ categories: Category[]; products: Product[] }> {
  const supabase = createClient();
  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (productsRes.error) throw productsRes.error;

  const categories = (categoriesRes.data ?? []).map((c) => ({
    id: String(c.id),
    name: String(c.name),
  })) as Category[];

  return {
    categories,
    products: (productsRes.data ?? []).map(normalizeProduct),
  };
}

/** Todos los productos (incluye pausados). Requiere sesión admin por RLS. */
export async function fetchProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeProduct);
}

/** Todas las categorías con su orden (para el panel). */
export async function fetchAllCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: String(c.id),
    name: String(c.name),
    sort_order: Number(c.sort_order ?? 0),
  }));
}

/** Crea un producto. Requiere sesión admin por RLS. */
export async function createProduct(input: ProductInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").insert(input);
  if (error) throw error;
}

/** Actualiza un producto. Requiere sesión admin por RLS. */
export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) throw error;
}

/** Elimina un producto. Falla si tiene ventas asociadas (usar pausar). */
export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

/** Crea o actualiza una categoría (id = slug). */
export async function saveCategory(category: Category): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .upsert({ id: category.id, name: category.name, sort_order: category.sort_order ?? 0 });
  if (error) throw error;
}

function normalizeOrder(o: Record<string, unknown>): Order {
  return {
    id: String(o.id),
    source: (o.source as Order["source"]) ?? "WEB",
    customer_name: o.customer_name == null ? null : String(o.customer_name),
    pickup_time: o.pickup_time == null ? null : String(o.pickup_time),
    payment_method: o.payment_method == null ? null : String(o.payment_method),
    total: Number(o.total ?? 0),
    status: String(o.status ?? ""),
    created_at: String(o.created_at),
  };
}

/** Pedidos/ventas recientes (WEB y POS). Requiere sesión admin por RLS. */
export async function fetchOrders(): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, source, customer_name, pickup_time, payment_method, total, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeOrder);
}

/** Pedidos con su detalle de items (para el panel de pedidos). */
export async function fetchOrdersWithItems(): Promise<OrderWithItems[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, source, customer_name, pickup_time, payment_method, total, status, created_at, order_items(quantity, line_total, products(name))",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown> & { order_items?: unknown[] };
    return {
      ...normalizeOrder(r),
      items: (r.order_items ?? []).map((raw) => {
        const it = raw as { quantity?: unknown; line_total?: unknown; products?: { name?: unknown } | null };
        return {
          quantity: Number(it.quantity ?? 0),
          line_total: Number(it.line_total ?? 0),
          product_name: it.products?.name == null ? "—" : String(it.products.name),
        };
      }),
    };
  });
}
