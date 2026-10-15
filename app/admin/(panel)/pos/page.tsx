"use client";

import { useEffect, useState } from "react";
import PosScreen from "@/components/admin/PosScreen";
import mock from "@/data/products_mock.json";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { CartLine, Product, StoreData } from "@/lib/types";

const fallback = (mock as unknown as StoreData).products as Product[];

export default function PosPage() {
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

  const handleCheckout = async (lines: CartLine[], customer: string, payment: string) => {
    if (!configured) return; // Fase 1: PosScreen descuenta stock en memoria.
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
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Punto de venta</h1>
        <p className="text-sm text-neutral-500">
          {configured
            ? "Las ventas descuentan stock en Supabase mediante el RPC create_sale (source POS)."
            : "Fase 1: la venta descuenta stock en memoria. Configurá .env.local para registrar en Supabase."}
        </p>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-sm text-neutral-500">Cargando productos...</p>
      ) : (
        <PosScreen products={products} onCheckout={handleCheckout} />
      )}
    </div>
  );
}
