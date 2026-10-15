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
};

export default function Cart({ open, onClose, lines, onChangeQty, store }: Props) {
  const [name, setName] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [payment, setPayment] = useState<Checkout["payment"]>("Efectivo");

  const total = useMemo(() => lines.reduce((a, l) => a + calcSubtotal(l.product, l.quantity), 0), [lines]);
  const savings = useMemo(() => lines.reduce((a, l) => a + calcSavings(l.product, l.quantity), 0), [lines]);
  const canSend = lines.length > 0 && name.trim() && pickupTime.trim();

  // Verifica stock antes de incrementar
  const increment = (l: CartLine) => {
    if (l.quantity + 1 > l.product.stock) return;
    onChangeQty(l.product.id, l.quantity + 1);
  };

  const confirm = () => {
    if (!canSend) return;
    window.open(buildWhatsAppUrl(store.whatsapp, lines, { name: name.trim(), pickupTime, payment }), "_blank");
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside className="flex h-full w-full max-w-md flex-col bg-white" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Tu pedido</h2>
          <button onClick={onClose} aria-label="Cerrar"><X /></button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {lines.length === 0 && <p className="text-neutral-500">Todavía no agregaste productos.</p>}
          {lines.map((l) => {
            const atMax = l.quantity >= l.product.stock;
            return (
              <div key={l.product.id} className="rounded-lg border p-3">
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{l.product.name}</p>
                  <button onClick={() => onChangeQty(l.product.id, 0)} aria-label="Quitar"><Trash2 size={18} /></button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="rounded border p-1" onClick={() => onChangeQty(l.product.id, l.quantity - 1)}><Minus size={16} /></button>
                    <span className="w-6 text-center">{l.quantity}</span>
                    <button className="rounded border p-1 disabled:opacity-30" disabled={atMax} onClick={() => increment(l)}><Plus size={16} /></button>
                  </div>
                  <p className="font-semibold">{formatARS(calcSubtotal(l.product, l.quantity))}</p>
                </div>
                {atMax && <p className="mt-1 text-xs text-amber-600">Máximo disponible: {l.product.stock}</p>}
              </div>
            );
          })}
        </div>

        <footer className="space-y-3 border-t p-4">
          {savings > 0 && <p className="text-sm text-green-700">Ahorrás {formatARS(savings)} con las promos</p>}
          <input className="w-full rounded border p-2" placeholder="Tu nombre *" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded border p-2" placeholder="Horario de retiro (ej. 18:30) *" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
          <select className="w-full rounded border p-2" value={payment} onChange={(e) => setPayment(e.target.value as Checkout["payment"])}>
            <option>Efectivo</option>
            <option>Transferencia al retirar</option>
          </select>
          <p className="rounded bg-neutral-100 p-2 text-xs">
            Transferencia opcional · Alias: <b>{store.alias}</b> · CBU: {store.cbu} · {store.titular}
          </p>
          <div className="flex justify-between text-lg font-bold"><span>Total estimado</span><span>{formatARS(total)}</span></div>
          <button
            disabled={!canSend}
            onClick={confirm}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-semibold text-white disabled:opacity-40"
          >
            <MessageCircle size={20} /> Confirmar pedido por WhatsApp
          </button>
        </footer>
      </aside>
    </div>
  );
}
