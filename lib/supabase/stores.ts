import { cache } from "react";
import { normalizeStore } from "./mappers";
import { createPublicClient } from "./public";
import { resolveAdminStoreSlug } from "../admin-store";
import type { Store } from "../types";

const STORE_COLUMNS =
  "id, slug, name, subtitle, slogan, whatsapp, alias, cbu, titular, settings, active";

/**
 * Lecturas de tienda para Server Components. `cache()` deduplica la consulta
 * entre layout y page dentro del mismo request.
 */
export const getStoreBySlug = cache(async (slug: string): Promise<Store | null> => {
  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("stores")
    .select(STORE_COLUMNS)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("No se pudo cargar la tienda:", error.message);
    return null;
  }
  return data ? normalizeStore(data as Record<string, unknown>) : null;
});

/**
 * Tienda que gestiona el panel admin. La fuente principal es el query param
 * `?store=`; si no llega, se usa `NEXT_PUBLIC_ADMIN_STORE_SLUG` y por último la
 * primera tienda activa.
 */
export const getAdminStore = cache(async (slug?: string): Promise<Store | null> => {
  const preferred = await getStoreBySlug(resolveAdminStoreSlug(slug));
  if (preferred) return preferred;

  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("stores")
    .select(STORE_COLUMNS)
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("No se pudo cargar la tienda admin:", error.message);
    return null;
  }
  return data ? normalizeStore(data as Record<string, unknown>) : null;
});

/** Listado público de tiendas activas (selector del panel, landings, directorios). */
export const listStores = cache(async (): Promise<Store[]> => {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("stores")
    .select(STORE_COLUMNS)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("No se pudieron listar las tiendas:", error.message);
    return [];
  }
  return (data ?? []).map((row) => normalizeStore(row as Record<string, unknown>));
});
