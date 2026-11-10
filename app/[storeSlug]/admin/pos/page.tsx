"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import PosScreen from "@/components/admin/PosScreen";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  ADMIN_ACTION_GHOST,
  ADMIN_EMPTY_TEXT,
  ADMIN_EMPTY_TITLE,
  ADMIN_ERROR,
  ADMIN_LOADING,
} from "@/lib/admin-ui";
import { resolveAdminStoreSlug } from "@/lib/admin-store";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchAdminStore, fetchProducts } from "@/lib/supabase/queries";
import { calcSubtotal } from "@/lib/pricing";
import { printTicket } from "@/lib/printTicket";
import type { CartLine, Product } from "@/lib/types";

export default function PosPage() {
  const configured = isSupabaseConfigured();
  const params = useParams<{ storeSlug: string }>();
  const storeSlug = resolveAdminStoreSlug(params.storeSlug);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeId, setStoreId] = useState("");
  const [version, setVersion] = useState(0);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const loading = loadedSlug !== storeSlug;
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const store = await fetchAdminStore(storeSlug);
      setStoreId(store.id);
      setProducts(await fetchProducts(store.id));
      setVersion((v) => v + 1);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los productos.");
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
        const data = await fetchProducts(store.id);
        if (active) {
          setStoreId(store.id);
          setProducts(data);
          setVersion((v) => v + 1);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No se pudieron cargar los productos.");
      } finally {
        if (active) setLoadedSlug(storeSlug);
      }
    })();
    return () => {
      active = false;
    };
  }, [configured, storeSlug]);

  const handleCheckout = async (lines: CartLine[], customer: string, payment: string) => {
    if (!storeId) throw new Error("No se pudo identificar la tienda del panel.");
    const supabase = createClient();
    const { data, error: saleError } = await supabase.rpc("create_sale", {
      p_store: storeId,
      p_source: "POS",
      p_items: lines.map((l) => ({
        product_id: l.product.id,
        quantity: l.quantity,
        variant: l.variant ?? {},
        note: l.note ?? null,
      })),
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
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Caja"
        title="Punto de venta"
        description="Cobro presencial con descuento automático de stock y ticket de 80 mm."
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

      {error && (
        <p className={ADMIN_ERROR} role="alert">
          {error}
        </p>
      )}

      {!configured ? (
        <div className="border-y border-[var(--admin-line)] py-16">
          <p className={ADMIN_EMPTY_TITLE}>Caja no disponible</p>
          <p className={`${ADMIN_EMPTY_TEXT} mt-2`}>
            No pudimos cargar el punto de venta. Volvé a intentar en unos minutos.
          </p>
        </div>
      ) : loading ? (
        <div className={ADMIN_LOADING}>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Preparando la caja
        </div>
      ) : storeId ? (
        <PosScreen key={version} products={products} onCheckout={handleCheckout} />
      ) : (
        <div className="border-y border-[var(--admin-line)] py-16">
          <p className={ADMIN_EMPTY_TITLE}>Tienda no identificada</p>
          <p className={`${ADMIN_EMPTY_TEXT} mt-2`}>
            Verificá que la tienda exista y que tu usuario tenga acceso.
          </p>
        </div>
      )}
    </div>
  );
}
