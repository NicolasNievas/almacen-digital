"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import StockPanel from "@/components/admin/StockPanel";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchProducts } from "@/lib/supabase/queries";
import type { Product } from "@/lib/types";

type Patch = Partial<Pick<Product, "stock" | "unit_price" | "active">>;

const LOW_STOCK = 5;

export default function StockPage() {
  const configured = isSupabaseConfigured();
  const [products, setProducts] = useState<Product[]>([]);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProducts(await fetchProducts());
      setVersion((v) => v + 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    (async () => {
      try {
        const data = await fetchProducts();
        if (active) {
          setProducts(data);
          setVersion((v) => v + 1);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No se pudieron cargar los productos.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [configured]);

  const handleSave = async (id: string, patch: Patch) => {
    const supabase = createClient();

    // El stock se ajusta con el RPC (deja registro en stock_logs).
    if (patch.stock !== undefined) {
      const { error: stockError } = await supabase.rpc("adjust_stock", {
        p_product: id,
        p_new_stock: patch.stock,
      });
      if (stockError) throw stockError;
    }

    // Precio y estado ON/OFF (pausar) van por update directo.
    const rest: Patch = { ...patch };
    delete rest.stock;
    if (Object.keys(rest).length > 0) {
      const { error: updateError } = await supabase.from("products").update(rest).eq("id", id);
      if (updateError) throw updateError;
    }
  };

  const critical = products.filter((p) => p.stock < LOW_STOCK).sort((a, b) => a.stock - b.stock);

  return (
      <div className="space-y-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Stock</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Control rápido de existencias, precios y disponibilidad de productos en góndola.
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
          No pudimos cargar el stock en este momento. Volvé a intentar en unos minutos.
        </p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-neutral-500 dark:text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando productos...
        </div>
      ) : (
        <div className="space-y-4">
          {critical.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30">
              <h2 className="border-b border-amber-200 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:text-amber-200">
                Reposición sugerida · {critical.length} producto(s) con stock crítico
              </h2>
              <ul className="divide-y divide-amber-200/70 dark:divide-amber-900/50">
                {critical.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between p-3 text-sm">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                    <span className={p.stock === 0 ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}>
                      {p.stock === 0 ? "Agotado" : `${p.stock} unidades`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <StockPanel key={version} initial={products} onSave={handleSave} />
          </div>
        </div>
      )}
    </div>
  );
}
