"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Package,
  ShoppingCart,
  Tags,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { adminSectionHref } from "@/lib/admin-store";
import type { Store } from "@/lib/types";
import AdminStoreSwitcher from "./AdminStoreSwitcher";
import SignOutButton from "./SignOutButton";

type Props = {
  stores: Store[];
  activeStore: Store;
  isSuperadmin: boolean;
};

export const SIDEBAR_WIDTH = 280;

const NAV = [
  { section: "", label: "Métricas", icon: LayoutDashboard },
  { section: "productos", label: "Productos", icon: Tags },
  { section: "stock", label: "Stock", icon: Package },
  { section: "pos", label: "Punto de venta", icon: ShoppingCart },
  { section: "pedidos", label: "Pedidos", icon: ClipboardList },
];

/**
 * Shell fijo del back-office boutique.
 *
 * Desktop: columna de 280px a la izquierda con identidad, navegación y
 * controles de cuenta. Mobile: barra superior mínima + drawer con el mismo
 * contenido. La navegación activa se marca con una línea de acento y sin
 * píldoras ni sombras.
 */
export default function AdminSidebar({ stores, activeStore, isSuperadmin }: Props) {
  const pathname = usePathname();
  // El drawer guarda la ruta en la que se abrió: al navegar, el pathname
  // cambia y `open` se vuelve false sin un efecto que dispare renders.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const base = adminSectionHref(activeStore.slug);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPath(null);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) setOpenPath(null);
    };

    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onBreakpoint);

    return () => {
      document.body.style.overflow = previous || "unset";
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--admin-line)] bg-[var(--admin-canvas)] px-5 lg:hidden">
        <Link
          href={base}
          className="flex min-w-0 items-baseline gap-2 text-[var(--admin-ink)]"
          aria-label={`${activeStore.name} — Administración`}
        >
          <span className="truncate [font-family:var(--store-font-heading)] text-[22px] leading-none tracking-[-0.01em]">
            {activeStore.name}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[var(--admin-faint)]">
            Admin
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpenPath(pathname)}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-ink)]"
          aria-label="Abrir menú de administración"
          aria-expanded={open}
          aria-controls="admin-sidebar"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={() => setOpenPath(null)}
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[var(--admin-line)] bg-[var(--admin-canvas)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navegación de administración"
      >
        <div className="flex items-start justify-between border-b border-[var(--admin-line)] px-6 py-7">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase leading-none tracking-[0.24em] text-[var(--admin-faint)]">
              Administración
            </p>
            <Link
              href={base}
              className="mt-3 block truncate [font-family:var(--store-font-heading)] text-[28px] font-normal leading-[1.05] tracking-[-0.01em] text-[var(--admin-ink)] transition-opacity duration-200 hover:opacity-70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--admin-ink)]"
            >
              {activeStore.name}
            </Link>
            <p className="mt-2 line-clamp-2 text-[9px] font-medium uppercase leading-4 tracking-[0.14em] text-[var(--admin-muted)]">
              {activeStore.subtitle || "Panel de tienda"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenPath(null)}
            className="-mr-3 inline-flex h-11 w-11 items-center justify-center text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-ink)] lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={19} strokeWidth={1.5} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain py-6" aria-label="Secciones del panel">
          <p className="px-6 text-[9px] font-medium uppercase leading-none tracking-[0.22em] text-[var(--admin-faint)]">
            Panel
          </p>
          <ul className="mt-3">
            {NAV.map((item, index) => {
              const href = adminSectionHref(activeStore.slug, item.section);
              const active = pathname === href;
              const Icon = item.icon;
              return (
                <li key={item.section || "metrics"}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 border-l-2 py-3 pl-5 pr-6 text-[11px] font-medium uppercase leading-none tracking-[0.1em] transition-colors duration-200 motion-reduce:transition-none ${
                      active
                        ? "border-[var(--admin-accent)] bg-[var(--admin-surface)] text-[var(--admin-ink)]"
                        : "border-transparent text-[var(--admin-muted)] hover:border-[var(--admin-line-strong)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-ink)]"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[9px] tabular-nums tracking-[0.08em] text-[var(--admin-faint)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 border-t border-[var(--admin-line)] px-6 pt-6">
            <Link
              href={`/${activeStore.slug}`}
              className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)]"
            >
              Ver tienda
              <ArrowUpRight size={12} strokeWidth={1.5} />
            </Link>
            {isSuperadmin && (
              <Link
                href="/admin"
                className="mt-4 flex items-center gap-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)]"
              >
                <LayoutGrid size={12} strokeWidth={1.5} />
                Todas las tiendas
              </Link>
            )}
          </div>
        </nav>

        <div className="border-t border-[var(--admin-line)] px-6 py-5">
          <p className="text-[9px] font-medium uppercase leading-none tracking-[0.22em] text-[var(--admin-faint)]">
            Tienda activa
          </p>
          <div className="mt-3">
            <AdminStoreSwitcher stores={stores} activeSlug={activeStore.slug} />
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-[var(--admin-line)] pt-4">
            <ThemeToggle className="inline-flex h-9 w-9 items-center justify-center text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-ink)]" />
            <SignOutButton className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)] disabled:opacity-50" />
          </div>
        </div>
      </aside>
    </>
  );
}
