"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Boxes, DollarSign, Loader2, Receipt, RefreshCw, TrendingUp } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  ADMIN_ACTION_GHOST,
  ADMIN_EMPTY_TEXT,
  ADMIN_EMPTY_TITLE,
  ADMIN_ERROR,
  ADMIN_EYEBROW,
  ADMIN_LOADING,
} from "@/lib/admin-ui";
import { resolveAdminStoreSlug } from "@/lib/admin-store";
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
  const params = useParams<{ storeSlug: string }>();
  const storeSlug = resolveAdminStoreSlug(params.storeSlug);
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
      index: "01",
      label: "Ingresos del período",
      value: formatARS(revenue),
      hint: `${webCount} web · ${posCount} POS`,
      icon: TrendingUp,
    },
    {
      index: "02",
      label: "Pedidos completados",
      value: String(completedInRange.length),
      hint: pending > 0 ? `${pending} pendiente(s)` : "sin pendientes",
      icon: Receipt,
    },
    {
      index: "03",
      label: "Ticket promedio",
      value: formatARS(avgTicket),
      hint: "por pedido",
      icon: DollarSign,
    },
    {
      index: "04",
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
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Resumen ejecutivo"
        title="Métricas"
        description="Ingresos, volumen de ventas y estado del inventario en una lectura directa."
        actions={
          <button
            type="button"
            onClick={() => configured && void load()}
            className={ADMIN_ACTION_GHOST}
          >
            <RefreshCw size={14} strokeWidth={1.5} /> Actualizar
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--admin-line)] pb-5">
        <p className={ADMIN_EYEBROW}>Período</p>
        <div className="flex items-center gap-7">
          {RANGES.map((option) => {
            const active = range === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                aria-pressed={active}
                className={`relative pb-1 text-[10px] font-medium uppercase leading-none tracking-[0.16em] transition-colors duration-200 motion-reduce:transition-none ${
                  active
                    ? "text-[var(--admin-ink)] after:absolute after:inset-x-0 after:-bottom-[5px] after:h-px after:bg-[var(--admin-ink)]"
                    : "text-[var(--admin-muted)] hover:text-[var(--admin-ink)]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className={ADMIN_ERROR} role="alert">
          {error}
        </p>
      )}

      {!configured ? (
        <div className="border-y border-[var(--admin-line)] py-16">
          <p className={ADMIN_EMPTY_TITLE}>Panel sin conexión</p>
          <p className={`${ADMIN_EMPTY_TEXT} mt-2`}>No pudimos cargar las métricas. Volvé a intentar en unos minutos.</p>
        </div>
      ) : loading ? (
        <div className={ADMIN_LOADING}>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Calculando métricas
        </div>
      ) : (
        <>
          <section aria-label="Resumen del período">
            <div className="grid gap-px border-y border-[var(--admin-line)] bg-[var(--admin-line)] sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div key={card.label} className="bg-[var(--admin-canvas)] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <p className={ADMIN_EYEBROW}>{card.label}</p>
                    <card.icon size={15} strokeWidth={1.5} className="shrink-0 text-[var(--admin-faint)]" />
                  </div>
                  <p className="mt-7 [font-family:var(--admin-display-font)] text-[clamp(24px,2.4vw,34px)] font-normal leading-none tracking-[-0.01em] tabular-nums text-[var(--admin-ink)]">
                    {card.value}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-[11px] leading-none text-[var(--admin-muted)]">{card.hint}</p>
                    <span className="text-[9px] tabular-nums tracking-[0.16em] text-[var(--admin-faint)]">
                      {card.index}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section aria-label="Gráficos del período">
            <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
              <TopProductsChart data={topProductsData} />
              <PaymentMethodsChart data={paymentData} />
              <InventoryByCategoryChart data={inventoryData} />
              <SalesBySourceChart data={salesData} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
