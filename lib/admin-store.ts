import { DEFAULT_ADMIN_STORE_SLUG } from "./store";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Valida el formato de un slug de tienda. */
export function isStoreSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_PATTERN.test(value);
}

/**
 * Resuelve un slug de tienda y cae al default de entorno
 * (`NEXT_PUBLIC_ADMIN_STORE_SLUG`, por defecto `ag-mayorista`).
 */
export function resolveAdminStoreSlug(value?: string | string[] | null): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const slug = raw?.trim().toLowerCase() ?? "";
  return SLUG_PATTERN.test(slug) ? slug : DEFAULT_ADMIN_STORE_SLUG;
}

/**
 * URL canónica del panel de una tienda: `/{storeSlug}/admin{section}`.
 * `section` puede venir con o sin barra inicial (`productos`, `/productos`).
 */
export function adminSectionHref(storeSlug: string, section = ""): string {
  if (!section) return `/${storeSlug}/admin`;
  return `/${storeSlug}/admin${section.startsWith("/") ? section : `/${section}`}`;
}

/**
 * Conserva la subruta activa al cambiar de tienda:
 * `/ag-mayorista/admin/productos` + `aura-studio` → `/aura-studio/admin/productos`.
 */
export function buildStoreAdminHref(pathname: string, storeSlug: string): string {
  // Se buscan los segmentos reales (no un indexOf) para que un slug como
  // `admin-store` no se confunda con el segmento `admin`.
  const segments = pathname.split("/").filter(Boolean);
  const adminIndex = segments.indexOf("admin");
  const suffix =
    adminIndex >= 0 ? `/${segments.slice(adminIndex).join("/")}` : "/admin";
  return `/${storeSlug}${suffix}`;
}
