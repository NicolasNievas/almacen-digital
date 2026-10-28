import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getAdminRole, listAccessibleStoreSlugs } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

const LOGIN_PATH = "/admin/login";
const NO_ACCESS_PATH = "/admin/login?motivo=sin-acceso";

export type AdminSession = {
  user: User;
  /** `true` para el rol maestro; puede administrar cualquier tienda. */
  isSuperadmin: boolean;
  /** Tiendas activas asignadas en `user_stores` (vacío para superadmin). */
  storeSlugs: string[];
};

/**
 * Carga la sesión y, si el usuario es admin de tienda, sus accesos.
 * Devuelve `null` cuando no hay sesión válida.
 */
async function loadSession(): Promise<{ user: User; storeSlugs: string[] } | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const storeSlugs =
      getAdminRole(data.user) === "admin"
        ? await listAccessibleStoreSlugs(supabase, data.user.id)
        : [];

    return { user: data.user, storeSlugs };
  } catch {
    return null;
  }
}

/**
 * Verifica la sesión y el acceso al panel en el servidor.
 *
 * El `proxy.ts` ya filtra las rutas del panel, pero cada layout vuelve a
 * comprobarlo: así el panel queda protegido aunque el proxy falle, se omita
 * o no matchee una ruta nueva.
 *
 * - Sin sesión o sin rol de panel → `/admin/login`.
 * - `superadmin` → acceso total.
 * - `admin` con `storeSlug` → debe tener un vínculo activo en `user_stores`;
 *   si no, se lo redirige a su propia tienda o al login.
 * - `admin` sin `storeSlug` (panel maestro) → se lo redirige a su tienda.
 */
export async function requireAdmin(storeSlug?: string): Promise<AdminSession> {
  const session = await loadSession();
  if (!session) redirect(LOGIN_PATH);

  const role = getAdminRole(session.user);
  if (role === "none") redirect(LOGIN_PATH);

  if (role === "superadmin") {
    return { user: session.user, isSuperadmin: true, storeSlugs: [] };
  }

  const [ownSlug] = session.storeSlugs;
  if (!ownSlug) redirect(NO_ACCESS_PATH);

  if (!storeSlug || !session.storeSlugs.includes(storeSlug)) {
    redirect(`/${ownSlug}/admin`);
  }

  return { user: session.user, isSuperadmin: false, storeSlugs: session.storeSlugs };
}

/**
 * Protege el panel maestro `/admin`: solo el rol `superadmin`.
 * Un admin de tienda es derivado a su propio panel.
 */
export async function requireSuperadmin(): Promise<AdminSession> {
  const session = await loadSession();
  if (!session) redirect(LOGIN_PATH);

  const role = getAdminRole(session.user);
  if (role === "superadmin") {
    return { user: session.user, isSuperadmin: true, storeSlugs: [] };
  }

  if (role === "admin") {
    const [ownSlug] = session.storeSlugs;
    redirect(ownSlug ? `/${ownSlug}/admin` : NO_ACCESS_PATH);
  }

  redirect(LOGIN_PATH);
}
