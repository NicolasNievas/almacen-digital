"use client";

import { ChevronDown, Store as StoreIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { buildStoreAdminHref } from "@/lib/admin-store";
import type { Store } from "@/lib/types";

type Props = {
  stores: Store[];
  activeSlug: string;
};

/**
 * Selector de tienda del panel. Cambia el slug de la URL conservando la
 * subruta activa: `/ag-mayorista/admin/pos` → `/aura-studio/admin/pos`.
 */
export default function AdminStoreSwitcher({ stores, activeSlug }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  if (stores.length === 0) return null;

  const handleChange = (slug: string) => {
    if (slug === activeSlug) return;
    router.push(buildStoreAdminHref(pathname, slug));
  };

  return (
    <label className="relative flex items-center">
      <StoreIcon
        size={15}
        className="pointer-events-none absolute left-2.5 text-neutral-400 dark:text-neutral-500"
      />
      <span className="sr-only">Tienda activa</span>
      <select
        value={activeSlug}
        onChange={(event) => handleChange(event.target.value)}
        title="Cambiar de tienda"
        className="appearance-none rounded-lg border border-neutral-300 bg-white py-1.5 pl-8 pr-8 text-sm font-medium text-neutral-800 outline-none transition-colors hover:border-neutral-400 focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-600"
      >
        {stores.map((store) => (
          <option key={store.id} value={store.slug}>
            {store.name}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 text-neutral-400 dark:text-neutral-500"
      />
    </label>
  );
}
