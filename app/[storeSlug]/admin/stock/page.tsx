"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import StockPanel from "@/components/admin/StockPanel";
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
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchAdminStore, fetchProducts } from "@/lib/supabase/queries";
import type { Product } from "@/lib/types";

type Patch = Partial<Pick<Product, "stock" | "unit_price" | "active">>;

const LOW_STOCK = 5;

export default function StockPage() {
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
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Inventario"
        title="Stock"
        description="Existencias, precio de lista y disponibilidad en góndola, en una sola lectura."
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
          <p className={ADMIN_EMPTY_TITLE}>Stock no disponible</p>
          <p className={`${ADMIN_EMPTY_TEXT} mt-2`}>
            No pudimos cargar el inventario. Volvé a intentar en unos minutos.
          </p>
        </div>
      ) : loading ? (
        <div className={ADMIN_LOADING}>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Cargando inventario
        </div>
      ) : storeId ? (
        <>
          {critical.length > 0 && (
            <section aria-label="Reposición sugerida" className="border-t border-[var(--admin-line)] pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={ADMIN_EYEBROW}>Reposición sugerida</p>
                <p className="text-[11px] leading-none text-[var(--admin-muted)]">
                  {critical.length} {critical.length === 1 ? "producto" : "productos"} por debajo de {LOW_STOCK}{" "}
                  unidades
                </p>
              </div>
              <ul className="mt-3 divide-y divide-[var(--admin-line)] border-y border-[var(--admin-line)]">
                {critical.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                    <span className="flex min-w-0 items-center gap-2 text-[13px] leading-5 text-[var(--admin-ink)]">
                      <AlertTriangle
                        size={13}
                        strokeWidth={1.5}
                        className="shrink-0 text-[var(--admin-warning)]"
                      />
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span
                      className={`shrink-0 text-[10px] uppercase leading-none tracking-[0.12em] ${
                        p.stock === 0 ? "text-[var(--admin-danger)]" : "text-[var(--admin-warning)]"
                      }`}
                    >
                      {p.stock === 0 ? "Agotado" : `${p.stock} unidades`}
                    </span>
                  </li>
                ))}
              </ul>
              {critical.length > 8 && (
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--admin-faint)]">
                  y {critical.length - 8} más
                </p>
              )}
            </section>
          )}

          <StockPanel key={version} initial={products} onSave={handleSave} />
        </>
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
