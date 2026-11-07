"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import {
  CART_COUNT_EVENT,
  CATEGORY_EVENT,
  OPEN_CART_EVENT,
  SEARCH_EVENT,
  type CartCountDetail,
  type CategorySelection,
  type SearchSelection,
} from "@/lib/store-events";
import type { Category, Store } from "@/lib/types";

type Props = {
  store: Store;
  categories: Category[];
  tagsByCategory: Record<string, string[]>;
};

const MAX_DESKTOP_CATEGORIES = 3;
const MAX_TAGS = 6;

const ICON_BUTTON =
  "inline-flex h-11 w-11 items-center justify-center text-[var(--store-ink)] transition-opacity duration-300 hover:opacity-60 active:opacity-40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-ink)] motion-reduce:transition-none";

function desktopLinkClass(active: boolean) {
  return [
    "relative inline-block whitespace-nowrap [font-family:var(--store-font-body)] text-[13px] font-medium uppercase leading-none tracking-[0.05em]",
    "text-[var(--store-ink)] transition-opacity duration-300 hover:opacity-60 active:opacity-40",
    "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-ink)]",
    "after:absolute after:-bottom-2 after:left-0 after:h-px after:w-full after:origin-left after:bg-[var(--store-ink)]",
    "after:transition-transform after:duration-300 after:ease-out motion-reduce:transition-none motion-reduce:after:transition-none",
    active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
  ].join(" ");
}

const DROPDOWN_PANEL =
  "min-w-44 border-t border-[var(--store-divider)] bg-[var(--store-background)] py-2";

const DROPDOWN_ITEM =
  "block w-full px-3 py-2 text-left [font-family:var(--store-font-body)] text-[12px] font-normal leading-none tracking-[0.04em] text-[var(--store-ink-muted)] transition-colors duration-200 hover:text-[var(--store-ink)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--store-ink)] motion-reduce:transition-none";

/**
 * Navegación editorial del storefront boutique.
 *
 * Client Component por tres motivos estrictos:
 *   1. Menú móvil a pantalla completa (estado + scroll lock).
 *   2. Búsqueda y filtros: el catálogo es dueño de los productos, así que
 *      la navbar emite eventos en lugar de duplicar el estado.
 *   3. Badge del carrito sincronizado por evento.
 *
 * Las categorías y sus etiquetas llegan desde el Server Component del
 * layout: ya están en el HTML inicial y no hay salto de layout.
 */
export default function BoutiqueNavbar({ store, categories, tagsByCategory }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("todas");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const base = `/${store.slug}`;
  const whatsapp = store.whatsapp.replace(/\D/g, "");
  const navItems: Category[] = [{ id: "todas", name: "Todas" }, ...categories];
  const desktopItems = navItems.slice(0, MAX_DESKTOP_CATEGORIES);
  const overflowItems = navItems.slice(MAX_DESKTOP_CATEGORIES);

  /* ------------------------------- carrito ------------------------------- */

  const openCart = () => {
    setMenuOpen(false);
    setSearchOpen(false);
    window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT));
  };

  useEffect(() => {
    const onCount = (event: Event) => {
      const detail = (event as CustomEvent<CartCountDetail>).detail;
      setCartCount(typeof detail?.count === "number" ? detail.count : 0);
    };
    window.addEventListener(CART_COUNT_EVENT, onCount);
    return () => window.removeEventListener(CART_COUNT_EVENT, onCount);
  }, []);

  /* ------------------------------- búsqueda ------------------------------ */

  const applyQuery = useCallback((value: string) => {
    window.dispatchEvent(
      new CustomEvent<SearchSelection>(SEARCH_EVENT, { detail: { query: value } }),
    );
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = window.setTimeout(() => applyQuery(query), 180);
    return () => window.clearTimeout(timer);
  }, [applyQuery, query, searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  /* ------------------------------ categorías ----------------------------- */

  const scrollToCatalog = useCallback(() => {
    const target = document.getElementById("catalogo");
    if (!target) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, []);

  const selectCategory = useCallback(
    (categoryId: string, tag?: string) => {
      setActiveCategory(categoryId);
      setActiveTag(tag ?? null);
      setQuery("");
      setMenuOpen(false);
      setSearchOpen(false);
      setExpandedMobile(null);

      window.dispatchEvent(
        new CustomEvent<CategorySelection>(CATEGORY_EVENT, {
          detail: { categoryId, ...(tag ? { tag } : {}) },
        }),
      );

      // El menú móvil bloquea el scroll del documento: lo liberamos antes de
      // desplazarnos, si no `scrollIntoView` no tiene efecto.
      document.body.style.overflow = "";
      scrollToCatalog();
    },
    [scrollToCatalog],
  );

  const clearSearch = () => {
    setQuery("");
    applyQuery("");
    searchInputRef.current?.focus();
  };

  /* ----------------------------- menú móvil ------------------------------ */

  useEffect(() => {
    if (!menuOpen) return;

    closeButtonRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    // Si el viewport crece al breakpoint desktop con el menú abierto, cerramos
    // el estado para no dejar el scroll de la página bloqueado.
    const desktop = window.matchMedia("(min-width: 1280px)");
    const onBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [menuOpen]);

  return (
    <header className="relative z-40 w-full bg-transparent">
      <div className="grid h-20 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-6 md:px-10 xl:px-12">
        <nav aria-label="Categorías" className="hidden min-w-0 items-center gap-6 xl:flex xl:gap-8">
          {desktopItems.map((item) => {
            const tags = (tagsByCategory[item.id] ?? []).slice(0, MAX_TAGS);
            const isActive = activeCategory === item.id;
            return (
              <div key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => selectCategory(item.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={desktopLinkClass(isActive)}
                >
                  {item.name}
                </button>

                {tags.length > 0 && (
                  <div className="pointer-events-none absolute left-0 top-full z-50 pt-5 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 motion-reduce:transition-none">
                    <div className={DROPDOWN_PANEL}>
                      {tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => selectCategory(item.id, tag)}
                          className={`${DROPDOWN_ITEM}${
                            isActive && activeTag === tag ? " text-[var(--store-ink)]" : ""
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {overflowItems.length > 0 && (
            <div className="group relative">
              <button type="button" className={desktopLinkClass(false)} aria-haspopup="true">
                Más
              </button>
              <div className="pointer-events-none absolute left-0 top-full z-50 pt-5 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 motion-reduce:transition-none">
                <div className={DROPDOWN_PANEL}>
                  {overflowItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectCategory(item.id)}
                      className={DROPDOWN_ITEM}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={`${ICON_BUTTON} -ml-2 justify-self-start xl:hidden`}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          aria-controls="boutique-mobile-menu"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>

        <Link
          href={base}
          className="max-w-[62vw] truncate justify-self-center text-center [font-family:var(--store-font-heading)] text-[28px] font-normal leading-[1.15] tracking-[-0.01em] text-[var(--store-ink)] transition-opacity duration-300 hover:opacity-70 active:opacity-50 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-ink)] motion-reduce:transition-none md:text-[40px]"
          aria-label={`${store.name} — Inicio`}
        >
          {store.name}
        </Link>

        <div className="flex items-center justify-end gap-1 md:gap-3">
          <button
            type="button"
            onClick={() => {
              setSearchOpen((value) => !value);
              setMenuOpen(false);
            }}
            className={ICON_BUTTON}
            aria-label="Buscar en la colección"
            aria-expanded={searchOpen}
            aria-controls="boutique-search"
            title="Buscar"
          >
            <Search size={19} strokeWidth={1.5} />
          </button>

          <Link
            href={`${base}#contacto`}
            className={`${ICON_BUTTON} hidden sm:inline-flex`}
            aria-label="Contacto y atención al cliente"
            title="Contacto"
          >
            <UserRound size={19} strokeWidth={1.5} />
          </Link>

          <button
            type="button"
            onClick={openCart}
            className={`${ICON_BUTTON} -mr-2`}
            aria-label={
              cartCount > 0
                ? `Abrir carrito, ${cartCount} ${cartCount === 1 ? "pieza" : "piezas"}`
                : "Abrir carrito"
            }
            title="Carrito"
          >
            <span className="relative inline-flex">
              <ShoppingBag size={19} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-1.5 min-w-3 text-center [font-family:var(--store-font-body)] text-[10px] font-medium leading-none tabular-nums text-[var(--store-ink)]">
                  {cartCount}
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div
          id="boutique-search"
          className="absolute inset-x-0 top-full z-50 border-b border-[var(--store-divider)] bg-[var(--store-background)]"
        >
          <div className="flex items-center gap-4 px-6 py-4 md:px-10 xl:px-12">
            <Search
              size={18}
              strokeWidth={1.5}
              className="shrink-0 text-[var(--store-ink-muted)]"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearchOpen(false);
                if (event.key === "Enter") {
                  event.preventDefault();
                  setSearchOpen(false);
                  scrollToCatalog();
                }
              }}
              type="search"
              placeholder="Buscar prendas, categorías o etiquetas"
              aria-label="Buscar en la colección"
              className="h-9 w-full appearance-none bg-transparent [font-family:var(--store-font-body)] text-sm text-[var(--store-ink)] outline-none placeholder:text-[var(--store-ink-muted)]"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="shrink-0 [font-family:var(--store-font-body)] text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--store-ink-muted)] transition-colors hover:text-[var(--store-ink)]"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className={`${ICON_BUTTON} -mr-2 h-9 w-9 shrink-0`}
              aria-label="Cerrar búsqueda"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {menuOpen && (
        <div
          id="boutique-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className="fixed inset-0 z-50 flex flex-col overscroll-contain bg-[var(--store-background)] px-6 pb-8 pt-5 xl:hidden"
        >
          <div className="flex h-11 flex-none items-center justify-between">
            <span className="[font-family:var(--store-font-heading)] text-[28px] font-normal leading-none tracking-[-0.01em] text-[var(--store-ink)]">
              {store.name}
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMenuOpen(false)}
              className={`${ICON_BUTTON} -mr-2`}
              aria-label="Cerrar menú"
            >
              <X size={22} strokeWidth={1.5} />
            </button>
          </div>

          <nav
            aria-label="Categorías y navegación"
            className="mt-10 min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <ul>
              {navItems.map((item) => {
                const tags = (tagsByCategory[item.id] ?? []).slice(0, MAX_TAGS);
                const expanded = expandedMobile === item.id;
                const isActive = activeCategory === item.id;

                return (
                  <li key={item.id} className="border-b border-[var(--store-divider)]">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => selectCategory(item.id)}
                        aria-current={isActive ? "true" : undefined}
                        className={`flex h-14 flex-1 items-center text-left [font-family:var(--store-font-body)] text-[15px] font-medium uppercase leading-none tracking-[0.08em] transition-opacity duration-300 hover:opacity-60 ${
                          isActive
                            ? "text-[var(--store-ink)]"
                            : "text-[var(--store-ink-muted)]"
                        }`}
                      >
                        {item.name}
                      </button>

                      {tags.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedMobile(expanded ? null : item.id)}
                          aria-expanded={expanded}
                          aria-label={`Ver estilos de ${item.name}`}
                          className="flex h-14 w-11 items-center justify-center text-[var(--store-ink-muted)] transition-colors hover:text-[var(--store-ink)]"
                        >
                          <ChevronDown
                            size={16}
                            strokeWidth={1.5}
                            className={`transition-transform duration-300 motion-reduce:transition-none ${
                              expanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {expanded && tags.length > 0 && (
                      <div className="flex flex-wrap gap-x-5 gap-y-3 pb-4">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => selectCategory(item.id, tag)}
                            className="[font-family:var(--store-font-body)] text-[12px] uppercase leading-none tracking-[0.1em] text-[var(--store-ink-muted)] transition-colors hover:text-[var(--store-ink)]"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-8 flex-none border-t border-[var(--store-divider)] pt-6">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 [font-family:var(--store-font-body)] text-[13px] font-medium uppercase tracking-[0.05em] text-[var(--store-ink)] transition-opacity duration-300 hover:opacity-60"
              >
                <MessageCircle size={16} strokeWidth={1.5} />
                Escribinos por WhatsApp
              </a>
            )}
            <p className="mt-4 max-w-xs [font-family:var(--store-font-body)] text-sm leading-6 text-[var(--store-ink-muted)]">
              {store.slogan}
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
