"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ImagePlus, Loader2, Pencil, Plus, RefreshCw, Search, Tags, Trash2 } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import CategoryManager from "@/components/admin/CategoryManager";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  ADMIN_ACTION_GHOST,
  ADMIN_ACTION_PRIMARY,
  ADMIN_CELL_HEAD,
  ADMIN_EMPTY_TEXT,
  ADMIN_EMPTY_TITLE,
  ADMIN_ERROR,
  ADMIN_EYEBROW,
  ADMIN_GRID_HEAD,
  ADMIN_GRID_ROW,
  ADMIN_ICON_BUTTON,
  ADMIN_INPUT,
  ADMIN_LOADING,
} from "@/lib/admin-ui";
import { resolveAdminStoreSlug } from "@/lib/admin-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  deleteProduct,
  fetchAdminStore,
  fetchAllCategories,
  fetchProducts,
  updateProduct,
} from "@/lib/supabase/queries";
import { formatARS } from "@/lib/pricing";
import type { Category, Product } from "@/lib/types";

/**
 * Plantilla de columnas por breakpoint, declarada una sola vez en el wrapper
 * de la tabla. Cabecera y filas leen la misma variable, así que no pueden
 * desalinearse. Cada breakpoint declara tantas columnas como celdas visibles
 * (una celda `hidden` sale del flujo y el autoplacement ocupa el track
 * siguiente):
 * base → Producto · Precio · Estado · Acciones
 * sm   → + Stock
 * xl   → + Categoría
 */
const PRODUCT_TABLE =
  "w-full min-w-[620px] [--admin-table-cols:minmax(0,1fr)_104px_88px_88px] sm:[--admin-table-cols:minmax(0,1fr)_110px_76px_88px_88px] xl:[--admin-table-cols:minmax(0,1.1fr)_minmax(0,1fr)_112px_80px_96px_88px]";

export default function ProductosPage() {
  const configured = isSupabaseConfigured();
  const params = useParams<{ storeSlug: string }>();
  const storeSlug = resolveAdminStoreSlug(params.storeSlug);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState("");
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const loading = loadedSlug !== storeSlug;
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const store = await fetchAdminStore(storeSlug);
      const [prods, cats] = await Promise.all([
        fetchProducts(store.id),
        fetchAllCategories(store.id),
      ]);
      setStoreId(store.id);
      setProducts(prods);
      setCategories(cats);
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
        const [prods, cats] = await Promise.all([
          fetchProducts(store.id),
          fetchAllCategories(store.id),
        ]);
        if (active) {
          setStoreId(store.id);
          setProducts(prods);
          setCategories(cats);
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

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || categoryName(p.category_id).toLowerCase().includes(q),
    );
  }, [products, query, categoryName]);

  const toggleActive = async (product: Product) => {
    setBusyId(product.id);
    setError(null);
    try {
      await updateProduct(product.id, { active: !product.active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el producto.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    const product = toDelete;
    setBusyId(product.id);
    setError(null);
    try {
      await deleteProduct(product.id);
      setToDelete(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Probablemente tenga ventas asociadas: usá "Pausar".`
          : "No se pudo eliminar el producto.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catálogo"
        title="Productos"
        description="Alta, edición y estado de publicación de cada pieza del catálogo."
        actions={
          <>
            <button type="button" onClick={() => setManagingCategories(true)} className={ADMIN_ACTION_GHOST}>
              <Tags size={14} strokeWidth={1.5} /> Categorías
            </button>
            <button type="button" onClick={() => void load()} className={ADMIN_ACTION_GHOST}>
              <RefreshCw size={14} strokeWidth={1.5} /> Actualizar
            </button>
            <button type="button" onClick={() => setCreating(true)} className={ADMIN_ACTION_PRIMARY}>
              <Plus size={14} strokeWidth={1.5} /> Nuevo producto
            </button>
          </>
        }
      />

      {error && (
        <p className={ADMIN_ERROR} role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="relative block w-full max-w-xs">
          <span className="sr-only">Buscar producto</span>
          <Search
            size={15}
            strokeWidth={1.5}
            className="pointer-events-none absolute bottom-2.5 left-0 text-[var(--admin-faint)]"
          />
          <input
            className={`${ADMIN_INPUT} pl-6`}
            placeholder="Buscar por nombre o categoría"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <p className={ADMIN_EYEBROW}>
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
        </p>
      </div>

      {!configured ? (
        <div className="border-y border-[var(--admin-line)] py-16">
          <p className={ADMIN_EMPTY_TITLE}>Catálogo no disponible</p>
          <p className={`${ADMIN_EMPTY_TEXT} mt-2`}>
            No pudimos cargar los productos. Volvé a intentar en unos minutos.
          </p>
        </div>
      ) : loading ? (
        <div className={ADMIN_LOADING}>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Cargando productos
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-y border-[var(--admin-line)] py-16">
          <p className={ADMIN_EMPTY_TITLE}>{products.length === 0 ? "Todavía no hay productos" : "Sin coincidencias"}</p>
          <p className={`${ADMIN_EMPTY_TEXT} mt-2`}>
            {products.length === 0
              ? "Creá la primera pieza del catálogo para empezar a vender."
              : "Probá con otro nombre o revisá la categoría."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div role="table" aria-label="Productos" className={PRODUCT_TABLE}>
            <div role="rowgroup">
              <div role="row" className={ADMIN_GRID_HEAD}>
                <div role="columnheader" className={ADMIN_CELL_HEAD}>
                  Producto
                </div>
                <div role="columnheader" className={`${ADMIN_CELL_HEAD} hidden xl:block`}>
                  Categoría
                </div>
                <div role="columnheader" className={`${ADMIN_CELL_HEAD} text-right`}>
                  Precio
                </div>
                <div role="columnheader" className={`${ADMIN_CELL_HEAD} hidden text-right sm:block`}>
                  Stock
                </div>
                <div role="columnheader" className={`${ADMIN_CELL_HEAD} text-center`}>
                  Estado
                </div>
                <div role="columnheader" className={`${ADMIN_CELL_HEAD} text-right`}>
                  Acciones
                </div>
              </div>
            </div>
            <div role="rowgroup">
              {filtered.map((product) => {
                const busy = busyId === product.id;
                return (
                  <div key={product.id} role="row" className={ADMIN_GRID_ROW}>
                    <div role="cell" className="min-w-0 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden bg-[var(--admin-surface)]">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlus size={17} strokeWidth={1.5} className="text-[var(--admin-faint)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm leading-5 text-[var(--admin-ink)]">{product.name}</p>
                          <p className="mt-0.5 truncate text-[11px] leading-4 text-[var(--admin-muted)] xl:hidden">
                            {categoryName(product.category_id)}
                            <span className="sm:hidden"> · Stock {product.stock}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div
                      role="cell"
                      className="hidden truncate py-4 text-[13px] text-[var(--admin-muted)] xl:block"
                    >
                      {categoryName(product.category_id)}
                    </div>
                    <div role="cell" className="py-4 text-right text-[13px] tabular-nums text-[var(--admin-ink)]">
                      {formatARS(product.unit_price)}
                    </div>
                    <div
                      role="cell"
                      className="hidden py-4 text-right text-[13px] tabular-nums text-[var(--admin-muted)] sm:block"
                    >
                      {product.stock}
                    </div>
                    <div role="cell" className="py-4 text-center">
                      <button
                        type="button"
                        onClick={() => void toggleActive(product)}
                        disabled={busy}
                        aria-pressed={product.active}
                        title={product.active ? "Pausar publicación" : "Publicar producto"}
                        className="inline-flex items-center gap-2 text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)] disabled:opacity-40"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            product.active
                              ? "bg-[var(--admin-positive)]"
                              : "border border-[var(--admin-faint)] bg-transparent"
                          }`}
                        />
                        {product.active ? "Activo" : "Pausado"}
                      </button>
                    </div>
                    <div role="cell" className="flex items-center justify-end gap-1 py-4">
                      <button
                        type="button"
                        onClick={() => setEditing(product)}
                        className={ADMIN_ICON_BUTTON}
                        aria-label={`Editar ${product.name}`}
                      >
                        <Pencil size={15} strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(product)}
                        disabled={busy}
                        className={`${ADMIN_ICON_BUTTON} hover:text-[var(--admin-danger)]`}
                        aria-label={`Eliminar ${product.name}`}
                      >
                        {busy ? (
                          <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {(creating || editing) && storeId && (
        <ProductForm
          product={editing}
          categories={categories}
          storeId={storeId}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => void load()}
        />
      )}

      {managingCategories && storeId && (
        <CategoryManager
          categories={categories}
          storeId={storeId}
          onClose={() => setManagingCategories(false)}
          onSaved={() => void load()}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar producto"
          message={
            <>
              ¿Seguro que querés eliminar <b>{toDelete.name}</b>? Si tiene ventas asociadas, conviene pausarlo en
              su lugar.
            </>
          }
          loading={busyId === toDelete.id}
          onConfirm={() => void remove()}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
