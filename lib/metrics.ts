import type { Category, OrderWithItems, Product } from "./types";

export type RangeKey = "day" | "week" | "month";

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "day", label: "Día" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
];

/** Inicio del rango pedido (hoy para "Día", últimos 7/30 días para el resto). */
export function getRangeStart(range: RangeKey, now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === "day") return start;
  start.setDate(start.getDate() - (range === "week" ? 6 : 29));
  return start;
}

export function filterByRange(
  orders: OrderWithItems[],
  range: RangeKey,
  now: Date = new Date(),
): OrderWithItems[] {
  const from = getRangeStart(range, now).getTime();
  return orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return !Number.isNaN(t) && t >= from;
  });
}

export type NamedValue = { name: string; value: number };

export function topProducts(orders: OrderWithItems[], limit = 5): { name: string; quantity: number }[] {
  const map = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      map.set(item.product_name, (map.get(item.product_name) ?? 0) + item.quantity);
    }
  }
  return [...map.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export function paymentBreakdown(orders: OrderWithItems[]): NamedValue[] {
  const map = new Map<string, number>();
  for (const order of orders) {
    const raw = order.payment_method?.trim() || "Sin especificar";
    const key = raw.toLowerCase().startsWith("transferencia") ? "Transferencia" : raw;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export type SalesPoint = { label: string; WEB: number; POS: number };

/** Serie temporal de ventas (revenue) por origen, con buckets según el rango. */
export function salesSeries(orders: OrderWithItems[], range: RangeKey, now: Date = new Date()): SalesPoint[] {
  if (range === "day") {
    const buckets: SalesPoint[] = Array.from({ length: 24 }, (_, h) => ({
      label: `${String(h).padStart(2, "0")}h`,
      WEB: 0,
      POS: 0,
    }));
    for (const order of orders) {
      const d = new Date(order.created_at);
      if (Number.isNaN(d.getTime())) continue;
      buckets[d.getHours()][order.source] += order.total;
    }
    return buckets;
  }

  const days = range === "week" ? 7 : 30;
  const start = getRangeStart(range, now);
  const buckets: SalesPoint[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, WEB: 0, POS: 0 };
  });

  for (const order of orders) {
    const d = new Date(order.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const index = Math.round((day.getTime() - start.getTime()) / 86_400_000);
    if (index >= 0 && index < buckets.length) buckets[index][order.source] += order.total;
  }
  return buckets;
}

export function inventoryByCategory(products: Product[], categories: Category[]): NamedValue[] {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const map = new Map<string, number>();
  for (const p of products) {
    const name = nameById.get(p.category_id) ?? "Sin categoría";
    map.set(name, (map.get(name) ?? 0) + p.stock * p.unit_price);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Montos abreviados para ejes/etiquetas: $800K, $1.2M. */
export function abbreviateARS(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}
