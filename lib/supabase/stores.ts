import { cache } from "react";
import { normalizeStore } from "./mappers";
import { createPublicClient } from "./public";
import { DEFAULT_ADMIN_STORE_SLUG } from "../store";
import type { Store } from "../types";

/**
 * Lecturas de tienda para Server Components. `cache()` deduplica la consulta
 * entre layout y page dentro del mismo request.
 */
export const getStoreBySlug = cache(async (slug: string): Promise<Store | null> => {
  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, slug, name, subtitle, slogan, whatsapp, alias, cbu, titular, settings, active",
    )
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("No se pudo cargar la tienda:", error.message);
    return null;
  }
  return data ? normalizeStore(data as Record<string, unknown>) : null;
});

/** Tienda que gestiona el panel admin (definida por entorno o la primera activa). */
export const getAdminStore = cache(async (): Promise<Store | null> => {
  const configured = await getStoreBySlug(DEFAULT_ADMIN_STORE_SLUG);
  if (configured) return configured;

  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, slug, name, subtitle, slogan, whatsapp, alias, cbu, titular, settings, active",
    )
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("No se pudo cargar la tienda admin:", error.message);
    return null;
  }
  return data ? normalizeStore(data as Record<string, unknown>) : null;
});

/** Listado público de tiendas activas (útil para landings o directorios). */
export const listStores = cache(async (): Promise<Store[]> => {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, slug, name, subtitle, slogan, whatsapp, alias, cbu, titular, settings, active",
    )
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("No se pudieron listar las tiendas:", error.message);
    return [];
  }
  return (data ?? []).map((row) => normalizeStore(row as Record<string, unknown>));
});
