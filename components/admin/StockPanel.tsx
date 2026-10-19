"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatARS } from "@/lib/pricing";

const LOW_STOCK = 5;

type Props = {
  initial: Product[];
  onSave?: (id: string, patch: Partial<Pick<Product, "stock" | "unit_price" | "active">>) => Promise<void>;
};

export default function StockPanel({ initial, onSave }: Props) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");

  const update = async (id: string, patch: Partial<Pick<Product, "stock" | "unit_price" | "active">>) => {
    const prev = items;
    setItems((xs) => xs.map((p) => (p.id === id ? { ...p, ...patch } : p))); // optimista
    try { await onSave?.(id, patch); } catch { setItems(prev); }
  };

  const inputClass =
    "rounded border border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

  const filtered = items.filter((p) =>
    query.trim() === "" ? true : p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="overflow-x-auto p-4">
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre..."
          className={`${inputClass} w-full max-w-xs p-2 text-sm`}
        />
      </div>
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-neutral-500 dark:text-neutral-400">
          <tr><th className="p-2">Producto</th><th>Stock</th><th>Precio unitario</th><th>Venta</th></tr>
        </thead>
        <tbody>
          {filtered.map((p) => {
            const low = p.stock < LOW_STOCK;
            return (
              <tr key={p.id} className={`border-t border-neutral-200 dark:border-neutral-800 ${!p.active ? "opacity-50" : ""}`}>
                <td className="p-2 font-medium text-neutral-900 dark:text-neutral-100">
                  {p.name}
                  {low && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-red-100 px-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      <AlertTriangle size={12} /> {p.stock === 0 ? "Agotado" : "Stock crítico"}
                    </span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button className={`${inputClass} px-2`} onClick={() => update(p.id, { stock: Math.max(0, p.stock - 1) })}>−</button>
                    <input type="number" min={0} className={`${inputClass} w-16 p-1 text-center`} value={p.stock}
                      onChange={(e) => update(p.id, { stock: Math.max(0, Number(e.target.value)) })} />
                    <button className={`${inputClass} px-2`} onClick={() => update(p.id, { stock: p.stock + 1 })}>+</button>
                  </div>
                </td>
                <td>
                  <input type="number" min={0} className={`${inputClass} w-28 p-1`} defaultValue={p.unit_price}
                    onBlur={(e) => Number(e.target.value) !== p.unit_price && update(p.id, { unit_price: Number(e.target.value) })} />
                  <span className="ml-2 text-neutral-400 dark:text-neutral-500">{formatARS(p.unit_price)}</span>
                </td>
                <td>
                  <button role="switch" aria-checked={p.active} onClick={() => update(p.id, { active: !p.active })}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${p.active ? "bg-green-600 text-white" : "bg-neutral-300 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"}`}>
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
