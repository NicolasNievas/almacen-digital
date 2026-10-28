import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { requireAdmin } from "@/lib/auth";
import { getStoreBySlug, listStores, listUserStores } from "@/lib/supabase/stores";

// El layout lee cookies (sesión de Supabase) = dato dinámico, por lo que el
// panel debe renderizarse a tiempo de request en lugar de prerenderizarse.
export const dynamic = "force-dynamic";

/**
 * Panel de una tienda concreta: `/[storeSlug]/admin/...`.
 *
 * La tienda sale del segmento dinámico, no de una variable de entorno, así que
 * cada URL del panel queda atada a su tenant y el selector solo reemplaza el
 * slug del path.
 *
 * `requireAdmin(storeSlug)` valida el vínculo en `user_stores`: un admin de
 * tienda no puede abrir el panel de otra tienda ni cambiando la URL.
 */
export default async function StoreAdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const session = await requireAdmin(storeSlug);

  const [store, stores] = await Promise.all([
    getStoreBySlug(storeSlug),
    session.isSuperadmin ? listStores() : listUserStores(session.user.id),
  ]);

  if (!store) notFound();

  return (
    <div className="flex flex-1 flex-col bg-neutral-50 print:bg-white dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white print:hidden dark:border-neutral-800 dark:bg-neutral-900">
        <AdminHeader
          stores={stores}
          activeStore={store}
          isSuperadmin={session.isSuperadmin}
        />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 print:max-w-none print:px-0 print:py-0">{children}</main>
    </div>
  );
}
