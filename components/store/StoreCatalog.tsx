"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ShoppingCart, Sparkles } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchCatalog } from "@/lib/supabase/queries";
import type { BusinessType, CartLine, Category, Checkout, Product, ProductVariant, Store } from "@/lib/types";
import { calcSubtotal, formatARS } from "@/lib/pricing";
import { addLine, cartItemCount, updateLineNote, updateLineQuantity } from "@/lib/cart";
import {
  CART_COUNT_EVENT,
  CATEGORY_EVENT,
  OPEN_CART_EVENT,
  SEARCH_EVENT,
  dispatchStoreEvent,
  type CartCountDetail,
  type CategorySelection,
  type SearchSelection,
} from "@/lib/store-events";
import { createMercadoPagoPreference, toMercadoPagoItems } from "@/lib/mercadopago";
import { BUSINESS_TYPE_LABELS } from "@/lib/store-settings";
import ProductCard from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
import SearchBar from "@/components/SearchBar";
import CategoryTabs from "@/components/CategoryTabs";
import Cart from "@/components/Cart";

const PAGE_SIZE = 12;

const HERO_GRADIENTS: Record<BusinessType, string> = {
  MAYORISTA: "from-blue-700 via-blue-600 to-cyan-500",
  GASTRONOMY: "from-orange-600 via-amber-500 to-yellow-400",
  CLOTHING: "from-fuchsia-700 via-purple-600 to-indigo-500",
};

type Props = { store: Store };

export default function StoreCatalog({ store }: Props) {
  const configured = isSupabaseConfigured();
  const { settings } = store;
  const { features } = settings;
  const isBoutique = settings.design.storefront_layout === "boutique";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    try {
      const data = await fetchCatalog(store.id);
      setProducts(data.products);
      setCategories(data.categories);
      setError(null);
    } catch (err) {
      console.error("No se pudo cargar el catálogo:", err);
      setError("No se pudo cargar la información. Volvé a intentar en unos minutos.");
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    (async () => {
      try {
        const data = await fetchCatalog(store.id);
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
  }, [configured, store.id]);

  // Refresca el stock al volver a la pestaña (útil tras usar el panel admin/POS).
  useEffect(() => {
    const onFocus = () => {
      if (configured) void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [configured, load]);

  // La navbar no duplica el estado: emite eventos y el catálogo los aplica.
  useEffect(() => {
    const openCart = () => setCartOpen(true);

    const onSearch = (event: Event) => {
      const detail = (event as CustomEvent<SearchSelection>).detail;
      setQuery(detail?.query ?? "");
      setVisible(PAGE_SIZE);
    };

    const onCategory = (event: Event) => {
      const detail = (event as CustomEvent<CategorySelection>).detail;
      if (!detail?.categoryId) return;
      setCategory(detail.categoryId);
      setQuery(detail.tag ?? "");
      setVisible(PAGE_SIZE);
    };

    window.addEventListener(OPEN_CART_EVENT, openCart);
    window.addEventListener(SEARCH_EVENT, onSearch);
    window.addEventListener(CATEGORY_EVENT, onCategory);

    return () => {
      window.removeEventListener(OPEN_CART_EVENT, openCart);
      window.removeEventListener(SEARCH_EVENT, onSearch);
      window.removeEventListener(CATEGORY_EVENT, onCategory);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchCategory = category === "todas" || p.category_id === category;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }, [products, query, category]);

  const addToCart = (product: Product, quantity = 1, variant?: ProductVariant, note?: string) => {
    setLines((prev) => addLine(prev, product, quantity, variant, note));
  };

  const changeQty = (lineId: string, quantity: number) => {
    setLines((prev) => updateLineQuantity(prev, lineId, quantity));
  };

  const changeNote = (lineId: string, note: string) => {
    setLines((prev) => updateLineNote(prev, lineId, note));
  };

  /**
   * Registra el pedido web como PENDING (sin descontar stock). El admin lo
   * confirma desde el panel. Devuelve el id del pedido o null si falló.
   */
  const createWebOrder = async (checkout: Checkout, orderLines: CartLine[]): Promise<string | null> => {
    if (!configured) return null;
    try {
      const supabase = createClient();
      const { data, error: orderError } = await supabase.rpc("create_web_order", {
        p_store: store.id,
        p_items: orderLines.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
          variant: line.variant ?? {},
          note: line.note ?? null,
        })),
        p_customer: checkout.name || null,
        p_phone: checkout.phone || null,
        p_pickup: checkout.fulfillment === "PICKUP" ? checkout.pickupTime : null,
        p_payment: checkout.payment,
        p_fulfillment: checkout.fulfillment,
        p_address: checkout.fulfillment === "DELIVERY" ? checkout.address : null,
        p_notes: checkout.notes || null,
      });
      if (orderError) throw orderError;
      return data ? String(data) : null;
    } catch (err) {
      console.error("No se pudo registrar el pedido:", err);
      setNotice("No pudimos registrar el pedido en el sistema. El comercio lo recibirá igual por WhatsApp.");
      return null;
    }
  };

  const recordWebOrder = async (checkout: Checkout, orderLines: CartLine[]) => {
    const orderId = await createWebOrder(checkout, orderLines);
    if (orderId) {
      setNotice("Pedido registrado como pendiente. El comercio lo confirmará y descontará el stock.");
    }
    setLines([]);
    setCartOpen(false);
  };

  const payWithMercadoPago = async (checkout: Checkout, orderLines: CartLine[]) => {
    const orderId = await createWebOrder(checkout, orderLines);
    if (!orderId) throw new Error("No se pudo registrar el pedido. Intentá de nuevo o usá WhatsApp.");

    const preference = await createMercadoPagoPreference({
      storeSlug: store.slug,
      storeName: store.name,
      orderId,
      payerName: checkout.name,
      payerPhone: checkout.phone,
      items: toMercadoPagoItems(orderLines, (line) => calcSubtotal(line.product, line.quantity) / line.quantity),
    });

    window.location.href = preference.init_point;
  };

  const totalItems = cartItemCount(lines);
  const total = lines.reduce((acc, line) => acc + calcSubtotal(line.product, line.quantity), 0);

  // Mantiene el badge de la navbar sincronizado sin duplicar el carrito.
  useEffect(() => {
    dispatchStoreEvent<CartCountDetail>(CART_COUNT_EVENT, { count: totalItems });
  }, [totalItems]);

  const featureChips = [
    features.variants_enabled ? "Talles y colores" : null,
    features.custom_notes ? "Aclaraciones por ítem" : null,
    settings.fulfillment.shipping_enabled ? "Delivery" : null,
    settings.fulfillment.pickup_enabled ? "Retiro en local" : null,
    settings.checkout_type === "MERCADO_PAGO" ? "Mercado Pago" : "Pedido por WhatsApp",
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <div
      id="catalogo"
      className={
        isBoutique
          ? "flex scroll-mt-24 flex-col gap-8 pb-24 pt-16 md:pt-24"
          : "flex scroll-mt-24 flex-col space-y-5 pb-20"
      }
    >
      {!isBoutique && (
        <div
          id="nosotros"
          className={`scroll-mt-24 overflow-hidden rounded-2xl bg-gradient-to-br ${HERO_GRADIENTS[settings.business_type]} px-5 py-6 text-white shadow-lg sm:px-7`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide backdrop-blur">
              {BUSINESS_TYPE_LABELS[settings.business_type]}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-white/90">
              <Sparkles size={12} /> Catálogo online
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{store.subtitle || store.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/90">{store.slogan}</p>
          {featureChips.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {featureChips.map((chip) => (
                <span key={chip} className="rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className={
          isBoutique
            ? "flex flex-wrap items-baseline justify-between gap-3"
            : "flex items-center justify-between gap-3"
        }
      >
        <div
          className={
            isBoutique
              ? "[font-family:var(--store-font-body)] text-[11px] uppercase leading-none tracking-[0.16em] text-[var(--store-ink-muted)]"
              : "text-sm text-neutral-500 dark:text-neutral-400"
          }
        >
          {loading
            ? "Cargando catálogo..."
            : isBoutique
              ? `${filtered.length} ${filtered.length === 1 ? "pieza" : "piezas"}`
              : `${products.length} productos disponibles`}
        </div>

        {!isBoutique && (
          <button
            type="button"
            onClick={() => configured && void load()}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        )}
      </div>

      {isBoutique && query.trim() && (
        <p className="-mt-4 [font-family:var(--store-font-body)] text-[11px] uppercase leading-none tracking-[0.14em] text-[var(--store-ink-muted)]">
          Resultados para «{query.trim()}»
        </p>
      )}

      {notice && (
        <div
          className={
            isBoutique
              ? "flex items-start justify-between gap-3 border-y border-[var(--store-divider)] py-3 [font-family:var(--store-font-body)] text-sm text-[var(--store-ink)]"
              : "flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300"
          }
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className={
              isBoutique
                ? "shrink-0 text-[11px] uppercase tracking-[0.1em] text-[var(--store-ink-muted)] hover:text-[var(--store-ink)]"
                : "text-green-700 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200"
            }
          >
            Cerrar
          </button>
        </div>
      )}

      {!configured ? (
        <div
          className={
            isBoutique
              ? "border-y border-[var(--store-divider)] py-16 text-center [font-family:var(--store-font-body)] text-sm text-[var(--store-ink-muted)]"
              : "rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
          }
        >
          Estamos preparando el catálogo. Volvé a intentar en unos minutos.
        </div>
      ) : error ? (
        <div
          className={
            isBoutique
              ? "border-y border-[var(--store-divider)] py-16 text-center [font-family:var(--store-font-body)] text-sm text-[var(--store-ink)]"
              : "rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          }
        >
          {error}
        </div>
      ) : loading ? (
        <div
          className={
            isBoutique
              ? "flex items-center justify-center gap-2 py-32 [font-family:var(--store-font-body)] text-[11px] uppercase tracking-[0.16em] text-[var(--store-ink-muted)]"
              : "flex items-center justify-center gap-2 py-20 text-neutral-500 dark:text-neutral-400"
          }
        >
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={isBoutique ? 1.5 : undefined} /> Cargando productos...
        </div>
      ) : (
        <>
          {!isBoutique && (
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
          )}

          <div
            className={
              isBoutique
                ? "grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
                : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            }
          >
            {filtered.slice(0, visible).map((product) => {
              const inCart = lines
                .filter((line) => line.product.id === product.id)
                .reduce((acc, line) => acc + line.quantity, 0);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantityInCart={inCart}
                  onAdd={(item) => addToCart(item)}
                  onOpen={setSelected}
                  showStockAlerts={features.stock_alerts}
                  galleryEnabled={features.gallery_enabled}
                  requiresVariantSelection={
                    features.variants_enabled &&
                    (product.sizes.length > 0 || product.colors.length > 0)
                  }
                  layout={isBoutique ? "boutique" : "retail"}
                />
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p
              className={
                isBoutique
                  ? "py-24 text-center [font-family:var(--store-font-heading)] text-[24px] leading-[1.2] text-[var(--store-ink)]"
                  : "py-10 text-center text-neutral-500 dark:text-neutral-400"
              }
            >
              No encontramos {isBoutique ? "piezas" : "productos"} con ese criterio.
            </p>
          )}

          {visible < filtered.length && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className={
                  isBoutique
                    ? "[font-family:var(--store-font-body)] text-[11px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--store-ink)] underline decoration-[var(--store-divider)] decoration-1 underline-offset-8 transition-colors duration-300 hover:decoration-[var(--store-ink)] motion-reduce:transition-none"
                    : "rounded-lg border border-neutral-300 bg-white px-5 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
                }
              >
                Cargar más ({filtered.length - visible} restantes)
              </button>
            </div>
          )}
        </>
      )}

      {!isBoutique && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand-solid px-5 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-brand-accent"
        >
          <ShoppingCart size={20} />
          {totalItems > 0 ? `${totalItems} · ${formatARS(total)}` : "Carrito"}
        </button>
      )}

      {selected && (
        <ProductDetailModal
          key={selected.id}
          product={selected}
          store={store}
          onClose={() => setSelected(null)}
          onAdd={addToCart}
        />
      )}

      <Cart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        onChangeQty={changeQty}
        onChangeNote={changeNote}
        store={store}
        onConfirm={recordWebOrder}
        onMercadoPago={payWithMercadoPago}
      />
    </div>
  );
}
