"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import type { CartLine, Product } from "@/lib/types";
import { calcSubtotal, formatARS } from "@/lib/pricing";
import { makeLineId } from "@/lib/cart";

type Props = {
  products: Product[];
  // Se conecta al RPC `create_sale` de Supabase.
  onCheckout?: (lines: CartLine[], customer: string, payment: string) => Promise<void> | void;
};

const PAYMENTS = ["Efectivo", "Transferencia", "Débito", "Crédito"] as const;
const PAGE_SIZE = 12;

export default function PosScreen({ products, onCheckout }: Props) {
  const [catalog, setCatalog] = useState(products);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState<string>(PAYMENTS[0]);
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((p) => p.active)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)));
  }, [catalog, query]);

  const total = useMemo(() => lines.reduce((a, l) => a + calcSubtotal(l.product, l.quantity), 0), [lines]);

  const add = (product: Product) => {
    setMessage(null);
    const lineId = makeLineId(product.id);
    setLines((prev) => {
      const existing = prev.find((l) => l.lineId === lineId);
      if (!existing) return [...prev, { lineId, product, quantity: 1 }];
      if (existing.quantity + 1 > product.stock) return prev;
      return prev.map((l) => (l.lineId === lineId ? { ...l, quantity: l.quantity + 1 } : l));
    });
  };

  const changeQty = (lineId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.lineId !== lineId)
        : prev.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
    );
  };

  const confirm = async () => {
    if (lines.length === 0) return;
    setProcessing(true);
    setMessage(null);
    try {
      await onCheckout?.(lines, customer.trim(), payment);
      // El RPC ya descontó el stock en Supabase: reflejamos la venta en la UI.
      setCatalog((prev) =>
        prev.map((p) => {
          const line = lines.find((l) => l.product.id === p.id);
          return line ? { ...p, stock: Math.max(0, p.stock - line.quantity) } : p;
        }),
      );
      setLines([]);
      setCustomer("");
      setMessage("Venta registrada correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la venta.");
    } finally {
      setProcessing(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Buscar producto para vender..."
            className={`${inputClass} py-2.5 pl-9 pr-3`}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {available.slice(0, visible).map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={p.stock <= 0}
              onClick={() => add(p)}
              className="flex flex-col items-start rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-brand disabled:opacity-40 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <span className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
              <span className="mt-1 text-sm font-bold text-neutral-900 dark:text-neutral-100">{formatARS(p.unit_price)}</span>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">Stock: {p.stock}</span>
            </button>
          ))}
          {available.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Sin resultados.</p>}
        </div>

        {visible < available.length && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
            >
              Cargar más
            </button>
          </div>
        )}
      </section>

      <aside className="flex h-fit flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          <ShoppingCart size={18} /> Ticket
        </h2>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {lines.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Agregá productos para vender.</p>}
          {lines.map((l) => (
            <div key={l.lineId} className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{l.product.name}</span>
                <button
                  type="button"
                  onClick={() => changeQty(l.lineId, 0)}
                  className="text-neutral-400 hover:text-red-600"
                  aria-label="Quitar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-neutral-300 p-1 dark:border-neutral-700"
                    onClick={() => changeQty(l.lineId, l.quantity - 1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm text-neutral-900 dark:text-neutral-100">{l.quantity}</span>
                  <button
                    type="button"
                    disabled={l.quantity >= l.product.stock}
                    className="rounded border border-neutral-300 p-1 disabled:opacity-30 dark:border-neutral-700"
                    onClick={() => changeQty(l.lineId, l.quantity + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatARS(calcSubtotal(l.product, l.quantity))}
                </span>
              </div>
            </div>
          ))}
        </div>

        <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Cliente (opcional)" className={inputClass} />

        <select value={payment} onChange={(e) => setPayment(e.target.value)} className={inputClass}>
          {PAYMENTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <div className="flex justify-between text-lg font-bold text-neutral-900 dark:text-neutral-100">
          <span>Total</span>
          <span>{formatARS(total)}</span>
        </div>

        <button
          type="button"
          disabled={lines.length === 0 || processing}
          onClick={confirm}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-solid py-2.5 font-semibold text-white hover:bg-brand-accent disabled:opacity-40"
        >
          <CheckCircle2 size={18} /> {processing ? "Procesando..." : "Confirmar venta"}
        </button>

        {message && (
          <p className="rounded bg-neutral-100 p-2 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{message}</p>
        )}
      </aside>
    </div>
  );
}
