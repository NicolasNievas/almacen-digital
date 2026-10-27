"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Store as StoreIcon } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AdminNav from "./AdminNav";
import AdminStoreSwitcher from "./AdminStoreSwitcher";
import SignOutButton from "./SignOutButton";
import { ADMIN_STORE_PARAM, buildAdminHref, resolveAdminStoreSlug } from "@/lib/admin-store";
import type { Store } from "@/lib/types";

type Props = {
  stores: Store[];
  fallbackStore: Store;
};

/**
 * Header del panel: resuelve la tienda activa desde `?store=`, expone el
 * selector y propaga el slug a la navegación interna.
 */
export default function AdminHeader({ stores, fallbackStore }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedParam = searchParams.get(ADMIN_STORE_PARAM);
  const requestedSlug = resolveAdminStoreSlug(requestedParam);
  const activeStore = stores.find((store) => store.slug === requestedSlug) ?? stores[0] ?? fallbackStore;

  // Si la URL trae un slug que ya no existe (tienda pausada o borrada),
  // se reemplaza por la tienda realmente activa para no dejar un enlace roto.
  useEffect(() => {
    if (!requestedParam || requestedParam === activeStore.slug) return;
    router.replace(buildAdminHref(pathname, activeStore.slug, searchParams.toString()));
  }, [activeStore.slug, pathname, requestedParam, router, searchParams]);

  return (
    <>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={buildAdminHref("/admin", activeStore.slug)} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-solid text-white">
              <StoreIcon size={16} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-bold text-brand">{activeStore.name}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {activeStore.subtitle || "Panel de administración"}
              </span>
            </span>
          </Link>
          <AdminStoreSwitcher stores={stores} activeSlug={activeStore.slug} />
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href={`/${activeStore.slug}`}
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            Ver tienda
          </Link>
          <SignOutButton />
        </div>
      </div>
      <AdminNav storeSlug={activeStore.slug} />
    </>
  );
}
