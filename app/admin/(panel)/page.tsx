"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Boxes, DollarSign, Loader2, Receipt, RefreshCw, TrendingUp } from "lucide-react";
import { ADMIN_STORE_PARAM, resolveAdminStoreSlug } from "@/lib/admin-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchAdminStore,
  fetchCategories,
  fetchOrdersWithItems,
  fetchProducts,
} from "@/lib/supabase/queries";
import { formatARS } from "@/lib/pricing";
import {
  filterByRange,
  inventoryByCategory,
  paymentBreakdown,
  RANGES,
  salesSeries,
  topProducts,
  type RangeKey,
} from "@/lib/metrics";
import {
  InventoryByCategoryChart,
  PaymentMethodsChart,
  SalesBySourceChart,
  TopProductsChart,
} from "@/components/admin/MetricsCharts";
import type { Category, OrderWithItems, Product } from "@/lib/types";

export default function PanelHomePage() {
  const configured = isSupabaseConfigured();
  const searchParams = useSearchParams();
  const storeSlug = resolveAdminStoreSlug(searchParams.get(ADMIN_STORE_PARAM));
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [range, setRange] = useState<RangeKey>("week");
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = loadedSlug !== storeSlug;

  const load = useCallback(async () => {
    try {
      const store = await fetchAdminStore(storeSlug);
      const [productos, categorias, pedidos] = await Promise.all([
        fetchProducts(store.id),
        fetchCategories(store.id),
        fetchOrdersWithItems(store.id),
      ]);
      setProducts(productos);
      setCategories(categorias);
      setOrders(pedidos);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas.");
    } finally {
      setLoadedSlug(storeSlug);
    }
  }, [storeSlug]);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    (async () => {
      try {
        const store = await fetchAdminStore(storeSlug);
        const [productos, categorias, pedidos] = await Promise.all([
          fetchProducts(store.id),
          fetchCategories(store.id),
          fetchOrdersWithItems(store.id),
        ]);
        if (active) {
          setProducts(productos);
          setCategories(categorias);
          setOrders(pedidos);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas.");
      } finally {
        if (active) setLoadedSlug(storeSlug);
      }
    })();
    return () => {
      active = false;
    };
  }, [configured, storeSlug]);

  const completedInRange = useMemo(
    () => filterByRange(orders, range).filter((o) => o.status === "COMPLETED"),
    [orders, range],
  );

  const revenue = completedInRange.reduce((acc, o) => acc + o.total, 0);
  const webCount = completedInRange.filter((o) => o.source === "WEB").length;
  const posCount = completedInRange.filter((o) => o.source === "POS").length;
  const avgTicket = completedInRange.length > 0 ? revenue / completedInRange.length : 0;
  const pending = orders.filter((o) => o.status === "PENDING").length;

  const inventoryValue = products.reduce((acc, p) => acc + p.stock * p.unit_price, 0);

  const cards = [
    {
      label: "Ingresos del período",
      value: formatARS(revenue),
      hint: `${webCount} web · ${posCount} POS`,
      icon: TrendingUp,
    },
    {
      label: "Pedidos completados",
      value: String(completedInRange.length),
      hint: pending > 0 ? `${pending} pendiente(s)` : "sin pendientes",
      icon: Receipt,
    },
    { label: "Ticket promedio", value: formatARS(avgTicket), hint: "por pedido", icon: DollarSign },
    {
      label: "Valor de inventario",
      value: formatARS(inventoryValue),
      hint: `${products.length} productos`,
      icon: Boxes,
    },
  ];

  const topProductsData = useMemo(() => topProducts(completedInRange), [completedInRange]);
  const paymentData = useMemo(() => paymentBreakdown(completedInRange), [completedInRange]);
  const inventoryData = useMemo(() => inventoryByCategory(products, categories), [products, categories]);
  const salesData = useMemo(() => salesSeries(completedInRange, range), [completedInRange, range]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Métricas</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Resumen ejecutivo de ingresos, volumen de ventas y estado general del inventario.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => configured && void load()}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {!configured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          No pudimos cargar las métricas en este momento. Volvé a intentar en unos minutos.
        </p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-neutral-500 dark:text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Calculando métricas...
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{card.label}</span>
                  <card.icon size={18} className="text-brand" />
                </div>
                <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{card.value}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">{card.hint}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-start">
            <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
              {RANGES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRange(option.key)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    range === option.key
                      ? "bg-brand-solid text-white"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TopProductsChart data={topProductsData} />
            <PaymentMethodsChart data={paymentData} />
            <InventoryByCategoryChart data={inventoryData} />
            <SalesBySourceChart data={salesData} />
          </div>
        </>
      )}
    </div>
  );
}
