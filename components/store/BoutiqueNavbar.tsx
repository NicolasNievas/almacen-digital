"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, MessageCircle, ShoppingBag, UserRound, X } from "lucide-react";
import { OPEN_CART_EVENT } from "@/lib/cart";
import type { Store } from "@/lib/types";

const NAV_LINKS = [
  { label: "Catálogo", href: "#catalogo" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Contacto", href: "#contacto" },
] as const;

const DESKTOP_LINK =
  "relative inline-block [font-family:var(--store-font-body)] text-[13px] font-medium uppercase leading-none tracking-[0.05em] text-[var(--store-ink)] transition-opacity duration-300 hover:opacity-60 active:opacity-40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-ink)] motion-reduce:transition-none " +
  "after:absolute after:-bottom-2 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[var(--store-ink)] after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100 motion-reduce:after:transition-none";

const ICON_BUTTON =
  "inline-flex h-11 w-11 items-center justify-center text-[var(--store-ink)] transition-opacity duration-300 hover:opacity-60 active:opacity-40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-ink)] motion-reduce:transition-none";

/**
 * Navegación editorial del storefront boutique.
 *
 * Es Client Component solo por dos motivos estrictos:
 *   1. El menú móvil a pantalla completa necesita estado y bloqueo de scroll.
 *   2. La bolsa vive en `StoreCatalog`; el navbar emite `OPEN_CART_EVENT`
 *      en lugar de duplicar el estado del carrito.
 *
 * Todo el lenguaje visual (colores, fuentes, radio) llega por las CSS
 * variables que inyecta `StoreThemeScope` en el HTML inicial.
 */
export default function BoutiqueNavbar({ store }: { store: Store }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const base = `/${store.slug}`;
  const whatsapp = store.whatsapp.replace(/\D/g, "");

  useEffect(() => {
    if (!menuOpen) return;

    closeButtonRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    // Si el viewport crece a desktop con el menú abierto, el overlay se
    // oculta por CSS: cerramos el estado para no dejar el scroll bloqueado.
    const desktop = window.matchMedia("(min-width: 768px)");
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

  const openCart = () => {
    setMenuOpen(false);
    window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT));
  };

  return (
    <header className="relative z-40 w-full bg-transparent">
      <div className="grid h-20 grid-cols-[1fr_auto_1fr] items-center px-6 md:px-10 xl:px-12">
        <nav aria-label="Navegación principal" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={`${base}${link.href}`}
              className={DESKTOP_LINK}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={`${ICON_BUTTON} -ml-2 justify-self-start md:hidden`}
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

        <div className="flex items-center justify-end gap-3 md:gap-5">
          <Link
            href={`${base}#contacto`}
            className={ICON_BUTTON}
            aria-label="Contacto y atención al cliente"
            title="Contacto"
          >
            <UserRound size={19} strokeWidth={1.5} />
          </Link>

          <button
            type="button"
            onClick={openCart}
            className={`${ICON_BUTTON} -mr-2`}
            aria-label="Abrir carrito"
            title="Carrito"
          >
            <ShoppingBag size={19} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="boutique-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className="fixed inset-0 z-50 flex flex-col overscroll-contain bg-[var(--store-background)] px-6 pb-8 pt-5 md:hidden"
        >
          <div className="flex h-11 items-center justify-between">
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

          <nav aria-label="Navegación móvil" className="mt-16 flex flex-col">
            {NAV_LINKS.map((link, index) => (
              <Link
                key={link.href}
                href={`${base}${link.href}`}
                onClick={() => setMenuOpen(false)}
                className={`flex h-14 items-center [font-family:var(--store-font-body)] text-[15px] font-medium uppercase leading-none tracking-[0.08em] text-[var(--store-ink)] transition-opacity duration-300 hover:opacity-60 active:opacity-40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-ink)] motion-reduce:transition-none ${
                  index < NAV_LINKS.length - 1
                    ? "border-b border-[var(--store-divider)]"
                    : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto border-t border-[var(--store-divider)] pt-6">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.05em] text-[var(--store-ink-muted)] transition-colors duration-300 hover:text-[var(--store-ink)]"
              >
                <MessageCircle size={16} strokeWidth={1.5} />
                Escribinos por WhatsApp
              </a>
            )}
            <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--store-ink-muted)]">
              {store.slogan}
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
