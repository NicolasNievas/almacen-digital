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
        className="flex items-center gap-2 py-1 text-[12px] font-medium leading-none text-[var(--admin-ink)]"
        title="Única tienda asignada"
      >
        <StoreIcon size={14} strokeWidth={1.5} className="text-[var(--admin-muted)]" />
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
        size={14}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-0 text-[var(--admin-muted)]"
      />
      <span className="sr-only">Tienda activa</span>
      <select
        value={activeSlug}
        onChange={(event) => handleChange(event.target.value)}
        title="Cambiar de tienda"
        aria-label="Cambiar de tienda"
        className="w-full appearance-none rounded-none border-0 border-b border-[var(--admin-line-strong)] bg-transparent py-1.5 pl-6 pr-7 text-[12px] font-medium leading-none text-[var(--admin-ink)] outline-none transition-colors focus:border-[var(--admin-ink)]"
      >
        {stores.map((store) => (
          <option key={store.id} value={store.slug}>
            {store.name}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        strokeWidth={1.5}
        className="pointer-events-none absolute right-0 text-[var(--admin-muted)]"
      />
    </label>
  );
}
