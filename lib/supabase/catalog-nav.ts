import { cache } from "react";
import { createPublicClient } from "./public";
import type { Category } from "../types";

export type BoutiqueNavigation = {
  categories: Category[];
  /** Etiquetas de producto agrupadas por categoría (se usan como submenú). */
  tagsByCategory: Record<string, string[]>;
};

const MAX_TAGS_PER_CATEGORY = 8;

/**
 * Datos mínimos para la navegación boutique, leídos en el Server Component
 * del layout: así las categorías ya están en el HTML inicial (sin salto de
 * layout ni request extra desde el cliente).
 *
 * `cache()` deduplica la consulta si otro Server Component la pide en el
 * mismo request.
 */
export const getBoutiqueNavigation = cache(
  async (storeId: string): Promise<BoutiqueNavigation> => {
    const supabase = createPublicClient();
    if (!supabase) return { categories: [], tagsByCategory: {} };

    const [categoriesRes, tagsRes] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, sort_order, store_id")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("products")
        .select("category_id, tags")
        .eq("store_id", storeId)
        .eq("active", true),
    ]);

    if (categoriesRes.error) {
      console.error("No se pudieron cargar las categorías:", categoriesRes.error.message);
    }
    if (tagsRes.error) {
      console.error("No se pudieron cargar las etiquetas:", tagsRes.error.message);
    }

    const categories: Category[] = (categoriesRes.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      ...(row.sort_order === null || row.sort_order === undefined
        ? {}
        : { sort_order: Number(row.sort_order) }),
      ...(row.store_id ? { store_id: String(row.store_id) } : {}),
    }));

    const tagsByCategory: Record<string, string[]> = {};

    for (const row of tagsRes.data ?? []) {
      const categoryId = row.category_id ? String(row.category_id) : "";
      if (!categoryId || !Array.isArray(row.tags)) continue;

      const bucket = (tagsByCategory[categoryId] ??= []);

      for (const raw of row.tags) {
        if (typeof raw !== "string") continue;
        const tag = raw.trim();
        if (tag && !bucket.includes(tag)) bucket.push(tag);
      }
    }

    for (const [categoryId, tags] of Object.entries(tagsByCategory)) {
      tagsByCategory[categoryId] = tags
        .sort((a, b) => a.localeCompare(b, "es"))
        .slice(0, MAX_TAGS_PER_CATEGORY);
    }

    return { categories, tagsByCategory };
  },
);
