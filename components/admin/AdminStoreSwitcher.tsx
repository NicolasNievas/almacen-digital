"use client";

import { ChevronDown, Store as StoreIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { buildStoreAdminHref } from "@/lib/admin-store";
import type { Store } from "@/lib/types";

type Props = {
  /** Tiendas que el usuario puede administrar (ya filtradas en el servidor). */
  stores: Store[];
  activeSlug: string;
};

/**
 * Selector de tienda del panel. Cambia el slug de la URL conservando la
 * subruta activa: `/ag-mayorista/admin/pos` → `/aura-studio/admin/pos`.
 *
 * Si el usuario administra una sola tienda, se muestra como etiqueta fija:
 * no hay nada que cambiar y el desplegable solo confundiría.
 */
export default function AdminStoreSwitcher({ stores, activeSlug }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  if (stores.length === 0) return null;

  if (stores.length === 1) {
    const onlyStore = stores[0];
    return (
      <span
        className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        title="Única tienda asignada"
      >
        <StoreIcon size={15} className="text-neutral-400 dark:text-neutral-500" />
        {onlyStore.name}
      </span>
    );
  }

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
        aria-label="Cambiar de tienda"
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
