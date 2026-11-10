"use client";
import { useState } from "react";
import { AlertTriangle, Minus, Plus, Search } from "lucide-react";
import {
  ADMIN_CELL_HEAD,
  ADMIN_EYEBROW,
  ADMIN_GRID_HEAD,
  ADMIN_GRID_ROW,
} from "@/lib/admin-ui";
import type { Product } from "@/lib/types";
import { formatARS } from "@/lib/pricing";

const LOW_STOCK = 5;

/**
 * El stepper vive al final de su track y el precio arranca al inicio del
 * siguiente: la distancia entre ambos es solo el gap, no media pantalla.
 */
const STOCK_GRID = "grid-cols-[minmax(0,1fr)_150px_160px_96px]";

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
    try {
      await onSave?.(id, patch);
    } catch {
      setItems(prev);
    }
  };

  const filtered = items.filter((p) =>
    query.trim() === "" ? true : p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="relative block w-full max-w-xs">
          <span className="sr-only">Buscar producto en stock</span>
          <Search
            size={15}
            strokeWidth={1.5}
            className="pointer-events-none absolute bottom-2.5 left-0 text-[var(--admin-faint)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre"
            className="w-full appearance-none rounded-none border-0 border-b border-[var(--admin-line-strong)] bg-transparent py-2 pl-6 text-sm text-[var(--admin-ink)] outline-none transition-colors placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-ink)]"
          />
        </label>
        <p className={ADMIN_EYEBROW}>
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div role="table" aria-label="Stock" className="w-full min-w-[660px]">
          <div role="rowgroup">
            <div role="row" className={`${ADMIN_GRID_HEAD} ${STOCK_GRID}`}>
              <div role="columnheader" className={ADMIN_CELL_HEAD}>
                Producto
              </div>
              <div role="columnheader" className={`${ADMIN_CELL_HEAD} text-right`}>
                Stock
              </div>
              <div role="columnheader" className={ADMIN_CELL_HEAD}>
                Precio unitario
              </div>
              <div role="columnheader" className={`${ADMIN_CELL_HEAD} text-right`}>
                Venta
              </div>
            </div>
          </div>
          <div role="rowgroup">
            {filtered.map((p) => {
              const low = p.stock < LOW_STOCK;
              return (
                <div key={p.id} role="row" className={`${ADMIN_GRID_ROW} ${STOCK_GRID}`}>
                  <div role="cell" className="min-w-0 py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm leading-5 text-[var(--admin-ink)]">{p.name}</span>
                      {low && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase leading-none tracking-[0.1em] text-[var(--admin-warning)]">
                          <AlertTriangle size={11} strokeWidth={1.5} />
                          {p.stock === 0 ? "Agotado" : "Stock crítico"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div role="cell" className="flex justify-end py-3">
                    <div className="inline-flex items-center border-b border-[var(--admin-line)]">
                      <button
                        type="button"
                        aria-label={`Restar una unidad a ${p.name}`}
                        onClick={() => void update(p.id, { stock: Math.max(0, p.stock - 1) })}
                        className="inline-flex h-8 w-7 items-center justify-center text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)]"
                      >
                        <Minus size={13} strokeWidth={1.5} />
                      </button>
                      <input
                        type="number"
                        min={0}
                        aria-label={`Stock de ${p.name}`}
                        className="w-14 appearance-none bg-transparent py-1 text-center text-[13px] tabular-nums text-[var(--admin-ink)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={p.stock}
                        onChange={(e) =>
                          void update(p.id, { stock: Math.max(0, Number(e.target.value)) })
                        }
                      />
                      <button
                        type="button"
                        aria-label={`Sumar una unidad a ${p.name}`}
                        onClick={() => void update(p.id, { stock: p.stock + 1 })}
                        className="inline-flex h-8 w-7 items-center justify-center text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)]"
                      >
                        <Plus size={13} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  <div role="cell" className="py-3">
                    <div className="flex flex-col gap-0.5">
                      <input
                        type="number"
                        min={0}
                        aria-label={`Precio de ${p.name}`}
                        className="w-28 appearance-none border-0 border-b border-[var(--admin-line)] bg-transparent py-1 text-[13px] tabular-nums text-[var(--admin-ink)] outline-none transition-colors focus:border-[var(--admin-ink)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        defaultValue={p.unit_price}
                        onBlur={(e) =>
                          Number(e.target.value) !== p.unit_price &&
                          void update(p.id, { unit_price: Number(e.target.value) })
                        }
                      />
                      <span className="text-[10px] tabular-nums text-[var(--admin-faint)]">
                        {formatARS(p.unit_price)}
                      </span>
                    </div>
                  </div>
                  <div role="cell" className="flex justify-end py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.active}
                      aria-label={`${p.active ? "Pausar" : "Activar"} ${p.name}`}
                      onClick={() => void update(p.id, { active: !p.active })}
                      className="inline-flex items-center gap-2 text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)]"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          p.active
                            ? "bg-[var(--admin-positive)]"
                            : "border border-[var(--admin-faint)] bg-transparent"
                        }`}
                      />
                      {p.active ? "Activo" : "Pausado"}
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div role="row" className="border-b border-[var(--admin-line)] py-10 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--admin-faint)]">
                <div role="cell">Sin coincidencias</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
