"use client";

import { useEffect, useState } from "react";
import StockPanel from "@/components/admin/StockPanel";
import mock from "@/data/products_mock.json";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Product, StoreData } from "@/lib/types";

const fallback = (mock as unknown as StoreData).products as Product[];

type Patch = Partial<Pick<Product, "stock" | "unit_price" | "active">>;

export default function StockPage() {
  const configured = isSupabaseConfigured();
  const [products, setProducts] = useState<Product[]>(fallback);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase.from("products").select("*").order("name");
        if (fetchError) throw fetchError;
        if (active && data) setProducts(data as Product[]);
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
    if (!configured) return; // Fase 1: StockPanel actualiza solo en memoria.
    const supabase = createClient();

    if (patch.stock !== undefined) {
      const { error: stockError } = await supabase.rpc("adjust_stock", {
        p_product: id,
        p_new_stock: patch.stock,
      });
      if (stockError) throw stockError;
    }

    const rest: Patch = { ...patch };
    delete rest.stock;
    if (Object.keys(rest).length > 0) {
      const { error: updateError } = await supabase.from("products").update(rest).eq("id", id);
      if (updateError) throw updateError;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Stock</h1>
        <p className="text-sm text-neutral-500">
          {configured
            ? "Datos en vivo desde Supabase. El stock se ajusta con el RPC adjust_stock y el precio/estado con un update."
            : "Fase 1: datos de ejemplo. Configurá .env.local para sincronizar con Supabase."}
        </p>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-neutral-500">Cargando productos...</p>
        ) : (
          <StockPanel initial={products} onSave={handleSave} />
        )}
      </div>
    </div>
  );
}
