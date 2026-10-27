import { NextResponse } from "next/server";

type PreferenceItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

type PreferenceBody = {
  storeSlug?: unknown;
  storeName?: unknown;
  orderId?: unknown;
  payerName?: unknown;
  payerPhone?: unknown;
  items?: unknown;
};

function isItem(value: unknown): value is PreferenceItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.title === "string" &&
    item.title.trim().length > 0 &&
    typeof item.quantity === "number" &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0 &&
    typeof item.unit_price === "number" &&
    Number.isFinite(item.unit_price) &&
    item.unit_price >= 0
  );
}

/** Crea una preferencia de pago server-side (el token nunca llega al cliente). */
export async function POST(request: Request): Promise<NextResponse> {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "Mercado Pago no está configurado. Definí MERCADO_PAGO_ACCESS_TOKEN o usá el checkout por WhatsApp.",
      },
      { status: 503 },
    );
  }

  let body: PreferenceBody;
  try {
    body = (await request.json()) as PreferenceBody;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items.filter(isItem) : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "El pedido no tiene items válidos." }, { status: 400 });
  }

  const storeSlug = typeof body.storeSlug === "string" ? body.storeSlug : "tienda";
  const storeName = typeof body.storeName === "string" ? body.storeName : "Tienda";
  const orderId = typeof body.orderId === "string" ? body.orderId : undefined;
  const payerName = typeof body.payerName === "string" ? body.payerName : "Cliente";
  const payerPhone = typeof body.payerPhone === "string" ? body.payerPhone : undefined;

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get("origin") ??
    new URL(request.url).origin;

  const preference = {
    items: items.map((item) => ({
      title: item.title.slice(0, 250),
      quantity: Math.floor(item.quantity),
      unit_price: Number(item.unit_price.toFixed(2)),
      currency_id: "ARS",
    })),
    payer: {
      name: payerName,
      ...(payerPhone ? { phone: { number: payerPhone } } : {}),
    },
    external_reference: orderId,
    statement_descriptor: storeName.slice(0, 22).toUpperCase(),
    back_urls: {
      success: `${origin}/${storeSlug}?pago=success`,
      pending: `${origin}/${storeSlug}?pago=pending`,
      failure: `${origin}/${storeSlug}?pago=failure`,
    },
    auto_return: "approved",
    metadata: { store_slug: storeSlug, order_id: orderId ?? null },
  };

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preference),
  });

  const data = (await response.json().catch(() => null)) as
    | { id?: string; init_point?: string; sandbox_init_point?: string; message?: string }
    | null;

  if (!response.ok || !data?.init_point) {
    return NextResponse.json(
      {
        error:
          data?.message ??
          "Mercado Pago rechazó la solicitud. Revisá el access token y los datos de la preferencia.",
      },
      { status: response.status >= 400 ? response.status : 502 },
    );
  }

  return NextResponse.json({
    preference_id: data.id ?? "",
    init_point: data.init_point,
  });
}
