"use client";

import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { saveCategory } from "@/lib/supabase/queries";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

type Row = { id: string; name: string; sort_order: string };

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoryManager({ categories, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>(
    [...categories]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
      .map((c) => ({ id: c.id, name: c.name, sort_order: String(c.sort_order ?? 0) })),
  );
  const [newName, setNewName] = useState("");
  const [newOrder, setNewOrder] = useState("0");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-green-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

  const saveRow = async (row: Row) => {
    if (!row.name.trim()) return;
    setBusyId(row.id);
    setError(null);
    try {
      await saveCategory({ id: row.id, name: row.name.trim(), sort_order: Number(row.sort_order) || 0 });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la categoría.");
    } finally {
      setBusyId(null);
    }
  };

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = slugify(name);
    if (!id) return setError("El nombre debe tener letras o números.");
    if (rows.some((r) => r.id === id)) return setError("Ya existe una categoría con ese nombre.");
    setBusyId(id);
    setError(null);
    try {
      await saveCategory({ id, name, sort_order: Number(newOrder) || 0 });
      setRows((prev) => [...prev, { id, name, sort_order: newOrder }]);
      setNewName("");
      setNewOrder("0");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoría.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-6 w-full max-w-lg space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Categorías</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <X size={20} />
          </button>
        </div>

        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          El <b>orden de prioridad en la tienda</b> se ordena de menor a mayor (1 aparece primero). Ante el mismo
          número, se ordena por nombre. No hace falta que los números sean consecutivos.
        </p>

        <div className="flex items-center gap-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          <span className="flex-1">Nombre</span>
          <span className="w-20 text-center">Orden</span>
          <span className="w-9" />
        </div>

        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={row.id} className="flex items-center gap-2">
              <input
                className={inputClass}
                value={row.name}
                onChange={(e) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)))}
              />
              <input
                type="number"
                className={`${inputClass} w-20`}
                value={row.sort_order}
                title="Orden de prioridad en la tienda (menor = primero)"
                onChange={(e) =>
                  setRows((prev) => prev.map((r, i) => (i === index ? { ...r, sort_order: e.target.value } : r)))
                }
              />
              <button
                type="button"
                onClick={() => void saveRow(row)}
                disabled={busyId === row.id}
                className="rounded-lg bg-green-600 p-2 text-white hover:bg-green-700 disabled:opacity-50"
                aria-label="Guardar"
              >
                {busyId === row.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              </button>
            </li>
          ))}
          {rows.length === 0 && <li className="text-sm text-neutral-500 dark:text-neutral-400">No hay categorías todavía.</li>}
        </ul>

        <div className="space-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Nueva categoría</p>
          <div className="flex items-end gap-2">
            <label className="flex-1 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Nombre
              </span>
              <input
                className={inputClass}
                placeholder="Nombre"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                Orden
              </span>
              <input
                type="number"
                className={`${inputClass} w-20`}
                value={newOrder}
                title="Orden de prioridad en la tienda (menor = primero)"
                onChange={(e) => setNewOrder(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => void addCategory()}
              disabled={!newName.trim() || busyId === slugify(newName)}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Plus size={15} /> Agregar
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-white"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
