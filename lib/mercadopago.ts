import type { CartLine } from "./types";

export type MercadoPagoPreferenceItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: "ARS";
};

export type MercadoPagoPreferenceRequest = {
  storeSlug: string;
  storeName: string;
  orderId?: string;
  items: MercadoPagoPreferenceItem[];
  payerName: string;
  payerPhone?: string;
};

export type MercadoPagoPreferenceResponse = {
  init_point: string;
  preference_id: string;
};

/**
 * Hook de integración con Mercado Pago.
 * La preferencia se crea server-side en `/api/mercadopago/preference` para no
 * exponer el access token en el navegador.
 */
export async function createMercadoPagoPreference(
  payload: MercadoPagoPreferenceRequest,
): Promise<MercadoPagoPreferenceResponse> {
  const response = await fetch("/api/mercadopago/preference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as
    | (Partial<MercadoPagoPreferenceResponse> & { error?: string })
    | null;

  if (!response.ok || !data?.init_point) {
    throw new Error(data?.error ?? "No se pudo iniciar el pago con Mercado Pago.");
  }

  return {
    init_point: data.init_point,
    preference_id: data.preference_id ?? "",
  };
}

/** Convierte las líneas del carrito al formato de items de Mercado Pago. */
export function toMercadoPagoItems(
  lines: CartLine[],
  unitPriceOf: (line: CartLine) => number,
): MercadoPagoPreferenceItem[] {
  return lines.map((line) => {
    const variant = [line.variant?.size ? `Talle ${line.variant.size}` : null, line.variant?.color]
      .filter(Boolean)
      .join(" / ");
    return {
      title: variant ? `${line.product.name} (${variant})` : line.product.name,
      quantity: line.quantity,
      unit_price: Math.round(unitPriceOf(line)),
      currency_id: "ARS",
    };
  });
}
