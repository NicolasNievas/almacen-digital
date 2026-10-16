"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, Pencil, Plus, RefreshCw, Search, Tags, Trash2 } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import CategoryManager from "@/components/admin/CategoryManager";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { deleteProduct, fetchAllCategories, fetchProducts, updateProduct } from "@/lib/supabase/queries";
import { formatARS } from "@/lib/pricing";
import type { Category, Product } from "@/lib/types";

export default function ProductosPage() {
  const configured = isSupabaseConfigured();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([fetchProducts(), fetchAllCategories()]);
      setProducts(prods);
      setCategories(cats);
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
        const [prods, cats] = await Promise.all([fetchProducts(), fetchAllCategories()]);
        if (active) {
          setProducts(prods);
          setCategories(cats);
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

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || categoryName(p.category_id).toLowerCase().includes(q));
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

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 outline-none focus:border-green-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Productos</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Crear, editar, pausar y eliminar productos, con imagen desde Cloudinary.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setManagingCategories(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
          >
            <Tags size={15} /> Categorías
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
          >
            <RefreshCw size={15} /> Actualizar
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Plus size={15} /> Nuevo producto
          </button>
        </div>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input className={inputClass} placeholder="Buscar producto…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {!configured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Configurá <code>.env.local</code> para administrar el catálogo.
        </p>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-neutral-500 dark:text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando productos...
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.map((product) => (
              <li key={product.id} className="flex items-center gap-3 p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-neutral-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">{product.name}</p>
                    {!product.active && (
                      <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                        Pausado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {categoryName(product.category_id)} · {formatARS(product.unit_price)} · Stock {product.stock}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleActive(product)}
                  disabled={busyId === product.id}
                  className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
                    product.active
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-neutral-300 text-neutral-700 hover:bg-neutral-400 dark:bg-neutral-700 dark:text-neutral-200"
                  }`}
                >
                  {product.active ? "Activo" : "Pausado"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(product)}
                  className="rounded-lg border border-neutral-300 p-2 text-neutral-600 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-white"
                  aria-label="Editar"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(product)}
                  disabled={busyId === product.id}
                  className="rounded-lg border border-neutral-300 p-2 text-neutral-600 hover:text-red-600 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
                  aria-label="Eliminar"
                >
                  {busyId === product.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="p-10 text-center text-sm text-neutral-500 dark:text-neutral-400">No hay productos.</li>
            )}
          </ul>
        </div>
      )}

      {(creating || editing) && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => void load()}
        />
      )}

      {managingCategories && (
        <CategoryManager categories={categories} onClose={() => setManagingCategories(false)} onSaved={() => void load()} />
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
