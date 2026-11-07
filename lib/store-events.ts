/**
 * Puente de eventos entre el chrome del storefront y el catálogo.
 *
 * La navbar vive en el layout y el estado del catálogo (productos, carrito,
 * filtros) vive en `StoreCatalog`. En lugar de duplicar ese estado o de
 * prop-drilling a través del layout, ambos se comunican con eventos.
 */

/** Abre el carrito lateral. */
export const OPEN_CART_EVENT = "store:open-cart";

/** Aplica un término de búsqueda en el catálogo. */
export const SEARCH_EVENT = "store:search";

/** Aplica una categoría (y opcionalmente una etiqueta/estilo). */
export const CATEGORY_EVENT = "store:select-category";

/** Publica la cantidad de piezas en el carrito para el badge de la navbar. */
export const CART_COUNT_EVENT = "store:cart-count";

export type CategorySelection = {
  categoryId: string;
  tag?: string;
};

export type SearchSelection = {
  query: string;
};

export type CartCountDetail = {
  count: number;
};

export function dispatchStoreEvent<T>(name: string, detail: T) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<T>(name, { detail }));
}
