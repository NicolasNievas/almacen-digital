"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Package, Plus, Trash2, X } from "lucide-react";
import { isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { createProduct, updateProduct } from "@/lib/supabase/queries";
import type { Category, PricingTier, PricingType, Product, ProductInput } from "@/lib/types";

type Props = {
  product?: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
};

type TierRow = { min_quantity: string; unit_price: string };

const EMPTY: ProductInput = {
  name: "",
  category_id: "",
  unit_price: 0,
  pricing_type: "SIMPLE",
  pricing_tiers: [],
  bundle_size: null,
  bundle_price: null,
  stock: 0,
  active: true,
  tags: [],
  image_url: null,
};

export default function ProductForm({ product, categories, onClose, onSaved }: Props) {
  const editing = Boolean(product);
  const [form, setForm] = useState<ProductInput>(() =>
    product
      ? {
          name: product.name,
          category_id: product.category_id,
          unit_price: product.unit_price,
          pricing_type: product.pricing_type,
          pricing_tiers: product.pricing_tiers,
          bundle_size: product.bundle_size ?? null,
          bundle_price: product.bundle_price ?? null,
          stock: product.stock,
          active: product.active,
          tags: product.tags,
          image_url: product.image_url ?? null,
        }
      : { ...EMPTY, category_id: categories[0]?.id ?? "" },
  );
  const [tiers, setTiers] = useState<TierRow[]>(() =>
    (product?.pricing_tiers ?? []).map((t) => ({
      min_quantity: String(t.min_quantity),
      unit_price: String(t.unit_price),
    })),
  );
  const [tagsText, setTagsText] = useState((product?.tags ?? []).join(", "));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      set("image_url", await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("El nombre es obligatorio.");
    if (!form.category_id) return setError("Elegí una categoría.");
    if (!Number.isFinite(form.unit_price) || form.unit_price < 0)
      return setError("El precio no puede ser negativo.");

    // El optimizador de imágenes solo admite res.cloudinary.com (ver next.config.ts).
    if (form.image_url) {
      let parsed: URL;
      try {
        parsed = new URL(form.image_url);
      } catch {
        return setError("La URL de imagen no es válida.");
      }
      if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
        return setError("La imagen debe ser de res.cloudinary.com o subirla desde el panel.");
      }
    }

    const pricing_tiers: PricingTier[] =
      form.pricing_type === "TIERED"
        ? tiers
            .map((t) => ({ min_quantity: Number(t.min_quantity), unit_price: Number(t.unit_price) }))
            .filter((t) => t.min_quantity > 0 && t.unit_price >= 0)
        : [];

    const payload: ProductInput = {
      ...form,
      name: form.name.trim(),
      pricing_tiers,
      bundle_size: form.pricing_type === "BUNDLE" ? form.bundle_size : null,
      bundle_price: form.pricing_type === "BUNDLE" ? form.bundle_price : null,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      image_url: form.image_url || null,
    };

    setSaving(true);
    try {
      if (product) await updateProduct(product.id, payload);
      else await createProduct(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";
  const labelClass = "block space-y-1 text-xs font-medium text-neutral-600 dark:text-neutral-400";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="my-6 w-full max-w-2xl space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {editing ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <X size={20} />
          </button>
        </div>

        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Nombre *
            <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </label>
          <label className={labelClass}>
            Categoría *
            <select className={inputClass} value={form.category_id} onChange={(e) => set("category_id", e.target.value)} required>
              <option value="">Seleccionar…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Precio base *
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={form.unit_price}
              onChange={(e) => set("unit_price", Number(e.target.value))}
            />
          </label>
          <label className={labelClass}>
            Stock (unidades) *
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.stock}
              onChange={(e) => set("stock", Math.max(0, Number(e.target.value)))}
            />
          </label>

          <label className={labelClass}>
            Tipo de descuento
            <select
              className={inputClass}
              value={form.pricing_type}
              onChange={(e) => set("pricing_type", e.target.value as PricingType)}
            >
              <option value="SIMPLE">Simple</option>
              <option value="TIERED">Escalado (por cantidad)</option>
              <option value="BUNDLE">Combo / Pack</option>
            </select>
          </label>

          <label className={labelClass}>
            Etiquetas (separadas por coma)
            <input
              className={inputClass}
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="oferta, nuevo"
            />
          </label>
        </div>

        {form.pricing_type === "TIERED" && (
          <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Escalones (a partir de X unidades, precio unitario)
            </p>
            {tiers.map((tier, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="Cantidad mín."
                  className={inputClass}
                  value={tier.min_quantity}
                  onChange={(e) =>
                    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, min_quantity: e.target.value } : t)))
                  }
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Precio unitario"
                  className={inputClass}
                  value={tier.unit_price}
                  onChange={(e) =>
                    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, unit_price: e.target.value } : t)))
                  }
                />
                <button
                  type="button"
                  onClick={() => setTiers((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded border border-neutral-300 p-2 text-neutral-500 hover:text-red-600 dark:border-neutral-700"
                  aria-label="Quitar escalón"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTiers((prev) => [...prev, { min_quantity: "", unit_price: "" }])}
              className="flex items-center gap-1 text-sm text-brand hover:underline"
            >
              <Plus size={14} /> Agregar escalón
            </button>
          </div>
        )}

        {form.pricing_type === "BUNDLE" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Unidades por combo
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.bundle_size ?? ""}
                onChange={(e) => set("bundle_size", e.target.value ? Number(e.target.value) : null)}
              />
            </label>
            <label className={labelClass}>
              Precio del combo
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                value={form.bundle_price ?? ""}
                onChange={(e) => set("bundle_price", e.target.value ? Number(e.target.value) : null)}
              />
            </label>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Imagen</p>
          <div className="flex items-center gap-3">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800">
              {form.image_url ? (
                <Image src={form.image_url} alt="Vista previa" fill sizes="80px" className="object-cover" />
              ) : (
                <Package className="h-7 w-7 text-neutral-400" />
              )}
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-white"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {uploading ? "Subiendo…" : "Subir imagen"}
              </button>
              {form.image_url && (
                <button
                  type="button"
                  onClick={() => set("image_url", null)}
                  className="text-xs text-neutral-500 hover:text-red-600"
                >
                  Quitar imagen
                </button>
              )}
              {!isCloudinaryConfigured() && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Configurá Cloudinary para habilitar la subida.
                </p>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <input
            className={inputClass}
            placeholder="…o pegá una URL de imagen"
            value={form.image_url ?? ""}
            onChange={(e) => set("image_url", e.target.value || null)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          Producto activo (visible en la tienda)
        </label>

        <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex items-center gap-2 rounded-lg bg-brand-solid px-4 py-2 text-sm font-semibold text-white hover:bg-brand-accent disabled:opacity-50"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            {editing ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </form>
    </div>
  );
}
