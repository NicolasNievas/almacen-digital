"use client";

import Link from "next/link";
import { LayoutGrid, Store as StoreIcon } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AdminNav from "./AdminNav";
import AdminStoreSwitcher from "./AdminStoreSwitcher";
import SignOutButton from "./SignOutButton";
import { adminSectionHref } from "@/lib/admin-store";
import type { Store } from "@/lib/types";

type Props = {
  stores: Store[];
  activeStore: Store;
};

/**
 * Header del panel de una tienda. La tienda activa llega resuelta desde el
 * layout server-side (`/[storeSlug]/admin`), así no hay estado duplicado.
 */
export default function AdminHeader({ stores, activeStore }: Props) {
  return (
    <>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href={adminSectionHref(activeStore.slug)} className="flex items-center gap-2.5">
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
            href="/admin"
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            title="Volver al panel maestro"
          >
            <LayoutGrid size={14} /> Tiendas
          </Link>
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
