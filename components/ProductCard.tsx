"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatARS } from "@/lib/pricing";

const LOW_STOCK = 5;

type Props = {
  product: Product;
  quantityInCart?: number;
  onAdd: (product: Product) => void;
};

export default function ProductCard({ product, quantityInCart = 0, onAdd }: Props) {
  const [imageError, setImageError] = useState(false);
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock < LOW_STOCK;

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
    <article className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-neutral-100">
        {product.image_url && !imageError ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Package className="h-10 w-10 text-neutral-400" />
        )}
        {product.tags.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-green-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 font-medium text-neutral-900">{product.name}</h3>
        <p className="text-lg font-bold text-neutral-900">{formatARS(product.unit_price)}</p>
        {promo && <p className="text-xs font-medium text-green-700">{promo}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {outOfStock ? (
            <span className="text-xs font-semibold text-red-600">Agotado</span>
          ) : lowStock ? (
            <span className="text-xs font-semibold text-amber-600">Últimas {product.stock} un.</span>
          ) : (
            <span className="text-xs text-neutral-400">Stock: {product.stock}</span>
          )}
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => onAdd(product)}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} />
            {quantityInCart > 0 ? `Agregar (${quantityInCart})` : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}
