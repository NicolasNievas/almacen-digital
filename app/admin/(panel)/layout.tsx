import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { STORE } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { getAdminStore, listStores } from "@/lib/supabase/stores";

// El layout lee cookies (sesión de Supabase) = dato dinámico, por lo que
// /admin debe renderizarse a tiempo de request en lugar de prerenderizarse.
export const dynamic = "force-dynamic";

/**
 * Refuerzo server-side: el proxy (`proxy.ts`) ya filtra, pero este layout
 * vuelve a verificar la sesión y el rol admin ANTES de renderizar cualquier
 * vista administrativa. Así /admin queda protegido aunque el proxy falle,
 * se omita o no matchee la ruta.
 */
async function requireAdmin() {
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
}

export default async function PanelLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  // El selector vive en el cliente (lee `?store=`), así que el layout solo
  // entrega las opciones y la marca de respaldo.
  const [stores, defaultStore] = await Promise.all([listStores(), getAdminStore()]);
  const fallbackStore = defaultStore ?? STORE;

  return (
    <div className="flex flex-1 flex-col bg-neutral-50 print:bg-white dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white print:hidden dark:border-neutral-800 dark:bg-neutral-900">
        <AdminHeader stores={stores} fallbackStore={fallbackStore} />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 print:max-w-none print:px-0 print:py-0">{children}</main>
    </div>
  );
}
