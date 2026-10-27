import type { CartLine, Checkout } from "./types";
import { calcSubtotal, formatARS } from "./pricing";

function variantLabel(line: CartLine): string {
  const parts: string[] = [];
  if (line.variant?.size) parts.push(`Talle ${line.variant.size}`);
  if (line.variant?.color) parts.push(`Color ${line.variant.color}`);
  return parts.length > 0 ? ` (${parts.join(" / ")})` : "";
}

/** Resumen textual del pedido, reutilizable por WhatsApp y otros canales. */
export function buildOrderSummary(
  lines: CartLine[],
  checkout: Checkout,
  storeName?: string,
): string {
  const total = lines.reduce((acc, l) => acc + calcSubtotal(l.product, l.quantity), 0);

  const detail = lines
    .map((line) => {
      const subtotal = calcSubtotal(line.product, line.quantity);
      const note = line.note?.trim() ? `\n   Nota: ${line.note.trim()}` : "";
      return `- ${line.quantity}x ${line.product.name}${variantLabel(line)} (${formatARS(subtotal)})${note}`;
    })
    .join("\n");

  const delivery =
    checkout.fulfillment === "DELIVERY"
      ? `Delivery a domicilio: ${checkout.address}`
      : `Retiro en local: ${checkout.pickupTime}`;

  const lines2 = [
    storeName ? `¡Hola ${storeName}! Quiero realizar el siguiente pedido:` : "¡Hola! Quiero realizar el siguiente pedido:",
    "",
    `Cliente: ${checkout.name}`,
    checkout.phone ? `Teléfono: ${checkout.phone}` : null,
    delivery,
    "",
    "DETALLE DEL PEDIDO:",
    detail,
    "",
    `TOTAL ESTIMADO: ${formatARS(total)}`,
    `Metodo de pago preferido: ${checkout.payment}`,
    checkout.notes?.trim() ? `Notas del pedido: ${checkout.notes.trim()}` : null,
  ].filter((line): line is string => line !== null);

  return lines2.join("\n");
}

export function buildWhatsAppUrl(
  phone: string,
  lines: CartLine[],
  checkout: Checkout,
  storeName?: string,
): string {
  const text = buildOrderSummary(lines, checkout, storeName);

  // `formatARS` usa un espacio no separable (U+00A0); lo normalizamos a espacio común.
  const safeText = text.replace(/\u00a0/g, " ");

  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(safeText)}`;
}
