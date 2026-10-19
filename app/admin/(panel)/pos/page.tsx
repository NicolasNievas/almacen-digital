"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import PosScreen from "@/components/admin/PosScreen";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchProducts } from "@/lib/supabase/queries";
import { calcSubtotal } from "@/lib/pricing";
import { printTicket } from "@/lib/printTicket";
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
    const { data, error: saleError } = await supabase.rpc("create_sale", {
      p_source: "POS",
      p_items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      p_customer: customer || null,
      p_pickup: null,
      p_payment: payment,
    });
    if (saleError) throw saleError;

    // Ticket del comprobante recién registrado (formato 80mm).
    printTicket({
      orderId: String(data ?? ""),
      createdAt: new Date().toISOString(),
      customerName: customer || undefined,
      source: "POS",
      paymentMethod: payment,
      items: lines.map((l) => {
        const p = l.product;
        let note: string | undefined;
        if (p.pricing_type === "TIERED" && p.pricing_tiers.length > 0) {
          const best = [...p.pricing_tiers]
            .sort((a, b) => b.min_quantity - a.min_quantity)
            .find((t) => l.quantity >= t.min_quantity);
          if (best) note = `Promo ${best.min_quantity}+ : $${Math.round(best.unit_price)} c/u`;
        } else if (p.pricing_type === "BUNDLE" && p.bundle_size && p.bundle_price) {
          note = `Pack Combo x${p.bundle_size}`;
        }
        return {
          productName: p.name,
          quantity: l.quantity,
          unitPrice: p.unit_price,
          originalUnitPrice: p.unit_price,
          subtotal: calcSubtotal(p, l.quantity),
          note,
        };
      }),
      total: lines.reduce((acc, l) => acc + calcSubtotal(l.product, l.quantity), 0),
      originalTotal: lines.reduce((acc, l) => acc + l.product.unit_price * l.quantity, 0),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Punto de venta</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Caja registradora presencial para cobro rápido y descuento automático de stock.
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
          No pudimos cargar el punto de venta en este momento. Volvé a intentar en unos minutos.
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
