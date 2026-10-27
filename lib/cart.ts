import type { CartLine, Product, ProductVariant } from "./types";

/** Clave estable: mismo producto + mismo talle/color = misma línea. */
export function makeLineId(productId: string, variant?: ProductVariant): string {
  return `${productId}::${variant?.size ?? ""}::${variant?.color ?? ""}`;
}

export function variantText(variant?: ProductVariant): string {
  const parts: string[] = [];
  if (variant?.size) parts.push(`Talle ${variant.size}`);
  if (variant?.color) parts.push(variant.color);
  return parts.join(" · ");
}

export function addLine(
  lines: CartLine[],
  product: Product,
  quantity = 1,
  variant?: ProductVariant,
  note?: string,
): CartLine[] {
  const lineId = makeLineId(product.id, variant);
  const existing = lines.find((line) => line.lineId === lineId);

  if (!existing) {
    return [
      ...lines,
      {
        lineId,
        product,
        quantity: Math.min(quantity, Math.max(product.stock, 0)),
        ...(variant ? { variant } : {}),
        ...(note?.trim() ? { note: note.trim() } : {}),
      },
    ];
  }

  return lines.map((line) =>
    line.lineId === lineId
      ? {
          ...line,
          quantity: Math.min(line.quantity + quantity, product.stock),
          note: note?.trim() ? note.trim() : line.note,
        }
      : line,
  );
}

export function updateLineQuantity(
  lines: CartLine[],
  lineId: string,
  quantity: number,
): CartLine[] {
  if (quantity <= 0) return lines.filter((line) => line.lineId !== lineId);
  return lines.map((line) =>
    line.lineId === lineId
      ? { ...line, quantity: Math.min(quantity, Math.max(line.product.stock, 0)) }
      : line,
  );
}

export function updateLineNote(lines: CartLine[], lineId: string, note: string): CartLine[] {
  return lines.map((line) =>
    line.lineId === lineId ? { ...line, note: note.trim() ? note : undefined } : line,
  );
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((acc, line) => acc + line.quantity, 0);
}
