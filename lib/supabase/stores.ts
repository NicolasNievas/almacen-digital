import { cache } from "react";
import { normalizeStore } from "./mappers";
import { createPublicClient } from "./public";
import { createClient as createServerSupabaseClient } from "./server";
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

/**
 * Tiendas activas asignadas a un usuario en `user_stores`.
 *
 * Usa el cliente con cookies porque la RLS de `user_stores` exige sesión.
 * Un admin de tienda solo debe ver las tiendas que realmente administra.
 */
export const listUserStores = cache(async (userId: string): Promise<Store[]> => {
  if (!userId) return [];

  const supabase = await createServerSupabaseClient();

  const { data: links, error: linksError } = await supabase
    .from("user_stores")
    .select("store_id")
    .eq("user_id", userId)
    .eq("active", true);

  if (linksError) {
    console.error("No se pudieron leer los accesos del usuario:", linksError.message);
    return [];
  }

  const storeIds = [
    ...new Set(
      ((links ?? []) as { store_id: string | null }[])
        .map((link) => link.store_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (storeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("stores")
    .select(STORE_COLUMNS)
    .in("id", storeIds)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("No se pudieron cargar las tiendas del usuario:", error.message);
    return [];
  }
  return (data ?? []).map((row) => normalizeStore(row as Record<string, unknown>));
});
