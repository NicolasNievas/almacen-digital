import type { Product } from "./types";

/** Subtotal según cantidad. El stock descontado es SIEMPRE `quantity` (unidad base). */
export function calcSubtotal(p: Product, quantity: number): number {
  if (quantity <= 0) return 0;

  if (p.pricing_type === "TIERED") {
    // Se aplica el escalón más alto alcanzado a TODAS las unidades.
    const tier = [...p.pricing_tiers]
      .sort((a, b) => b.min_quantity - a.min_quantity)
      .find((t) => quantity >= t.min_quantity);
    return quantity * (tier?.unit_price ?? p.unit_price);
  }

  if (p.pricing_type === "BUNDLE" && p.bundle_size && p.bundle_price) {
    const bundles = Math.floor(quantity / p.bundle_size);
    const rest = quantity % p.bundle_size;
    return bundles * p.bundle_price + rest * p.unit_price;
  }

  return quantity * p.unit_price;
}

export function calcSavings(p: Product, quantity: number): number {
  return quantity * p.unit_price - calcSubtotal(p, quantity);
}

export const formatARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
