import type { CartLine } from "./types";
import { calcSubtotal, formatARS } from "./pricing";

export type Checkout = { name: string; pickupTime: string; payment: "Efectivo" | "Transferencia al retirar" };

export function buildWhatsAppUrl(phone: string, lines: CartLine[], c: Checkout): string {
  const total = lines.reduce((acc, l) => acc + calcSubtotal(l.product, l.quantity), 0);
  const detail = lines
    .map((l) => `- ${l.quantity}x ${l.product.name} (${formatARS(calcSubtotal(l.product, l.quantity))})`)
    .join("\n");

  // Sin emojis y con guiones simples para evitar caracteres que rompen el mensaje.
  const text = [
    "¡Hola! Quiero realizar el siguiente pedido para retirar:",
    "",
    `Cliente: ${c.name}`,
    `Hora aprox. de retiro: ${c.pickupTime}`,
    "",
    "DETALLE DEL PEDIDO:",
    detail,
    "",
    `TOTAL ESTIMADO: ${formatARS(total)}`,
    `Metodo de pago preferido: ${c.payment}`,
  ].join("\n");

  // `formatARS` usa un espacio no separable (U+00A0); lo normalizamos a espacio común.
  const safeText = text.replace(/\u00a0/g, " ");

  return `https://wa.me/${phone}?text=${encodeURIComponent(safeText)}`;
}
