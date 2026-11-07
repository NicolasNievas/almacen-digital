"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, Minus, Package, Plus, X } from "lucide-react";
import type { Product, ProductVariant, Store } from "@/lib/types";
import { formatARS } from "@/lib/pricing";

type Props = {
  product: Product;
  store: Store;
  onClose: () => void;
  onAdd: (product: Product, quantity: number, variant?: ProductVariant, note?: string) => void;
};

export default function ProductDetailModal({ product, store, onClose, onAdd }: Props) {
  const { features } = store.settings;
  const boutique = store.settings.design.storefront_layout === "boutique";

  const gallery = useMemo(() => {
    const images = product.images.length > 0 ? product.images : product.image_url ? [product.image_url] : [];
    return images;
  }, [product]);

  const [imageIndex, setImageIndex] = useState(0);
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [imageError, setImageError] = useState(false);

  const outOfStock = product.stock <= 0;
  const showGallery = features.gallery_enabled && gallery.length > 1;
  const variant: ProductVariant | undefined =
    features.variants_enabled && (size || color)
      ? {
          ...(size ? { size } : {}),
          ...(color ? { color } : {}),
        }
      : undefined;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous || "unset";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const prevImage = () =>
    setImageIndex((index) => (index - 1 + gallery.length) % Math.max(gallery.length, 1));
  const nextImage = () => setImageIndex((index) => (index + 1) % Math.max(gallery.length, 1));

  const add = () => {
    if (outOfStock) return;
    onAdd(product, quantity, variant, features.custom_notes ? note : undefined);
    onClose();
  };

  const label = boutique
    ? "[font-family:var(--store-font-body)] text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--store-ink-muted)]"
    : "text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400";

  const optionBase = boutique
    ? "min-w-10 rounded-lg border px-3 py-2 [font-family:var(--store-font-body)] text-[11px] font-medium uppercase leading-none tracking-[0.08em] transition-colors"
    : "min-w-10 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors";

  const optionOn = boutique
    ? "border-[var(--store-primary)] bg-[var(--store-primary)] text-[var(--store-ink)]"
    : "border-brand-solid bg-brand-solid text-white";

  const optionOff = boutique
    ? "border-[var(--store-divider)] text-[var(--store-ink-muted)] hover:border-[var(--store-ink)] hover:text-[var(--store-ink)]"
    : "border-neutral-300 text-neutral-700 hover:border-brand dark:border-neutral-700 dark:text-neutral-300";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className={`max-h-[92vh] w-full max-w-3xl overflow-y-auto ${
          boutique
            ? "bg-[var(--store-background)] text-[var(--store-ink)]"
            : "rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-neutral-900"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid gap-0 md:grid-cols-2">
          {/* Galería */}
          <div className={boutique ? "relative bg-[var(--store-surface)]" : "relative bg-neutral-100 dark:bg-neutral-800"}>
            <div className="relative aspect-square w-full">
              {gallery[imageIndex] && !imageError ? (
                <Image
                  src={gallery[imageIndex]}
                  alt={`${product.name} — imagen ${imageIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package
                    className={
                      boutique
                        ? "h-12 w-12 text-[var(--store-ink-muted)]"
                        : "h-14 w-14 text-neutral-400 dark:text-neutral-500"
                    }
                  />
                </div>
              )}
            </div>

            {showGallery && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label="Imagen anterior"
                  className={
                    boutique
                      ? "absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-[var(--store-background)]/90 text-[var(--store-ink)] transition-opacity hover:opacity-70"
                      : "absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow hover:bg-white"
                  }
                >
                  <ChevronLeft size={18} strokeWidth={boutique ? 1.5 : undefined} />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Imagen siguiente"
                  className={
                    boutique
                      ? "absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-[var(--store-background)]/90 text-[var(--store-ink)] transition-opacity hover:opacity-70"
                      : "absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow hover:bg-white"
                  }
                >
                  <ChevronRight size={18} strokeWidth={boutique ? 1.5 : undefined} />
                </button>
                <span
                  className={
                    boutique
                      ? "absolute right-3 top-3 flex items-center gap-1 bg-[var(--store-background)] px-2 py-1 [font-family:var(--store-font-body)] text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-[var(--store-ink-muted)]"
                      : "absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white"
                  }
                >
                  <Images size={12} strokeWidth={boutique ? 1.5 : undefined} /> {imageIndex + 1}/{gallery.length}
                </span>
                <div className="flex gap-2 overflow-x-auto p-3">
                  {gallery.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => {
                        setImageError(false);
                        setImageIndex(index);
                      }}
                      className={`relative h-14 w-14 shrink-0 overflow-hidden border ${
                        boutique
                          ? index === imageIndex
                            ? "border-[var(--store-ink)]"
                            : "border-transparent"
                          : `border-2 ${index === imageIndex ? "border-brand-solid" : "border-transparent"}`
                      }`}
                      aria-label={`Ver imagen ${index + 1}`}
                    >
                      <Image src={image} alt="" fill sizes="56px" className="object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Detalle y variantes */}
          <div className={boutique ? "flex flex-col p-6 md:p-8" : "flex flex-col p-5"}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={
                    boutique
                      ? "[font-family:var(--store-font-body)] text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--store-ink-muted)]"
                      : "text-[11px] font-semibold uppercase tracking-wide text-brand"
                  }
                >
                  {store.name}
                </p>
                <h2
                  className={
                    boutique
                      ? "mt-2 [font-family:var(--store-font-heading)] text-[26px] font-normal leading-[1.15] tracking-[-0.01em] text-[var(--store-ink)]"
                      : "mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100"
                  }
                >
                  {product.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className={
                  boutique
                    ? "-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center text-[var(--store-ink)] transition-opacity hover:opacity-60"
                    : "rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                }
              >
                <X size={20} strokeWidth={boutique ? 1.5 : undefined} />
              </button>
            </div>

            <p
              className={
                boutique
                  ? "mt-4 [font-family:var(--store-font-body)] text-[15px] font-medium tabular-nums text-[var(--store-ink)]"
                  : "mt-3 text-2xl font-extrabold text-neutral-900 dark:text-neutral-100"
              }
            >
              {formatARS(product.unit_price)}
            </p>

            {product.description && (
              <p
                className={
                  boutique
                    ? "mt-4 [font-family:var(--store-font-body)] text-sm leading-6 text-[var(--store-ink-muted)]"
                    : "mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
                }
              >
                {product.description}
              </p>
            )}

            {features.variants_enabled && product.sizes.length > 0 && (
              <fieldset className="mt-6">
                <legend className={label}>Talle</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                      aria-pressed={size === option}
                      className={`${optionBase} ${size === option ? optionOn : optionOff}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {features.variants_enabled && product.colors.length > 0 && (
              <fieldset className="mt-6">
                <legend className={label}>Color</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.colors.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      aria-pressed={color === option}
                      className={`${optionBase} ${color === option ? optionOn : optionOff}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {features.custom_notes && (
              <label className="mt-6 block space-y-2">
                <span className={label}>Aclaración para este ítem</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  placeholder="Ej: sin cebolla, cocción suave, sin sal…"
                  className={
                    boutique
                      ? "w-full resize-none rounded-none border-0 border-b border-[var(--store-divider)] bg-transparent px-0 py-2 [font-family:var(--store-font-body)] text-sm text-[var(--store-ink)] outline-none placeholder:text-[var(--store-ink-muted)] focus:border-[var(--store-ink)]"
                      : "w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  }
                />
              </label>
            )}

            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className={
                    boutique
                      ? "flex h-10 w-10 items-center justify-center border border-[var(--store-divider)] text-[var(--store-ink)] transition-colors hover:border-[var(--store-ink)]"
                      : "rounded-lg border border-neutral-300 p-1.5 dark:border-neutral-700"
                  }
                  aria-label="Restar una unidad"
                >
                  <Minus size={16} strokeWidth={boutique ? 1.5 : undefined} />
                </button>
                <span
                  className={
                    boutique
                      ? "w-6 text-center [font-family:var(--store-font-body)] text-[13px] font-medium tabular-nums text-[var(--store-ink)]"
                      : "w-6 text-center font-semibold text-neutral-900 dark:text-neutral-100"
                  }
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                  disabled={quantity >= product.stock}
                  className={
                    boutique
                      ? "flex h-10 w-10 items-center justify-center border border-[var(--store-divider)] text-[var(--store-ink)] transition-colors hover:border-[var(--store-ink)] disabled:opacity-30"
                      : "rounded-lg border border-neutral-300 p-1.5 disabled:opacity-30 dark:border-neutral-700"
                  }
                  aria-label="Sumar una unidad"
                >
                  <Plus size={16} strokeWidth={boutique ? 1.5 : undefined} />
                </button>
              </div>
              <span
                className={
                  boutique
                    ? "[font-family:var(--store-font-body)] text-[10px] uppercase tracking-[0.12em] text-[var(--store-ink-muted)]"
                    : "text-xs text-neutral-500 dark:text-neutral-400"
                }
              >
                {outOfStock ? "Sin stock" : `${product.stock} disponibles`}
              </span>
            </div>

            <button
              type="button"
              onClick={add}
              disabled={outOfStock}
              className={
                boutique
                  ? "mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--store-primary)] py-3.5 [font-family:var(--store-font-body)] text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--store-ink)] transition-colors duration-300 hover:bg-[var(--store-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                  : "mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-solid py-3 font-semibold text-white transition-colors hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-40"
              }
            >
              <Plus size={boutique ? 15 : 18} strokeWidth={boutique ? 1.5 : undefined} /> Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
