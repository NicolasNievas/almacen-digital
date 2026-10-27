import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ExternalLink, LayoutGrid, Store as StoreIcon } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import SignOutButton from "@/components/admin/SignOutButton";
import { requireAdmin } from "@/lib/auth";
import { adminSectionHref, resolveAdminStoreSlug } from "@/lib/admin-store";
import { BUSINESS_TYPE_LABELS } from "@/lib/store-settings";
import { listStores } from "@/lib/supabase/stores";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel maestro · Nexo Commerce",
  description: "Seleccioná la tienda que querés administrar.",
};

/**
 * Vista SuperAdmin: lista todas las tiendas activas y deriva al panel de la
 * tienda elegida (`/[storeSlug]/admin`).
 *
 * - `/admin` → listado de tiendas.
 * - `/admin?store=aura-studio` → redirección a `/aura-studio/admin`.
 * - Sin selección, se destaca la tienda por defecto
 *   (`NEXT_PUBLIC_ADMIN_STORE_SLUG`, `ag-mayorista` si no está definida).
 */
export default async function MasterAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  await requireAdmin();

  const { store: requested } = await searchParams;
  const stores = await listStores();

  const requestedSlug = requested?.trim().toLowerCase();
  const requestedStore = requestedSlug
    ? stores.find((store) => store.slug === requestedSlug)
    : undefined;

  if (requestedStore) redirect(adminSectionHref(requestedStore.slug));

  const defaultStore =
    stores.find((store) => store.slug === resolveAdminStoreSlug()) ?? stores[0] ?? null;

  return (
    <div className="flex flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-solid text-white">
              <LayoutGrid size={16} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-bold text-brand">Nexo Commerce</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                SuperAdmin
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
              Panel maestro
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
              Elegí una tienda para administrar su catálogo, stock, punto de venta y pedidos. Cada
              panel vive en su propia URL: <code className="text-xs">/[tienda]/admin</code>.
            </p>
          </div>
          {defaultStore && (
            <Link
              href={adminSectionHref(defaultStore.slug)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent"
            >
              Ir a {defaultStore.name}
              <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {requestedSlug && !requestedStore && (
          <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            No encontramos una tienda activa con el slug <b>{requestedSlug}</b>. Elegí una de la
            lista.
          </p>
        )}

        {stores.length === 0 ? (
          <p className="mt-8 rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            No hay tiendas activas todavía. Ejecutá{" "}
            <code className="text-xs">supabase/006_multitenant_saas.sql</code> en Supabase para
            crear las demos.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {stores.map((store) => {
              const { settings } = store;
              const isDefault = store.slug === defaultStore?.slug;

              return (
                <li
                  key={store.id}
                  className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-brand dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-neutral-900 dark:text-neutral-100">
                          {store.name}
                        </p>
                        <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                          {store.subtitle || BUSINESS_TYPE_LABELS[settings.business_type]}
                        </p>
                      </div>
                      {isDefault && (
                        <span className="shrink-0 rounded-full bg-brand-solid/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                          Por defecto
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                      <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                        {BUSINESS_TYPE_LABELS[settings.business_type]}
                      </span>
                      <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                        {settings.checkout_type === "WHATSAPP" ? "WhatsApp" : "Mercado Pago"}
                      </span>
                      <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                        /{store.slug}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link
                      href={adminSectionHref(store.slug)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-solid px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-accent"
                    >
                      <StoreIcon size={15} /> Administrar
                    </Link>
                    <Link
                      href={`/${store.slug}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    >
                      Ver tienda <ExternalLink size={13} />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
