import type { Store } from "./types";

/**
 * Configuración del comercio. No vive en la base de datos (no hay tabla `store`),
 * así que se define acá y puede sobreescribirse por variables de entorno públicas.
 */
export const STORE: Store = {
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? "Almacén del Barrio",
  whatsapp: process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? "5491123456789",
  alias: process.env.NEXT_PUBLIC_STORE_ALIAS ?? "almacen.barrio.mp",
  cbu: process.env.NEXT_PUBLIC_STORE_CBU ?? "0000000000000000000000",
  titular: process.env.NEXT_PUBLIC_STORE_TITULAR ?? "Nombre del Titular",
};
