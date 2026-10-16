"use client";
import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, X, MessageCircle } from "lucide-react";
import type { CartLine } from "@/lib/types";
import { calcSubtotal, calcSavings, formatARS } from "@/lib/pricing";
import { buildWhatsAppUrl, type Checkout } from "@/lib/whatsapp";

type Props = {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  onChangeQty: (productId: string, quantity: number) => void; // 0 = eliminar
  store: { whatsapp: string; alias: string; cbu: string; titular: string };
  // Se dispara al confirmar el pedido (además de abrir WhatsApp).
  onConfirm?: (checkout: Checkout, lines: CartLine[]) => void | Promise<void>;
};

export default function Cart({ open, onClose, lines, onChangeQty, store, onConfirm }: Props) {
  const [name, setName] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [payment, setPayment] = useState<Checkout["payment"]>("Efectivo");

  const total = useMemo(() => lines.reduce((a, l) => a + calcSubtotal(l.product, l.quantity), 0), [lines]);
  const savings = useMemo(() => lines.reduce((a, l) => a + calcSavings(l.product, l.quantity), 0), [lines]);
  const canSend =
    lines.length > 0 && name.trim().length > 0 && /^\d{2}:\d{2}(:\d{2})?$/.test(pickupTime);

  // Verifica stock antes de incrementar
  const increment = (l: CartLine) => {
    if (l.quantity + 1 > l.product.stock) return;
    onChangeQty(l.product.id, l.quantity + 1);
  };

  const confirm = () => {
    if (!canSend) return;
    const checkout: Checkout = { name: name.trim(), pickupTime, payment };
    // Abrimos WhatsApp primero (sincrónico) para que el navegador no bloquee el popup.
    window.open(buildWhatsAppUrl(store.whatsapp, lines, checkout), "_blank");
    void onConfirm?.(checkout, lines);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Tu pedido</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
            <X />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {lines.length === 0 && <p className="text-neutral-500 dark:text-neutral-400">Todavía no agregaste productos.</p>}
          {lines.map((l) => {
            const atMax = l.quantity >= l.product.stock;
            return (
              <div key={l.product.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex justify-between gap-2">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{l.product.name}</p>
                  <button onClick={() => onChangeQty(l.product.id, 0)} aria-label="Quitar" className="text-neutral-500 hover:text-red-600 dark:text-neutral-400">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="rounded border border-neutral-300 p-1 dark:border-neutral-700" onClick={() => onChangeQty(l.product.id, l.quantity - 1)}><Minus size={16} /></button>
                    <span className="w-6 text-center text-neutral-900 dark:text-neutral-100">{l.quantity}</span>
                    <button className="rounded border border-neutral-300 p-1 disabled:opacity-30 dark:border-neutral-700" disabled={atMax} onClick={() => increment(l)}><Plus size={16} /></button>
                  </div>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{formatARS(calcSubtotal(l.product, l.quantity))}</p>
                </div>
                {atMax && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Máximo disponible: {l.product.stock}</p>}
              </div>
            );
          })}
        </div>

        <footer className="space-y-3 border-t border-neutral-200 p-4 dark:border-neutral-800">
          {savings > 0 && <p className="text-sm text-green-700 dark:text-green-400">Ahorrás {formatARS(savings)} con las promos</p>}
          <input
            className="w-full rounded border border-neutral-300 bg-white p-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            placeholder="Tu nombre *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="block space-y-1">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Horario de retiro *</span>
            <input
              type="time"
              required
              className="w-full rounded border border-neutral-300 bg-white p-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
            />
          </label>
          <select
            className="w-full rounded border border-neutral-300 bg-white p-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            value={payment}
            onChange={(e) => setPayment(e.target.value as Checkout["payment"])}
          >
            <option>Efectivo</option>
            <option>Transferencia al retirar</option>
          </select>
          <p className="rounded bg-neutral-100 p-2 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            Transferencia opcional · Alias: <b>{store.alias}</b> · CBU: {store.cbu} · {store.titular}
          </p>
          <div className="flex justify-between text-lg font-bold text-neutral-900 dark:text-neutral-100"><span>Total estimado</span><span>{formatARS(total)}</span></div>
          <button
            disabled={!canSend}
            onClick={confirm}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-semibold text-white disabled:opacity-40 hover:bg-green-700"
          >
            <MessageCircle size={20} /> Confirmar pedido por WhatsApp
          </button>
        </footer>
      </aside>
    </div>
  );
}
