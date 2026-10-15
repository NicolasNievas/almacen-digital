"use client";

import { useState, type FormEvent } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { Category, PricingTier, PricingType, Product } from "@/lib/types";

export type ProductInput = Omit<Product, "id"> & { id?: string };

type Props = {
  categories: Category[];
  initial?: Product;
  onSubmit: (data: ProductInput) => Promise<void> | void;
  onCancel?: () => void;
};

const newTier = (): PricingTier => ({ min_quantity: 1, unit_price: 0 });

export default function ProductForm({ categories, initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? categories[0]?.id ?? "");
  const [unitPrice, setUnitPrice] = useState(initial?.unit_price ?? 0);
  const [pricingType, setPricingType] = useState<PricingType>(initial?.pricing_type ?? "SIMPLE");
  const [tiers, setTiers] = useState<PricingTier[]>(initial?.pricing_tiers ?? []);
  const [bundleSize, setBundleSize] = useState(initial?.bundle_size ?? 2);
  const [bundlePrice, setBundlePrice] = useState(initial?.bundle_price ?? 0);
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [saving, setSaving] = useState(false);

  const updateTier = (index: number, patch: Partial<PricingTier>) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        id: initial?.id,
        name: name.trim(),
        category_id: categoryId,
        unit_price: Number(unitPrice) || 0,
        pricing_type: pricingType,
        pricing_tiers: pricingType === "TIERED" ? tiers : [],
        bundle_size: pricingType === "BUNDLE" ? Number(bundleSize) || undefined : undefined,
        bundle_price: pricingType === "BUNDLE" ? Number(bundlePrice) || undefined : undefined,
        stock: Math.max(0, Number(stock) || 0),
        active,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        image_url: imageUrl.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-600";
  const labelClass = "block text-xs font-medium text-neutral-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="text-base font-semibold text-neutral-900">
        {initial ? "Editar producto" : "Nuevo producto"}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className={labelClass}>Nombre *</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Categoría</span>
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Precio unitario</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={unitPrice}
            onChange={(e) => setUnitPrice(Number(e.target.value))}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Stock (unidades base)</span>
          <input
            type="number"
            min={0}
            className={inputClass}
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
          />
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Tipo de precio</span>
          <select
            className={inputClass}
            value={pricingType}
            onChange={(e) => setPricingType(e.target.value as PricingType)}
          >
            <option value="SIMPLE">Simple</option>
            <option value="TIERED">Por escalones (TIERED)</option>
            <option value="BUNDLE">Combo (BUNDLE)</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className={labelClass}>Etiquetas (separadas por coma)</span>
          <input
            className={inputClass}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="OFERTA, COMBO"
          />
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className={labelClass}>URL de imagen</span>
          <input
            className={inputClass}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/img/producto.jpg"
          />
        </label>
      </div>

      {pricingType === "TIERED" && (
        <div className="space-y-2 rounded-lg bg-neutral-50 p-3">
          <span className={labelClass}>Escalones (cantidad mínima → precio unitario)</span>
          {tiers.map((tier, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={tier.min_quantity}
                onChange={(e) => updateTier(index, { min_quantity: Number(e.target.value) })}
              />
              <input
                type="number"
                min={0}
                className={inputClass}
                value={tier.unit_price}
                onChange={(e) => updateTier(index, { unit_price: Number(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => setTiers((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-neutral-300 p-2 text-neutral-500 hover:text-red-600"
                aria-label="Quitar escalón"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTiers((prev) => [...prev, newTier()])}
            className="flex items-center gap-1 text-sm font-medium text-green-700"
          >
            <Plus size={16} /> Agregar escalón
          </button>
        </div>
      )}

      {pricingType === "BUNDLE" && (
        <div className="grid gap-4 rounded-lg bg-neutral-50 p-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className={labelClass}>Unidades del combo</span>
            <input
              type="number"
              min={2}
              className={inputClass}
              value={bundleSize}
              onChange={(e) => setBundleSize(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Precio del combo</span>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={bundlePrice}
              onChange={(e) => setBundlePrice(Number(e.target.value))}
            />
          </label>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Producto activo (visible en la tienda)
      </label>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40"
        >
          <Save size={16} /> {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
