"use client";

import { useState } from "react";
import Image from "next/image";
import { Images, Package, Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatARS } from "@/lib/pricing";

const LOW_STOCK = 5;

export type ProductCardLayout = "retail" | "boutique";

type Props = {
  product: Product;
  quantityInCart?: number;
  onAdd: (product: Product) => void;
  onOpen?: (product: Product) => void;
  showStockAlerts?: boolean;
  requiresVariantSelection?: boolean;
  galleryEnabled?: boolean;
  /** `boutique` = sin caja, sin sombra y con foto 3:4 sobre el canvas. */
  layout?: ProductCardLayout;
};

export default function ProductCard({
  product,
  quantityInCart = 0,
  onAdd,
  onOpen,
  showStockAlerts = true,
  requiresVariantSelection = false,
  galleryEnabled = false,
  layout = "retail",
}: Props) {
  const [imageError, setImageError] = useState(false);
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock < LOW_STOCK;
  const cover = product.images[0] ?? product.image_url;
  const boutique = layout === "boutique";

  let promo: string | null = null;
  if (product.pricing_type === "TIERED" && product.pricing_tiers.length > 0) {
    const best = [...product.pricing_tiers].sort((a, b) => a.unit_price - b.unit_price)[0];
    if (best && best.unit_price < product.unit_price) {
      promo = `Llevando ${best.min_quantity}+: ${formatARS(best.unit_price)} c/u`;
    }
  } else if (product.pricing_type === "BUNDLE" && product.bundle_size && product.bundle_price) {
    promo = `${product.bundle_size} x ${formatARS(product.bundle_price)}`;
  }

  return (
    <article
      className={
        boutique
          ? "group flex flex-col bg-transparent"
          : "group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
      }
    >
      <button
        type="button"
        onClick={() => onOpen?.(product)}
        className={
          boutique
            ? "relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-[var(--store-surface)] text-left"
            : "relative flex aspect-[4/3] items-center justify-center bg-neutral-100 text-left dark:bg-neutral-800"
        }
        aria-label={onOpen ? `Ver ${product.name}` : undefined}
      >
        {cover && !imageError ? (
          <Image
            src={cover}
            alt={product.name}
            fill
            sizes={boutique ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 30vw" : "(max-width: 640px) 50vw, 33vw"}
            className={`object-cover ${
              boutique
                ? "transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
                : "transition-transform duration-300 group-hover:scale-[1.03]"
            }`}
            onError={() => setImageError(true)}
          />
        ) : (
          <Package
            className={
              boutique
                ? "h-8 w-8 text-[var(--store-ink-muted)]"
                : "h-10 w-10 text-neutral-400 dark:text-neutral-500"
            }
          />
        )}

        {product.tags.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className={
                  boutique
                    ? "bg-[var(--store-background)] px-2 py-1 text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--store-ink)]"
                    : "rounded bg-brand-solid px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                }
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {galleryEnabled && product.images.length > 1 && (
          <span
            className={
              boutique
                ? "absolute bottom-2 right-2 flex items-center gap-1 bg-[var(--store-background)] px-2 py-1 text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-[var(--store-ink-muted)]"
                : "absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white"
            }
          >
            <Images size={11} strokeWidth={boutique ? 1.5 : undefined} /> {product.images.length}
          </span>
        )}

        {requiresVariantSelection && product.sizes.length + product.colors.length > 0 && (
          <span
            className={
              boutique
                ? "absolute bottom-2 left-2 bg-[var(--store-background)] px-2 py-1 text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-[var(--store-ink-muted)]"
                : "absolute bottom-2 left-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200"
            }
          >
            {product.sizes.length > 0 ? `${product.sizes.length} talles` : `${product.colors.length} colores`}
          </span>
        )}
      </button>

      <div className={boutique ? "flex flex-1 flex-col gap-1.5 pt-3" : "flex flex-1 flex-col gap-2 p-3"}>
        <button
          type="button"
          onClick={() => onOpen?.(product)}
          className={
            boutique
              ? "line-clamp-2 text-left [font-family:var(--store-font-body)] text-[13px] font-normal leading-5 text-[var(--store-ink)] transition-opacity duration-300 hover:opacity-60"
              : "line-clamp-2 text-left font-medium text-neutral-900 hover:text-brand dark:text-neutral-100"
          }
        >
          {product.name}
        </button>

        <p
          className={
            boutique
              ? "[font-family:var(--store-font-body)] text-[13px] font-medium leading-5 tabular-nums text-[var(--store-ink)]"
              : "text-lg font-bold text-neutral-900 dark:text-neutral-100"
          }
        >
          {formatARS(product.unit_price)}
        </p>

        {promo && (
          <p
            className={
              boutique
                ? "[font-family:var(--store-font-body)] text-[11px] leading-5 text-[var(--store-ink-muted)]"
                : "text-xs font-medium text-green-700 dark:text-green-400"
            }
          >
            {promo}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {outOfStock ? (
            <span
              className={
                boutique
                  ? "[font-family:var(--store-font-body)] text-[10px] uppercase leading-none tracking-[0.12em] text-[var(--store-ink-muted)]"
                  : "text-xs font-semibold text-red-600 dark:text-red-400"
              }
            >
              Agotado
            </span>
          ) : showStockAlerts && lowStock ? (
            <span
              className={
                boutique
                  ? "hidden [font-family:var(--store-font-body)] text-[10px] uppercase leading-none tracking-[0.12em] text-[var(--store-ink-muted)] sm:inline"
                  : "text-xs font-semibold text-amber-600 dark:text-amber-400"
              }
            >
              {boutique ? `Últimas ${product.stock}` : `Últimas ${product.stock} un.`}
            </span>
          ) : boutique ? (
            <span className="hidden [font-family:var(--store-font-body)] text-[10px] uppercase leading-none tracking-[0.12em] text-[var(--store-ink-muted)] sm:inline">
              {product.stock} disponibles
            </span>
          ) : (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">Stock: {product.stock}</span>
          )}

          <button
            type="button"
            disabled={outOfStock}
            onClick={() => (requiresVariantSelection ? onOpen?.(product) : onAdd(product))}
            className={
              boutique
                ? "inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--store-primary)] px-3.5 py-2.5 [font-family:var(--store-font-body)] text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-[var(--store-ink)] transition-colors duration-300 hover:bg-[var(--store-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                : "flex items-center gap-1 rounded-lg bg-brand-solid px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-40"
            }
          >
            <Plus size={boutique ? 13 : 16} strokeWidth={boutique ? 1.5 : undefined} />
            {requiresVariantSelection
              ? "Elegir"
              : quantityInCart > 0
                ? `Agregar (${quantityInCart})`
                : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}
