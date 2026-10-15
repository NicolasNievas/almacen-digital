"use client";

import { useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import mock from "@/data/products_mock.json";
import type { CartLine, Product, StoreData } from "@/lib/types";
import { calcSubtotal, formatARS } from "@/lib/pricing";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import CategoryTabs from "@/components/CategoryTabs";
import Cart from "@/components/Cart";

const data = mock as unknown as StoreData;
const catalog = data.products.filter((p) => p.active);

export default function TiendaPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((p) => {
      const matchCategory = category === "todas" || p.category_id === category;
      const matchQuery =
        !q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }, [query, category]);

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

  const totalItems = lines.reduce((acc, l) => acc + l.quantity, 0);
  const total = lines.reduce((acc, l) => acc + calcSubtotal(l.product, l.quantity), 0);

  return (
    <div className="space-y-5 pb-20">
      <div className="space-y-3">
        <SearchBar value={query} onChange={setQuery} />
        <CategoryTabs categories={data.categories} active={category} onChange={setCategory} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((product) => {
          const inCart = lines.find((l) => l.product.id === product.id)?.quantity ?? 0;
          return (
            <ProductCard key={product.id} product={product} quantityInCart={inCart} onAdd={addToCart} />
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-neutral-500">No encontramos productos con ese criterio.</p>
      )}

      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-green-700"
      >
        <ShoppingCart size={20} />
        {totalItems > 0 ? `${totalItems} · ${formatARS(total)}` : "Carrito"}
      </button>

      <Cart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        onChangeQty={changeQty}
        store={data.store}
      />
    </div>
  );
}
