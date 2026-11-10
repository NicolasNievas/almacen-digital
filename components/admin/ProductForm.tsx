"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { ChevronDown, ImagePlus, Loader2, Package, Plus, Trash2, X } from "lucide-react";
import { isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { createProduct, updateProduct } from "@/lib/supabase/queries";
import {
  ADMIN_ACTION_GHOST,
  ADMIN_ACTION_PRIMARY,
  ADMIN_EYEBROW,
  ADMIN_ERROR,
  ADMIN_ICON_BUTTON,
  ADMIN_INPUT,
  ADMIN_LABEL,
  ADMIN_MODAL_OVERLAY,
  ADMIN_MODAL_PANEL,
} from "@/lib/admin-ui";
import type { Category, PricingTier, PricingType, Product, ProductInput } from "@/lib/types";

type Props = {
  product?: Product | null;
  categories: Category[];
  storeId: string;
  onClose: () => void;
  onSaved: () => void;
};

type TierRow = { min_quantity: string; unit_price: string };

const EMPTY: ProductInput = {
  name: "",
  description: null,
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
  images: [],
  sizes: [],
  colors: [],
};

export default function ProductForm({ product, categories, storeId, onClose, onSaved }: Props) {
  const editing = Boolean(product);
  const [form, setForm] = useState<ProductInput>(() =>
    product
      ? {
          name: product.name,
          description: product.description ?? null,
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
          images: product.images,
          sizes: product.sizes,
          colors: product.colors,
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
  const [sizesText, setSizesText] = useState((product?.sizes ?? []).join(", "));
  const [colorsText, setColorsText] = useState((product?.colors ?? []).join(", "));
  const [galleryText, setGalleryText] = useState(
    (product?.images ?? [])
      .filter((image) => image !== product?.image_url)
      .join("\n"),
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous || "unset";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, saving]);

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

    // El optimizador de imágenes solo admite los hosts declarados en next.config.ts.
    const allowedHosts = new Set(["res.cloudinary.com", "images.unsplash.com"]);
    const candidateImages = [
      form.image_url,
      ...galleryText.split("\n").map((url) => url.trim()),
    ].filter((url): url is string => Boolean(url));

    for (const image of candidateImages) {
      let parsed: URL;
      try {
        parsed = new URL(image);
      } catch {
        return setError("Una de las URLs de imagen no es válida.");
      }
      if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
        return setError(
          "Las imágenes deben ser de res.cloudinary.com o images.unsplash.com (o subirlas desde el panel).",
        );
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
      sizes: sizesText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      colors: colorsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      image_url: form.image_url || null,
      images: [
        form.image_url,
        ...galleryText
          .split("\n")
          .map((url) => url.trim())
          .filter(Boolean),
      ].filter((url): url is string => Boolean(url)),
    };

    setSaving(true);
    try {
      if (product) await updateProduct(product.id, payload);
      else await createProduct(payload, storeId);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${ADMIN_MODAL_OVERLAY} items-start`} role="dialog" aria-modal="true" aria-label={editing ? "Editar producto" : "Nuevo producto"}>
      <form onSubmit={handleSubmit} className={`${ADMIN_MODAL_PANEL} max-w-3xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-line)] px-6 py-5">
          <div>
            <p className={ADMIN_EYEBROW}>{editing ? "Editar pieza" : "Nueva pieza"}</p>
            <h2 data-display className="mt-2 [font-family:var(--admin-display-font)] text-[26px] font-normal leading-[1.1] text-[var(--admin-ink)]">
              {editing ? "Editar producto" : "Nuevo producto"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className={ADMIN_ICON_BUTTON} aria-label="Cerrar">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-7 px-6 py-6">
          {error && (
            <p className={ADMIN_ERROR} role="alert">
              {error}
            </p>
          )}

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <label className={ADMIN_LABEL}>
              Nombre
              <input
                className={ADMIN_INPUT}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nombre del producto"
                required
              />
            </label>
            <label className={ADMIN_LABEL}>
              Categoría
              <span className="relative block">
                <select
                  className={`${ADMIN_INPUT} pr-6`}
                  value={form.category_id}
                  onChange={(e) => set("category_id", e.target.value)}
                  required
                >
                  <option value="">Seleccionar…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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

            <label className={ADMIN_LABEL}>
              Precio base
              <input
                type="number"
                min={0}
                step="0.01"
                className={ADMIN_INPUT}
                value={form.unit_price}
                onChange={(e) => set("unit_price", Number(e.target.value))}
              />
            </label>
            <label className={ADMIN_LABEL}>
              Stock (unidades)
              <input
                type="number"
                min={0}
                className={ADMIN_INPUT}
                value={form.stock}
                onChange={(e) => set("stock", Math.max(0, Number(e.target.value)))}
              />
            </label>

            <label className={ADMIN_LABEL}>
              Tipo de precio
              <span className="relative block">
                <select
                  className={`${ADMIN_INPUT} pr-6`}
                  value={form.pricing_type}
                  onChange={(e) => set("pricing_type", e.target.value as PricingType)}
                >
                  <option value="SIMPLE">Simple</option>
                  <option value="TIERED">Escalado por cantidad</option>
                  <option value="BUNDLE">Combo / pack</option>
                </select>
                <ChevronDown
                  size={13}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute bottom-2.5 right-0 text-[var(--admin-muted)]"
                />
              </span>
            </label>

            <label className={ADMIN_LABEL}>
              Etiquetas
              <input
                className={ADMIN_INPUT}
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="oferta, nuevo"
              />
            </label>
          </div>

          <label className={ADMIN_LABEL}>
            Descripción
            <textarea
              rows={2}
              className={ADMIN_INPUT}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value || null)}
              placeholder="Materiales, ingredientes, detalles de preparación…"
            />
          </label>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <label className={ADMIN_LABEL}>
              Talles
              <input
                className={ADMIN_INPUT}
                value={sizesText}
                onChange={(e) => setSizesText(e.target.value)}
                placeholder="S, M, L, XL"
              />
            </label>
            <label className={ADMIN_LABEL}>
              Colores
              <input
                className={ADMIN_INPUT}
                value={colorsText}
                onChange={(e) => setColorsText(e.target.value)}
                placeholder="Negro, Blanco, Arena"
              />
            </label>
          </div>

          {form.pricing_type === "TIERED" && (
            <div className="border-t border-[var(--admin-line)] pt-5">
              <p className={ADMIN_EYEBROW}>Escalones · cantidad mínima / precio unitario</p>
              <div className="mt-4 space-y-3">
                {tiers.map((tier, index) => (
                  <div key={index} className="flex items-end gap-3">
                    <input
                      type="number"
                      min={1}
                      placeholder="Cantidad mín."
                      className={ADMIN_INPUT}
                      value={tier.min_quantity}
                      onChange={(e) =>
                        setTiers((prev) =>
                          prev.map((t, i) => (i === index ? { ...t, min_quantity: e.target.value } : t)),
                        )
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Precio unitario"
                      className={ADMIN_INPUT}
                      value={tier.unit_price}
                      onChange={(e) =>
                        setTiers((prev) =>
                          prev.map((t, i) => (i === index ? { ...t, unit_price: e.target.value } : t)),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setTiers((prev) => prev.filter((_, i) => i !== index))}
                      className={`${ADMIN_ICON_BUTTON} hover:text-[var(--admin-danger)]`}
                      aria-label="Quitar escalón"
                    >
                      <Trash2 size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTiers((prev) => [...prev, { min_quantity: "", unit_price: "" }])}
                className={`${ADMIN_ACTION_GHOST} mt-4`}
              >
                <Plus size={13} strokeWidth={1.5} /> Agregar escalón
              </button>
            </div>
          )}

          {form.pricing_type === "BUNDLE" && (
            <div className="grid gap-x-6 gap-y-5 border-t border-[var(--admin-line)] pt-5 sm:grid-cols-2">
              <label className={ADMIN_LABEL}>
                Unidades por combo
                <input
                  type="number"
                  min={1}
                  className={ADMIN_INPUT}
                  value={form.bundle_size ?? ""}
                  onChange={(e) => set("bundle_size", e.target.value ? Number(e.target.value) : null)}
                />
              </label>
              <label className={ADMIN_LABEL}>
                Precio del combo
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={ADMIN_INPUT}
                  value={form.bundle_price ?? ""}
                  onChange={(e) => set("bundle_price", e.target.value ? Number(e.target.value) : null)}
                />
              </label>
            </div>
          )}

          <div className="border-t border-[var(--admin-line)] pt-5">
            <p className={ADMIN_EYEBROW}>Imagen principal</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden bg-[var(--admin-surface)]">
                {form.image_url ? (
                  <Image src={form.image_url} alt="Vista previa" fill sizes="96px" className="object-cover" />
                ) : (
                  <Package size={22} strokeWidth={1.5} className="text-[var(--admin-faint)]" />
                )}
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className={ADMIN_ACTION_GHOST}
                >
                  {uploading ? (
                    <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />
                  ) : (
                    <ImagePlus size={13} strokeWidth={1.5} />
                  )}
                  {uploading ? "Subiendo…" : "Subir imagen"}
                </button>
                {form.image_url && (
                  <button
                    type="button"
                    onClick={() => set("image_url", null)}
                    className="block text-[10px] uppercase tracking-[0.12em] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-danger)]"
                  >
                    Quitar imagen
                  </button>
                )}
                {!isCloudinaryConfigured() && (
                  <p className="text-[11px] leading-4 text-[var(--admin-warning)]">
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
              className={`${ADMIN_INPUT} mt-5`}
              placeholder="…o pegá una URL de imagen"
              value={form.image_url ?? ""}
              onChange={(e) => set("image_url", e.target.value || null)}
            />
            <label className={`${ADMIN_LABEL} mt-5`}>
              Galería adicional · una URL por línea
              <textarea
                rows={3}
                className={ADMIN_INPUT}
                value={galleryText}
                onChange={(e) => setGalleryText(e.target.value)}
                placeholder={"https://res.cloudinary.com/…\nhttps://res.cloudinary.com/…"}
              />
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm text-[var(--admin-ink)]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-4 w-4 accent-[var(--admin-ink)]"
            />
            Producto activo · visible en la tienda
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--admin-line)] px-6 py-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={ADMIN_ACTION_GHOST}>
            Cancelar
          </button>
          <button type="submit" disabled={saving || uploading} className={ADMIN_ACTION_PRIMARY}>
            {saving && <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />}
            {editing ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </form>
    </div>
  );
}
