"use client";

import { useState } from "react";
import Image from "next/image";
import { Images, Package, Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatARS } from "@/lib/pricing";

const LOW_STOCK = 5;

type Props = {
  product: Product;
  quantityInCart?: number;
  onAdd: (product: Product) => void;
  onOpen?: (product: Product) => void;
  showStockAlerts?: boolean;
  requiresVariantSelection?: boolean;
  galleryEnabled?: boolean;
};

export default function ProductCard({
  product,
  quantityInCart = 0,
  onAdd,
  onOpen,
  showStockAlerts = true,
  requiresVariantSelection = false,
  galleryEnabled = false,
}: Props) {
  const [imageError, setImageError] = useState(false);
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock < LOW_STOCK;
  const cover = product.images[0] ?? product.image_url;

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
    <article className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <button
        type="button"
        onClick={() => onOpen?.(product)}
        className="relative flex aspect-[4/3] items-center justify-center bg-neutral-100 text-left dark:bg-neutral-800"
        aria-label={onOpen ? `Ver ${product.name}` : undefined}
      >
        {cover && !imageError ? (
          <Image
            src={cover}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setImageError(true)}
          />
        ) : (
          <Package className="h-10 w-10 text-neutral-400 dark:text-neutral-500" />
        )}

        {product.tags.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-brand-solid px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {galleryEnabled && product.images.length > 1 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white">
            <Images size={11} /> {product.images.length}
          </span>
        )}

        {requiresVariantSelection && product.sizes.length + product.colors.length > 0 && (
          <span className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200">
            {product.sizes.length > 0 ? `${product.sizes.length} talles` : `${product.colors.length} colores`}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <button
          type="button"
          onClick={() => onOpen?.(product)}
          className="line-clamp-2 text-left font-medium text-neutral-900 hover:text-brand dark:text-neutral-100"
        >
          {product.name}
        </button>
        <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{formatARS(product.unit_price)}</p>
        {promo && <p className="text-xs font-medium text-green-700 dark:text-green-400">{promo}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {outOfStock ? (
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">Agotado</span>
          ) : showStockAlerts && lowStock ? (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Últimas {product.stock} un.</span>
          ) : (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">Stock: {product.stock}</span>
          )}
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => (requiresVariantSelection ? onOpen?.(product) : onAdd(product))}
            className="flex items-center gap-1 rounded-lg bg-brand-solid px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
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
