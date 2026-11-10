import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import StoreThemeScope from "@/components/store/StoreThemeScope";
import { requireAdmin } from "@/lib/auth";
import { adminThemeForLayout } from "@/lib/store-design";
import { getStoreBySlug, listStores, listUserStores } from "@/lib/supabase/stores";

// El layout lee cookies (sesión de Supabase) = dato dinámico, por lo que el
// panel debe renderizarse a tiempo de request en lugar de prerenderizarse.
export const dynamic = "force-dynamic";

/**
 * Título propio del panel: evita que el back-office herede el título de la
 * landing y que los buscadores indexen rutas con sesión.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  return {
    title: store ? `${store.name} · Panel` : "Panel de administración",
    robots: { index: false, follow: false },
  };
}

/**
 * Panel de una tienda concreta: `/[storeSlug]/admin/...`.
 *
 * La tienda sale del segmento dinámico, no de una variable de entorno, así que
 * cada URL del panel queda atada a su tenant y el selector solo reemplaza el
 * slug del path.
 *
 * `requireAdmin(storeSlug)` valida el vínculo en `user_stores`: un admin de
 * tienda no puede abrir el panel de otra tienda ni cambiando la URL.
 *
 * El shell respeta `settings.design.admin_layout`: la experiencia boutique
 * usa sidebar fija; los tenants retail conservan su navbar superior.
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

  const fixedSidebar = store.settings.design.admin_layout === "sidebar-fixed";
  const adminTheme = adminThemeForLayout(store.settings.design.storefront_layout);

  return (
    <StoreThemeScope store={store} className="flex flex-1 flex-col">
      <div
        data-admin
        data-admin-theme={adminTheme}
        className="flex min-h-screen flex-col bg-[var(--admin-canvas)] text-[var(--admin-ink)] print:min-h-0 print:bg-white"
      >
        {fixedSidebar ? (
          <>
            <AdminSidebar
              stores={stores}
              activeStore={store}
              isSuperadmin={session.isSuperadmin}
            />
            <main className="flex-1 lg:pl-72 print:pl-0">
              <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-8 lg:px-12 lg:py-12 print:max-w-none print:px-0 print:py-0">
                {children}
              </div>
            </main>
          </>
        ) : (
          <>
            <header className="border-b border-neutral-200 bg-white print:hidden dark:border-neutral-800 dark:bg-neutral-900">
              <AdminHeader
                stores={stores}
                activeStore={store}
                isSuperadmin={session.isSuperadmin}
              />
            </header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 print:max-w-none print:px-0 print:py-0">
              {children}
            </main>
          </>
        )}
      </div>
    </StoreThemeScope>
  );
}
