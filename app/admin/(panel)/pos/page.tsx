"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import PosScreen from "@/components/admin/PosScreen";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchProducts } from "@/lib/supabase/queries";
import type { CartLine, Product } from "@/lib/types";

export default function PosPage() {
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

  const handleCheckout = async (lines: CartLine[], customer: string, payment: string) => {
    const supabase = createClient();
    const { error: saleError } = await supabase.rpc("create_sale", {
      p_source: "POS",
      p_items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      p_customer: customer || null,
      p_pickup: null,
      p_payment: payment,
    });
    if (saleError) throw saleError;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Punto de venta</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Cada venta descuenta stock en Supabase mediante el RPC <code>create_sale</code> (origen POS).
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
          Configurá <code>.env.local</code> para registrar ventas en Supabase.
        </p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-neutral-500 dark:text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando productos...
        </div>
      ) : (
        <PosScreen key={version} products={products} onCheckout={handleCheckout} />
      )}
    </div>
  );
}
