import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifica la sesión y el rol admin en el servidor.
 *
 * El `proxy.ts` ya filtra las rutas del panel, pero cada layout vuelve a
 * comprobarlo: así el panel queda protegido aunque el proxy falle, se omita
 * o no matchee una ruta nueva.
 *
 * Redirige a `/admin/login` y corta la ejecución si no hay sesión válida.
 */
export async function requireAdmin(): Promise<User> {
  let authUser: User | null = null;
  let failed = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) failed = true;
    authUser = data.user;
  } catch {
    failed = true;
  }

  if (failed || !authUser || authUser.app_metadata?.role !== "admin") {
    redirect("/admin/login");
  }

  return authUser;
}
