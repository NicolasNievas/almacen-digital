"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { saveCategory } from "@/lib/supabase/queries";
import {
  ADMIN_ACTION_GHOST,
  ADMIN_ACTION_PRIMARY,
  ADMIN_EYEBROW,
  ADMIN_ERROR,
  ADMIN_ICON_BUTTON,
  ADMIN_INPUT,
  ADMIN_INPUT_INLINE,
  ADMIN_MODAL_OVERLAY,
  ADMIN_MODAL_PANEL,
  ADMIN_TABLE_HEAD,
} from "@/lib/admin-ui";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  storeId: string;
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

export default function CategoryManager({ categories, storeId, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>(
    [...categories]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
      .map((c) => ({ id: c.id, name: c.name, sort_order: String(c.sort_order ?? 0) })),
  );
  const [newName, setNewName] = useState("");
  const [newOrder, setNewOrder] = useState("0");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyId) onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous || "unset";
      document.removeEventListener("keydown", onKey);
    };
  }, [busyId, onClose]);

  const saveRow = async (row: Row) => {
    if (!row.name.trim()) return;
    setBusyId(row.id);
    setError(null);
    try {
      await saveCategory({ id: row.id, name: row.name.trim(), sort_order: Number(row.sort_order) || 0 }, storeId);
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
      await saveCategory({ id, name, sort_order: Number(newOrder) || 0 }, storeId);
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
    <div className={`${ADMIN_MODAL_OVERLAY} items-start`} role="dialog" aria-modal="true" aria-label="Categorías">
      <div className={`${ADMIN_MODAL_PANEL} max-w-xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-line)] px-6 py-5">
          <div>
            <p className={ADMIN_EYEBROW}>Catálogo</p>
            <h2 data-display className="mt-2 [font-family:var(--admin-display-font)] text-[26px] font-normal leading-[1.1] text-[var(--admin-ink)]">
              Categorías
            </h2>
          </div>
          <button type="button" onClick={onClose} className={ADMIN_ICON_BUTTON} aria-label="Cerrar">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {error && (
            <p className={ADMIN_ERROR} role="alert">
              {error}
            </p>
          )}

          <p className="text-[12px] leading-5 text-[var(--admin-muted)]">
            El orden de prioridad se lee de menor a mayor: <span className="text-[var(--admin-ink)]">1</span> aparece
            primero. Ante el mismo número se ordena por nombre.
          </p>

          {rows.length === 0 ? (
            <p className="border-y border-[var(--admin-line)] py-8 text-center text-[12px] uppercase tracking-[0.14em] text-[var(--admin-faint)]">
              Todavía no hay categorías
            </p>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <span className={`${ADMIN_TABLE_HEAD} flex-1 border-b-0 pb-2`}>Nombre</span>
                <span className={`${ADMIN_TABLE_HEAD} w-20 border-b-0 pb-2 text-center`}>Orden</span>
                <span className="w-10" />
              </div>
              <ul className="divide-y divide-[var(--admin-line)] border-y border-[var(--admin-line)]">
                {rows.map((row, index) => (
                  <li key={row.id} className="flex items-center gap-3 py-2">
                    <input
                      className={`${ADMIN_INPUT_INLINE} flex-1`}
                      value={row.name}
                      aria-label={`Nombre de ${row.name}`}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, name: e.target.value } : r)),
                        )
                      }
                    />
                    <input
                      type="number"
                      className={`${ADMIN_INPUT_INLINE} w-20 text-center tabular-nums`}
                      value={row.sort_order}
                      aria-label={`Orden de ${row.name}`}
                      title="Orden de prioridad en la tienda (menor = primero)"
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, sort_order: e.target.value } : r)),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => void saveRow(row)}
                      disabled={busyId === row.id}
                      className={ADMIN_ICON_BUTTON}
                      aria-label={`Guardar ${row.name}`}
                    >
                      {busyId === row.id ? (
                        <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
                      ) : (
                        <Check size={15} strokeWidth={1.5} />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-[var(--admin-line)] pt-5">
            <p className={ADMIN_EYEBROW}>Nueva categoría</p>
            <div className="mt-4 flex items-end gap-3">
              <label className="flex-1">
                <span className="sr-only">Nombre de la nueva categoría</span>
                <input
                  className={ADMIN_INPUT}
                  placeholder="Nombre"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </label>
              <label className="w-20">
                <span className="sr-only">Orden de la nueva categoría</span>
                <input
                  type="number"
                  className={`${ADMIN_INPUT} text-center tabular-nums`}
                  value={newOrder}
                  title="Orden de prioridad en la tienda (menor = primero)"
                  onChange={(e) => setNewOrder(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={() => void addCategory()}
                disabled={!newName.trim() || busyId === slugify(newName)}
                className={ADMIN_ACTION_PRIMARY}
              >
                <Plus size={13} strokeWidth={1.5} /> Agregar
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-[var(--admin-line)] px-6 py-5">
          <button type="button" onClick={onClose} className={ADMIN_ACTION_GHOST}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
