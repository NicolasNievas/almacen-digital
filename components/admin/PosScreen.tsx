"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import {
  ADMIN_ACTION_PRIMARY,
  ADMIN_EYEBROW,
  ADMIN_INPUT,
} from "@/lib/admin-ui";
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
  const [messageOk, setMessageOk] = useState(false);
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
      setMessageOk(true);
      setMessage("Venta registrada correctamente.");
    } catch (error) {
      setMessageOk(false);
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la venta.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      <section>
        <label className="relative block border-b border-[var(--admin-line-strong)]">
          <span className="sr-only">Buscar producto para vender</span>
          <Search
            size={15}
            strokeWidth={1.5}
            className="pointer-events-none absolute bottom-2.5 left-0 text-[var(--admin-faint)]"
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Buscar producto para vender"
            className="w-full appearance-none border-0 bg-transparent py-2 pl-6 text-sm text-[var(--admin-ink)] outline-none placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-ink)]"
          />
        </label>

        {available.length === 0 ? (
          <p className="border-b border-[var(--admin-line)] py-12 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--admin-faint)]">
            Sin resultados
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3">
            {available.slice(0, visible).map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={p.stock <= 0}
                onClick={() => add(p)}
                className="group flex flex-col items-start border-b border-[var(--admin-line)] py-4 pr-6 text-left transition-colors duration-200 hover:bg-[var(--admin-surface)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
              >
                <span className="line-clamp-2 text-sm leading-5 text-[var(--admin-ink)] group-hover:underline group-hover:underline-offset-4">
                  {p.name}
                </span>
                <span className="mt-2 text-[13px] tabular-nums text-[var(--admin-ink)]">
                  {formatARS(p.unit_price)}
                </span>
                <span className="mt-1 text-[10px] uppercase leading-none tracking-[0.12em] text-[var(--admin-faint)]">
                  Stock {p.stock}
                </span>
              </button>
            ))}
          </div>
        )}

        {visible < available.length && (
          <div className="flex justify-center pt-6">
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)]"
            >
              Cargar más productos
            </button>
          </div>
        )}
      </section>

      <aside className="h-fit border-t border-[var(--admin-line)] pt-5 lg:sticky lg:top-10 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className={`${ADMIN_EYEBROW} flex items-center gap-2`}>
            <ShoppingCart size={13} strokeWidth={1.5} /> Ticket
          </h2>
          <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-[var(--admin-faint)]">
            {lines.length} {lines.length === 1 ? "ítem" : "ítems"}
          </span>
        </div>

        <div className="mt-4 max-h-72 overflow-y-auto border-y border-[var(--admin-line)]">
          {lines.length === 0 ? (
            <p className="py-8 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--admin-faint)]">
              Agregá productos para vender
            </p>
          ) : (
            <ul className="divide-y divide-[var(--admin-line)]">
              {lines.map((l) => (
                <li key={l.lineId} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[13px] leading-5 text-[var(--admin-ink)]">{l.product.name}</span>
                    <button
                      type="button"
                      onClick={() => changeQty(l.lineId, 0)}
                      className="text-[var(--admin-faint)] transition-colors hover:text-[var(--admin-danger)]"
                      aria-label={`Quitar ${l.product.name}`}
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center border-b border-[var(--admin-line)]">
                      <button
                        type="button"
                        className="inline-flex h-7 w-6 items-center justify-center text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)]"
                        onClick={() => changeQty(l.lineId, l.quantity - 1)}
                        aria-label="Restar unidad"
                      >
                        <Minus size={12} strokeWidth={1.5} />
                      </button>
                      <span className="w-7 text-center text-[13px] tabular-nums text-[var(--admin-ink)]">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={l.quantity >= l.product.stock}
                        className="inline-flex h-7 w-6 items-center justify-center text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)] disabled:opacity-30"
                        onClick={() => changeQty(l.lineId, l.quantity + 1)}
                        aria-label="Sumar unidad"
                      >
                        <Plus size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                    <span className="text-[13px] tabular-nums text-[var(--admin-ink)]">
                      {formatARS(calcSubtotal(l.product, l.quantity))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 space-y-5">
          <label className="block">
            <span className={ADMIN_EYEBROW}>Cliente · opcional</span>
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Nombre del cliente"
              className={`${ADMIN_INPUT} mt-2`}
            />
          </label>

          <label className="block">
            <span className={ADMIN_EYEBROW}>Medio de pago</span>
            <span className="relative mt-2 block">
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className={`${ADMIN_INPUT} pr-6`}
              >
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                strokeWidth={1.5}
                className="pointer-events-none absolute bottom-2.5 right-0 text-[var(--admin-muted)]"
              />
            </span>
          </label>
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-[var(--admin-line)] pt-5">
          <span className={ADMIN_EYEBROW}>Total</span>
          <span className="[font-family:var(--admin-display-font)] text-[32px] font-normal leading-none tabular-nums tracking-[-0.01em] text-[var(--admin-ink)]">
            {formatARS(total)}
          </span>
        </div>

        <button
          type="button"
          disabled={lines.length === 0 || processing}
          onClick={confirm}
          className={`${ADMIN_ACTION_PRIMARY} mt-5 w-full`}
        >
          <CheckCircle2 size={14} strokeWidth={1.5} /> {processing ? "Procesando…" : "Confirmar venta"}
        </button>

        {message && (
          <p
            className={`mt-4 border-y border-[var(--admin-line)] py-3 text-[11px] uppercase leading-5 tracking-[0.1em] ${
              messageOk ? "text-[var(--admin-positive)]" : "text-[var(--admin-danger)]"
            }`}
          >
            {message}
          </p>
        )}
      </aside>
    </div>
  );
}
