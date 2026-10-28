import { describe, expect, it } from "vitest";
import { calcSavings, calcSubtotal } from "@/lib/pricing";
import type { Product } from "@/lib/types";

const baseProduct: Product = {
  id: "prod-1",
  store_id: "store-1",
  name: "Producto de prueba",
  category_id: "cat-1",
  unit_price: 1_000,
  pricing_type: "SIMPLE",
  pricing_tiers: [],
  stock: 100,
  active: true,
  tags: [],
  images: [],
  sizes: [],
  colors: [],
};

function product(overrides: Partial<Product> = {}): Product {
  return { ...baseProduct, ...overrides };
}

describe("calcSubtotal", () => {
  it("multiplica el precio unitario por la cantidad en SIMPLE", () => {
    expect(calcSubtotal(product(), 3)).toBe(3_000);
  });

  it("devuelve 0 cuando la cantidad es 0 o negativa", () => {
    expect(calcSubtotal(product(), 0)).toBe(0);
    expect(calcSubtotal(product(), -2)).toBe(0);
  });

  describe("TIERED", () => {
    const tiered = product({
      pricing_type: "TIERED",
      unit_price: 1_000,
      pricing_tiers: [
        { min_quantity: 1, unit_price: 1_000 },
        { min_quantity: 6, unit_price: 900 },
        { min_quantity: 12, unit_price: 800 },
      ],
    });

    it("usa el precio del escalón alcanzado para todas las unidades", () => {
      expect(calcSubtotal(tiered, 5)).toBe(5_000);
      expect(calcSubtotal(tiered, 6)).toBe(5_400);
      expect(calcSubtotal(tiered, 13)).toBe(10_400);
    });

    it("funciona aunque los escalones no estén ordenados", () => {
      const unsorted = product({
        pricing_type: "TIERED",
        pricing_tiers: [
          { min_quantity: 12, unit_price: 800 },
          { min_quantity: 1, unit_price: 1_000 },
          { min_quantity: 6, unit_price: 900 },
        ],
      });

      expect(calcSubtotal(unsorted, 6)).toBe(5_400);
    });

    it("cae al precio unitario si no se alcanza ningún escalón", () => {
      const onlyBulk = product({
        pricing_type: "TIERED",
        unit_price: 1_000,
        pricing_tiers: [{ min_quantity: 6, unit_price: 900 }],
      });

      expect(calcSubtotal(onlyBulk, 2)).toBe(2_000);
    });
  });

  describe("BUNDLE", () => {
    const bundle = product({
      pricing_type: "BUNDLE",
      unit_price: 1_000,
      bundle_size: 6,
      bundle_price: 5_000,
    });

    it("cobra los packs completos al precio de bundle", () => {
      expect(calcSubtotal(bundle, 6)).toBe(5_000);
      expect(calcSubtotal(bundle, 12)).toBe(10_000);
    });

    it("cobra las unidades sueltas al precio unitario", () => {
      expect(calcSubtotal(bundle, 5)).toBe(5_000);
      expect(calcSubtotal(bundle, 7)).toBe(6_000);
      expect(calcSubtotal(bundle, 13)).toBe(11_000);
    });

    it("usa el precio unitario si faltan datos del bundle", () => {
      const incomplete = product({
        pricing_type: "BUNDLE",
        bundle_size: 6,
        bundle_price: undefined,
      });

      expect(calcSubtotal(incomplete, 6)).toBe(6_000);
    });
  });
});

describe("calcSavings", () => {
  it("devuelve 0 cuando no hay descuento", () => {
    expect(calcSavings(product(), 4)).toBe(0);
  });

  it("calcula el ahorro de un precio por escalón", () => {
    const tiered = product({
      pricing_type: "TIERED",
      pricing_tiers: [{ min_quantity: 12, unit_price: 800 }],
    });

    expect(calcSavings(tiered, 12)).toBe(2_400);
  });

  it("calcula el ahorro de un bundle", () => {
    const bundle = product({
      pricing_type: "BUNDLE",
      bundle_size: 6,
      bundle_price: 5_000,
    });

    expect(calcSavings(bundle, 6)).toBe(1_000);
  });
});
