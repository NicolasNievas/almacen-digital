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
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-neutral-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid gap-0 md:grid-cols-2">
          {/* Galería */}
          <div className="relative bg-neutral-100 dark:bg-neutral-800">
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
                  <Package className="h-14 w-14 text-neutral-400 dark:text-neutral-500" />
                </div>
              )}
            </div>

            {showGallery && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label="Imagen anterior"
                  className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow hover:bg-white"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Imagen siguiente"
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow hover:bg-white"
                >
                  <ChevronRight size={18} />
                </button>
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                  <Images size={12} /> {imageIndex + 1}/{gallery.length}
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
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                        index === imageIndex ? "border-brand-solid" : "border-transparent"
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
          <div className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                  {store.name}
                </p>
                <h2 className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">{product.name}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-3 text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
              {formatARS(product.unit_price)}
            </p>
            {product.description && (
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {product.description}
              </p>
            )}

            {features.variants_enabled && product.sizes.length > 0 && (
              <fieldset className="mt-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Talle
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.sizes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                      aria-pressed={size === option}
                      className={`min-w-10 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        size === option
                          ? "border-brand-solid bg-brand-solid text-white"
                          : "border-neutral-300 text-neutral-700 hover:border-brand dark:border-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {features.variants_enabled && product.colors.length > 0 && (
              <fieldset className="mt-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Color
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {product.colors.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      aria-pressed={color === option}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        color === option
                          ? "border-brand-solid bg-brand-solid text-white"
                          : "border-neutral-300 text-neutral-700 hover:border-brand dark:border-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {features.custom_notes && (
              <label className="mt-4 block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Aclaración para este ítem
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  placeholder="Ej: sin cebolla, cocción suave, sin sal…"
                  className="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </label>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="rounded-lg border border-neutral-300 p-1.5 dark:border-neutral-700"
                  aria-label="Restar una unidad"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center font-semibold text-neutral-900 dark:text-neutral-100">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                  disabled={quantity >= product.stock}
                  className="rounded-lg border border-neutral-300 p-1.5 disabled:opacity-30 dark:border-neutral-700"
                  aria-label="Sumar una unidad"
                >
                  <Plus size={16} />
                </button>
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {outOfStock ? "Sin stock" : `${product.stock} disponibles`}
              </span>
            </div>

            <button
              type="button"
              onClick={add}
              disabled={outOfStock}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-solid py-3 font-semibold text-white transition-colors hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={18} /> Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
