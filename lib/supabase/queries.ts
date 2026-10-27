import { createClient } from "./client";
import { normalizeCategory, normalizeOrder, normalizeOrderWithItems, normalizeProduct, normalizeStore } from "./mappers";
import { DEFAULT_ADMIN_STORE_SLUG } from "../store";
import type { Category, Order, OrderWithItems, Product, ProductInput, Store } from "../types";

/** Tienda pública por slug (para Client Components). */
export async function fetchStoreBySlug(slug: string): Promise<Store | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug, name, subtitle, slogan, whatsapp, alias, cbu, titular, settings, active")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeStore(data as Record<string, unknown>) : null;
}

/**
 * Tienda gestionada por el panel admin. Usa `NEXT_PUBLIC_ADMIN_STORE_SLUG`
 * (por defecto `ag-mayorista`) y cae a la primera tienda activa.
 */
export async function fetchAdminStore(): Promise<Store> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, slug, name, subtitle, slogan, whatsapp, alias, cbu, titular, settings, active")
    .eq("slug", DEFAULT_ADMIN_STORE_SLUG)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  if (data) return normalizeStore(data as Record<string, unknown>);

  const fallback = await supabase
    .from("stores")
    .select("id, slug, name, subtitle, slogan, whatsapp, alias, cbu, titular, settings, active")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallback.error) throw fallback.error;
  if (!fallback.data) {
    throw new Error(
      "No hay tiendas activas. Ejecutá supabase/006_multitenant_saas.sql en Supabase.",
    );
  }
  return normalizeStore(fallback.data as Record<string, unknown>);
}

/** Catálogo público de una tienda: solo categorías y productos activos. */
export async function fetchCatalog(
  storeId: string,
): Promise<{ categories: Category[]; products: Product[] }> {
  const supabase = createClient();
  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, sort_order, store_id")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (productsRes.error) throw productsRes.error;

  return {
    categories: (categoriesRes.data ?? []).map((c) => normalizeCategory(c as Record<string, unknown>)),
    products: (productsRes.data ?? []).map((p) => normalizeProduct(p as Record<string, unknown>)),
  };
}

/** Categorías públicas de una tienda. */
export async function fetchCategories(storeId: string): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, sort_order, store_id")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => normalizeCategory(c as Record<string, unknown>));
}

/** Todos los productos de la tienda (incluye pausados). Requiere admin por RLS. */
export async function fetchProducts(storeId: string): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => normalizeProduct(p as Record<string, unknown>));
}

/** Todas las categorías con su orden (para el panel). */
export async function fetchAllCategories(storeId: string): Promise<Category[]> {
  return fetchCategories(storeId);
}

/** Crea un producto dentro de la tienda. Requiere sesión admin por RLS. */
export async function createProduct(input: ProductInput, storeId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .insert({ ...input, store_id: storeId });
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

/** Crea o actualiza una categoría (id = slug dentro de la tienda). */
export async function saveCategory(category: Category, storeId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("categories").upsert(
    {
      id: category.id,
      name: category.name,
      sort_order: category.sort_order ?? 0,
      store_id: storeId,
    },
    { onConflict: "store_id,id" },
  );
  if (error) throw error;
}

/** Pedidos/ventas recientes de la tienda. Requiere sesión admin por RLS. */
export async function fetchOrders(storeId: string): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, store_id, source, customer_name, customer_phone, pickup_time, payment_method, fulfillment_type, delivery_address, notes, total, status, created_at",
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((o) => normalizeOrder(o as Record<string, unknown>));
}

/** Pedidos con su detalle de items (para el panel de pedidos). */
export async function fetchOrdersWithItems(storeId: string): Promise<OrderWithItems[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, store_id, source, customer_name, customer_phone, pickup_time, payment_method, fulfillment_type, delivery_address, notes, total, status, created_at, order_items(quantity, line_total, variant, note, products(name, image_url))",
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeOrderWithItems(row as Record<string, unknown>));
}
