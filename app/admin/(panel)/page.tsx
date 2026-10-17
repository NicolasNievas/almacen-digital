"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, DollarSign, Loader2, Receipt, RefreshCw, TrendingUp } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchOrders, fetchProducts } from "@/lib/supabase/queries";
import { formatARS } from "@/lib/pricing";
import type { Order, Product } from "@/lib/types";

const LOW_STOCK = 5;

export default function PanelHomePage() {
  const configured = isSupabaseConfigured();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [productos, pedidos] = await Promise.all([fetchProducts(), fetchOrders()]);
      setProducts(productos);
      setOrders(pedidos);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    (async () => {
      try {
        const [productos, pedidos] = await Promise.all([fetchProducts(), fetchOrders()]);
        if (active) {
          setProducts(productos);
          setOrders(pedidos);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [configured]);

  const completed = orders.filter((o) => o.status === "COMPLETED");
  const pending = orders.filter((o) => o.status === "PENDING").length;
  const revenue = completed.reduce((acc, o) => acc + o.total, 0);
  const webCount = completed.filter((o) => o.source === "WEB").length;
  const posCount = completed.filter((o) => o.source === "POS").length;
  const avgTicket = completed.length > 0 ? revenue / completed.length : 0;

  const inventoryValue = products.reduce((acc, p) => acc + p.stock * p.unit_price, 0);

  const cards = [
    {
      label: "Ingresos totales",
      value: formatARS(revenue),
      hint: `${webCount} web · ${posCount} POS`,
      icon: TrendingUp,
    },
    {
      label: "Pedidos",
      value: String(completed.length),
      hint: pending > 0 ? `${pending} pendiente(s)` : "completados",
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

  const critical = products.filter((p) => p.stock < LOW_STOCK).sort((a, b) => a.stock - b.stock);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Métricas</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Resumen ejecutivo de ingresos, volumen de ventas y estado general del inventario.
          </p>
        </div>
        <button
          type="button"
          onClick={() => configured && void load()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
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
              <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{card.label}</span>
                  <card.icon size={18} className="text-brand" />
                </div>
                <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">{card.value}</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">{card.hint}</p>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="border-b border-neutral-200 p-4 text-base font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
              Reposición sugerida
            </h2>
            {critical.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">No hay productos con stock crítico.</p>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {critical.map((p) => (
                  <li key={p.id} className="flex items-center justify-between p-4 text-sm">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                    <span className={p.stock === 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}>
                      {p.stock === 0 ? "Agotado" : `${p.stock} unidades`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
