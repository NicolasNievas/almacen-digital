import { DEFAULT_ADMIN_STORE_SLUG } from "./store";

/**
 * Query param que identifica la tienda activa en todas las rutas del panel.
 * Ej: `/admin/productos?store=aura-studio`.
 */
export const ADMIN_STORE_PARAM = "store";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Resuelve el slug de tienda a partir del query param `store`.
 * Si viene vacío o con un formato inválido se usa el default de entorno
 * (`NEXT_PUBLIC_ADMIN_STORE_SLUG`, por defecto `ag-mayorista`).
 */
export function resolveAdminStoreSlug(value: string | string[] | null | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const slug = raw?.trim().toLowerCase() ?? "";
  return SLUG_PATTERN.test(slug) ? slug : DEFAULT_ADMIN_STORE_SLUG;
}

/**
 * Construye una URL del panel preservando el resto de la query string.
 * Se usa para la navegación entre secciones y para el selector de tiendas.
 */
export function buildAdminHref(pathname: string, storeSlug: string, search?: string): string {
  const params = new URLSearchParams(search ?? "");
  params.set(ADMIN_STORE_PARAM, storeSlug);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
