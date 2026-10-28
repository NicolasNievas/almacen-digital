import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Roles reconocidos por el panel. `none` = autenticado sin rol de panel. */
export type AdminRole = "superadmin" | "admin" | "none";

/**
 * Lee el rol desde `app_metadata` (lo escribe solo el servidor, así que el
 * cliente no puede escalar privilegios). Cualquier otro valor se ignora.
 */
export function getAdminRole(user: User | null | undefined): AdminRole {
  const role = user?.app_metadata?.role;
  if (role === "superadmin") return "superadmin";
  if (role === "admin") return "admin";
  return "none";
}

export function isSuperadmin(user: User | null | undefined): boolean {
  return getAdminRole(user) === "superadmin";
}

export function isStoreAdmin(user: User | null | undefined): boolean {
  return getAdminRole(user) === "admin";
}

/**
 * Slugs de las tiendas activas a las que el usuario tiene acceso según
 * `user_stores`. Se usa tanto en el proxy como en los helpers de servidor.
 *
 * Recibe el cliente por parámetro para no acoplar este módulo a
 * `next/headers` (el proxy también lo importa).
 */
export async function listAccessibleStoreSlugs(
  client: SupabaseClient,
  userId: string,
): Promise<string[]> {
  if (!userId) return [];

  const { data: links, error: linksError } = await client
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

  const { data: stores, error: storesError } = await client
    .from("stores")
    .select("slug")
    .in("id", storeIds)
    .eq("active", true)
    .order("name", { ascending: true });

  if (storesError) {
    console.error("No se pudieron resolver las tiendas del usuario:", storesError.message);
    return [];
  }

  return ((stores ?? []) as { slug: string }[])
    .map((store) => store.slug)
    .filter((slug): slug is string => Boolean(slug));
}
