"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatARS } from "@/lib/pricing";

const LOW_STOCK = 5;

type Props = {
  initial: Product[];
  // Fase 2: conectar a Supabase (rpc adjust_stock para stock + update en products para precio/active)
  onSave?: (id: string, patch: Partial<Pick<Product, "stock" | "unit_price" | "active">>) => Promise<void>;
};

export default function StockPanel({ initial, onSave }: Props) {
  const [items, setItems] = useState(initial);

  const update = async (id: string, patch: Partial<Pick<Product, "stock" | "unit_price" | "active">>) => {
    const prev = items;
    setItems((xs) => xs.map((p) => (p.id === id ? { ...p, ...patch } : p))); // optimista
    try { await onSave?.(id, patch); } catch { setItems(prev); }
  };

  return (
    <div className="overflow-x-auto p-4">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-neutral-500">
          <tr><th className="p-2">Producto</th><th>Stock</th><th>Precio unitario</th><th>Venta</th></tr>
        </thead>
        <tbody>
          {items.map((p) => {
            const low = p.stock < LOW_STOCK;
            return (
              <tr key={p.id} className={`border-t ${!p.active ? "opacity-50" : ""}`}>
                <td className="p-2 font-medium">
                  {p.name}
                  {low && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-red-100 px-1.5 text-xs text-red-700">
                      <AlertTriangle size={12} /> {p.stock === 0 ? "Agotado" : "Stock crítico"}
                    </span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button className="rounded border px-2" onClick={() => update(p.id, { stock: Math.max(0, p.stock - 1) })}>−</button>
                    <input type="number" min={0} className="w-16 rounded border p-1 text-center" value={p.stock}
                      onChange={(e) => update(p.id, { stock: Math.max(0, Number(e.target.value)) })} />
                    <button className="rounded border px-2" onClick={() => update(p.id, { stock: p.stock + 1 })}>+</button>
                  </div>
                </td>
                <td>
                  <input type="number" min={0} className="w-28 rounded border p-1" defaultValue={p.unit_price}
                    onBlur={(e) => Number(e.target.value) !== p.unit_price && update(p.id, { unit_price: Number(e.target.value) })} />
                  <span className="ml-2 text-neutral-400">{formatARS(p.unit_price)}</span>
                </td>
                <td>
                  <button role="switch" aria-checked={p.active} onClick={() => update(p.id, { active: !p.active })}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${p.active ? "bg-green-600 text-white" : "bg-neutral-300"}`}>
                    {p.active ? "Activo" : "Pausado"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
