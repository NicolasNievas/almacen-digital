"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ShoppingCart } from "lucide-react";
import { STORE } from "@/lib/store";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchCatalog } from "@/lib/supabase/queries";
import type { CartLine, Category, Product } from "@/lib/types";
import type { Checkout } from "@/lib/whatsapp";
import { calcSubtotal, formatARS } from "@/lib/pricing";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import CategoryTabs from "@/components/CategoryTabs";
import Cart from "@/components/Cart";

const PAGE_SIZE = 12;

export default function TiendaPage() {
  const configured = isSupabaseConfigured();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    try {
      const data = await fetchCatalog();
      setProducts(data.products);
      setCategories(data.categories);
      setError(null);
    } catch (err) {
      console.error("No se pudo cargar el catalogo:", err);
      setError("No se pudo cargar la información. Volvé a intentar en unos minutos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    (async () => {
      try {
        const data = await fetchCatalog();
        if (active) {
          setProducts(data.products);
          setCategories(data.categories);
          setError(null);
        }
      } catch (err) {
        console.error("No se pudo cargar el catálogo:", err);
        if (active) setError("No se pudo cargar la información. Volvé a intentar en unos minutos.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [configured]);

  // Refresca el stock al volver a la pestaña (útil tras usar el panel admin/POS).
  useEffect(() => {
    const onFocus = () => {
      if (configured) void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [configured, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchCategory = category === "todas" || p.category_id === category;
      const matchQuery =
        !q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }, [products, query, category]);

  const addToCart = (product: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (!existing) return [...prev, { product, quantity: 1 }];
      if (existing.quantity >= product.stock) return prev;
      return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
    });
  };

  const changeQty = (productId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.product.id !== productId)
        : prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)),
    );
  };

  // Registra el pedido web como PENDING (sin descontar stock). El admin lo confirma.
  const recordWebOrder = async (checkout: Checkout, orderLines: CartLine[]) => {
    const supabase = createClient();
    const { error: orderError } = await supabase.rpc("create_web_order", {
      p_items: orderLines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      p_customer: checkout.name || null,
      p_pickup: checkout.pickupTime || null,
      p_payment: checkout.payment,
    });
    if (orderError) {
      console.error("No se pudo registrar el pedido:", orderError);
      setNotice(
        "No pudimos registrar el pedido en el sistema. El comercio lo recibirá igual por WhatsApp.",
      );
      return;
    }
    setNotice("Pedido registrado como pendiente. El comercio lo confirmará y descontará el stock.");
    setLines([]);
    setCartOpen(false);
  };

  const totalItems = lines.reduce((acc, l) => acc + l.quantity, 0);
  const total = lines.reduce((acc, l) => acc + calcSubtotal(l.product, l.quantity), 0);

  return (
    <div className="flex flex-col space-y-5 pb-20">
      <div className="overflow-hidden rounded-xl bg-gradient-to-r from-brand-solid to-brand-accent px-5 py-4 text-white shadow-sm">
        <p className="text-lg font-extrabold tracking-tight">{STORE.subtitle}</p>
        <p className="text-sm text-white/90">{STORE.slogan}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {loading ? "Cargando catálogo..." : `${products.length} productos disponibles`}
        </div>
        <button
          type="button"
          onClick={() => configured && void load()}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-green-700 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200">
            Cerrar
          </button>
        </div>
      )}

      {!configured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Estamos preparando el catálogo. Volvé a intentar en unos minutos.
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-neutral-500 dark:text-neutral-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando productos...
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <SearchBar
              value={query}
              onChange={(value) => {
                setQuery(value);
                setVisible(PAGE_SIZE);
              }}
            />
            <CategoryTabs
              categories={categories}
              active={category}
              onChange={(id) => {
                setCategory(id);
                setVisible(PAGE_SIZE);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.slice(0, visible).map((product) => {
              const inCart = lines.find((l) => l.product.id === product.id)?.quantity ?? 0;
              return (
                <ProductCard key={product.id} product={product} quantityInCart={inCart} onAdd={addToCart} />
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p className="py-10 text-center text-neutral-500 dark:text-neutral-400">
              No encontramos productos con ese criterio.
            </p>
          )}

          {visible < filtered.length && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
              >
                Cargar más ({filtered.length - visible} restantes)
              </button>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand-solid px-5 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-brand-accent"
      >
        <ShoppingCart size={20} />
        {totalItems > 0 ? `${totalItems} · ${formatARS(total)}` : "Carrito"}
      </button>

      <Cart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        onChangeQty={changeQty}
        store={STORE}
        onConfirm={recordWebOrder}
      />
    </div>
  );
}
