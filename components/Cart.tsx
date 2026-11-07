"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import type { CartLine, Checkout, FulfillmentType, Store } from "@/lib/types";
import { calcSavings, calcSubtotal, formatARS } from "@/lib/pricing";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatRanges, getPickupInfo } from "@/lib/schedule";
import { variantText } from "@/lib/cart";

type Props = {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  onChangeQty: (lineId: string, quantity: number) => void; // 0 = eliminar
  onChangeNote?: (lineId: string, note: string) => void;
  store: Store;
  // Se dispara al confirmar el pedido (además de abrir WhatsApp / MP).
  onConfirm?: (checkout: Checkout, lines: CartLine[]) => void | Promise<void>;
  onMercadoPago?: (checkout: Checkout, lines: CartLine[]) => void | Promise<void>;
};

const BOUTIQUE_FIELD =
  "w-full rounded-none border-0 border-b border-[var(--store-divider)] bg-transparent px-0 py-2 [font-family:var(--store-font-body)] text-sm text-[var(--store-ink)] outline-none transition-colors placeholder:text-[var(--store-ink-muted)] focus:border-[var(--store-ink)]";

const RETAIL_FIELD =
  "w-full rounded border border-neutral-300 bg-white p-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

export default function Cart({
  open,
  onClose,
  lines,
  onChangeQty,
  onChangeNote,
  store,
  onConfirm,
  onMercadoPago,
}: Props) {
  const settings = store.settings;
  const { fulfillment: fulfillmentSettings, features } = settings;
  const checkoutType = settings.checkout_type;
  const boutique = settings.design.storefront_layout === "boutique";

  const defaultFulfillment: FulfillmentType =
    fulfillmentSettings.pickup_enabled ? "PICKUP" : "DELIVERY";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<FulfillmentType>(defaultFulfillment);
  const [pickupTime, setPickupTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState(
    checkoutType === "MERCADO_PAGO" ? "Mercado Pago" : "Efectivo",
  );
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Se recalcula cada vez que se abre el carrito para reflejar la hora actual.
  const pickupInfo = useMemo(() => (open ? getPickupInfo() : null), [open]);
  const slots = pickupInfo?.slots ?? [];
  const ranges = pickupInfo?.ranges ?? [];
  const currentlyOpen = pickupInfo?.currentlyOpen ?? false;
  const dayLabel = pickupInfo?.dayLabel ?? "";
  const isToday = pickupInfo?.isToday ?? true;
  const selectedTime = slots.includes(pickupTime) ? pickupTime : slots[0] ?? "";

  const total = useMemo(() => lines.reduce((a, l) => a + calcSubtotal(l.product, l.quantity), 0), [lines]);
  const savings = useMemo(() => lines.reduce((a, l) => a + calcSavings(l.product, l.quantity), 0), [lines]);

  const canSend =
    lines.length > 0 &&
    name.trim().length > 0 &&
    phone.trim().length >= 6 &&
    (fulfillment === "PICKUP"
      ? selectedTime !== ""
      : address.trim().length >= 5) &&
    !processing;

  const buildCheckout = (overridePayment?: string): Checkout => ({
    name: name.trim(),
    phone: phone.trim(),
    fulfillment,
    pickupTime: fulfillment === "PICKUP" ? selectedTime : "",
    address: fulfillment === "DELIVERY" ? address.trim() : "",
    payment: overridePayment ?? payment,
    notes: notes.trim(),
  });

  // Verifica stock antes de incrementar
  const increment = (line: CartLine) => {
    if (line.quantity + 1 > line.product.stock) return;
    onChangeQty(line.lineId, line.quantity + 1);
  };

  const confirmWhatsApp = (overridePayment?: string) => {
    if (!canSend) return;
    const checkout = buildCheckout(overridePayment);
    // Abrimos WhatsApp primero (sincrónico) para que el navegador no bloquee el popup.
    window.open(buildWhatsAppUrl(store.whatsapp, lines, checkout, store.name), "_blank");
    void onConfirm?.(checkout, lines);
  };

  const confirmMercadoPago = async () => {
    if (!canSend) return;
    if (!onMercadoPago) {
      setError("El checkout de Mercado Pago no está disponible en este momento.");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      await onMercadoPago(buildCheckout("Mercado Pago"), lines);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago.");
    } finally {
      setProcessing(false);
    }
  };

  // Bloquea el scroll, cierra con Escape y enfoca el botón de cierre al abrir.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous || "unset";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // El drawer queda montado para poder animar la salida; `inert` evita que
  // el foco entre al panel mientras está cerrado.
  const fieldClass = boutique ? BOUTIQUE_FIELD : RETAIL_FIELD;

  const paymentOptions =
    checkoutType === "MERCADO_PAGO"
      ? ["Mercado Pago", "Efectivo", "Transferencia"]
      : ["Efectivo", "Transferencia"];

  const primaryAction = boutique
    ? "bg-[var(--store-primary)] text-[var(--store-ink)] hover:bg-[var(--store-primary-hover)]"
    : checkoutType === "MERCADO_PAGO"
      ? "bg-sky-600 text-white hover:bg-sky-700"
      : "bg-green-600 text-white hover:bg-green-700";

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/40 transition-opacity duration-300 motion-reduce:transition-none ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        inert={!open}
        className={`flex h-full w-full max-w-md flex-col transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        } ${boutique ? "bg-[var(--store-background)] text-[var(--store-ink)]" : "bg-white dark:bg-neutral-900"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className={
            boutique
              ? "flex flex-none items-center justify-between border-b border-[var(--store-divider)] px-6 py-5"
              : "flex flex-none items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800"
          }
        >
          <div>
            <h2
              className={
                boutique
                  ? "[font-family:var(--store-font-heading)] text-[24px] font-normal leading-[1.2] text-[var(--store-ink)]"
                  : "text-lg font-semibold text-neutral-900 dark:text-neutral-100"
              }
            >
              Tu pedido
            </h2>
            <p
              className={
                boutique
                  ? "mt-1 [font-family:var(--store-font-body)] text-[11px] uppercase leading-none tracking-[0.14em] text-[var(--store-ink-muted)]"
                  : "text-xs text-neutral-500 dark:text-neutral-400"
              }
            >
              {store.name}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Cerrar"
            className={
              boutique
                ? "inline-flex h-11 w-11 items-center justify-center text-[var(--store-ink)] transition-opacity duration-300 hover:opacity-60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-ink)] motion-reduce:transition-none"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            }
          >
            <X strokeWidth={boutique ? 1.5 : undefined} />
          </button>
        </header>

        <div
          className={
            boutique
              ? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6"
              : "min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4"
          }
        >
          {lines.length === 0 && (
            <p
              className={
                boutique
                  ? "py-10 [font-family:var(--store-font-body)] text-sm text-[var(--store-ink-muted)]"
                  : "text-neutral-500 dark:text-neutral-400"
              }
            >
              Todavía no agregaste productos.
            </p>
          )}

          {lines.map((line) => {
            const atMax = line.quantity >= line.product.stock;
            const options = variantText(line.variant);
            return (
              <div
                key={line.lineId}
                className={
                  boutique
                    ? "border-b border-[var(--store-divider)] py-5 last:border-b-0"
                    : "rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                }
              >
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={
                        boutique
                          ? "[font-family:var(--store-font-body)] text-[13px] font-medium leading-5 text-[var(--store-ink)]"
                          : "font-medium text-neutral-900 dark:text-neutral-100"
                      }
                    >
                      {line.product.name}
                    </p>
                    {options && (
                      <p
                        className={
                          boutique
                            ? "mt-0.5 [font-family:var(--store-font-body)] text-[10px] uppercase leading-none tracking-[0.12em] text-[var(--store-ink-muted)]"
                            : "text-xs text-neutral-500 dark:text-neutral-400"
                        }
                      >
                        {options}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onChangeQty(line.lineId, 0)}
                    aria-label="Quitar"
                    className={
                      boutique
                        ? "text-[var(--store-ink-muted)] transition-colors hover:text-[var(--store-ink)]"
                        : "text-neutral-500 hover:text-red-600 dark:text-neutral-400"
                    }
                  >
                    <Trash2 size={18} strokeWidth={boutique ? 1.5 : undefined} />
                  </button>
                </div>

                {features.custom_notes && onChangeNote && (
                  <input
                    value={line.note ?? ""}
                    onChange={(event) => onChangeNote(line.lineId, event.target.value)}
                    placeholder="Aclaración: sin cebolla, cocción suave…"
                    className={
                      boutique
                        ? `${BOUTIQUE_FIELD} mt-2 text-xs`
                        : "mt-2 w-full rounded border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-800 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                    }
                  />
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      className={
                        boutique
                          ? "flex h-9 w-9 items-center justify-center border border-[var(--store-divider)] text-[var(--store-ink)] transition-colors hover:border-[var(--store-ink)] disabled:opacity-30"
                          : "rounded border border-neutral-300 p-1 dark:border-neutral-700"
                      }
                      onClick={() => onChangeQty(line.lineId, line.quantity - 1)}
                      aria-label="Restar"
                    >
                      <Minus size={16} strokeWidth={boutique ? 1.5 : undefined} />
                    </button>
                    <span
                      className={
                        boutique
                          ? "w-6 text-center [font-family:var(--store-font-body)] text-[13px] tabular-nums text-[var(--store-ink)]"
                          : "w-6 text-center text-neutral-900 dark:text-neutral-100"
                      }
                    >
                      {line.quantity}
                    </span>
                    <button
                      className={
                        boutique
                          ? "flex h-9 w-9 items-center justify-center border border-[var(--store-divider)] text-[var(--store-ink)] transition-colors hover:border-[var(--store-ink)] disabled:opacity-30"
                          : "rounded border border-neutral-300 p-1 disabled:opacity-30 dark:border-neutral-700"
                      }
                      disabled={atMax}
                      onClick={() => increment(line)}
                      aria-label="Sumar"
                    >
                      <Plus size={16} strokeWidth={boutique ? 1.5 : undefined} />
                    </button>
                  </div>
                  <p
                    className={
                      boutique
                        ? "[font-family:var(--store-font-body)] text-[13px] font-medium tabular-nums text-[var(--store-ink)]"
                        : "font-semibold text-neutral-900 dark:text-neutral-100"
                    }
                  >
                    {formatARS(calcSubtotal(line.product, line.quantity))}
                  </p>
                </div>
                {atMax && (
                  <p
                    className={
                      boutique
                        ? "mt-2 [font-family:var(--store-font-body)] text-[10px] uppercase tracking-[0.12em] text-[var(--store-ink-muted)]"
                        : "mt-1 text-xs text-amber-600 dark:text-amber-400"
                    }
                  >
                    Máximo disponible: {line.product.stock}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <footer
          className={
            boutique
              ? "flex-none space-y-4 border-t border-[var(--store-divider)] px-6 py-6"
              : "flex-none space-y-3 border-t border-neutral-200 p-4 dark:border-neutral-800"
          }
        >
          {savings > 0 && (
            <p
              className={
                boutique
                  ? "[font-family:var(--store-font-body)] text-[11px] uppercase tracking-[0.12em] text-[var(--store-ink-muted)]"
                  : "text-sm text-green-700 dark:text-green-400"
              }
            >
              Ahorrás {formatARS(savings)} con las promos
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <input
              className={fieldClass}
              placeholder="Tu nombre *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <input
              className={fieldClass}
              placeholder="WhatsApp *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          {(fulfillmentSettings.pickup_enabled || fulfillmentSettings.shipping_enabled) && (
            <div className="grid grid-cols-2 gap-2">
              {fulfillmentSettings.pickup_enabled && (
                <button
                  type="button"
                  onClick={() => setFulfillment("PICKUP")}
                  className={
                    boutique
                      ? `flex items-center justify-center gap-2 rounded-lg border px-3 py-2 [font-family:var(--store-font-body)] text-[11px] font-medium uppercase leading-none tracking-[0.08em] transition-colors motion-reduce:transition-none ${
                          fulfillment === "PICKUP"
                            ? "border-[var(--store-primary)] bg-[var(--store-primary)] text-[var(--store-ink)]"
                            : "border-[var(--store-divider)] text-[var(--store-ink-muted)] hover:text-[var(--store-ink)]"
                        }`
                      : `flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          fulfillment === "PICKUP"
                            ? "border-brand-solid bg-brand-solid text-white"
                            : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                        }`
                  }
                >
                  <StoreIcon size={16} strokeWidth={boutique ? 1.5 : undefined} /> Retiro
                </button>
              )}
              {fulfillmentSettings.shipping_enabled && (
                <button
                  type="button"
                  onClick={() => setFulfillment("DELIVERY")}
                  className={
                    boutique
                      ? `flex items-center justify-center gap-2 rounded-lg border px-3 py-2 [font-family:var(--store-font-body)] text-[11px] font-medium uppercase leading-none tracking-[0.08em] transition-colors motion-reduce:transition-none ${
                          fulfillment === "DELIVERY"
                            ? "border-[var(--store-primary)] bg-[var(--store-primary)] text-[var(--store-ink)]"
                            : "border-[var(--store-divider)] text-[var(--store-ink-muted)] hover:text-[var(--store-ink)]"
                        }`
                      : `flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          fulfillment === "DELIVERY"
                            ? "border-brand-solid bg-brand-solid text-white"
                            : "border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
                        }`
                  }
                >
                  <Bike size={16} strokeWidth={boutique ? 1.5 : undefined} /> Delivery
                </button>
              )}
            </div>
          )}

          {fulfillment === "PICKUP" ? (
            <>
              <label className="block space-y-1">
                <span
                  className={
                    boutique
                      ? "[font-family:var(--store-font-body)] text-[10px] uppercase tracking-[0.12em] text-[var(--store-ink-muted)]"
                      : "text-xs text-neutral-500 dark:text-neutral-400"
                  }
                >
                  Horario de retiro *
                </span>
                <select
                  required
                  className={`${fieldClass} disabled:opacity-60`}
                  value={selectedTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  disabled={slots.length === 0}
                >
                  {slots.length === 0 && <option value="">Sin horarios disponibles</option>}
                  {slots.map((slot) => (
                    <option key={slot} value={slot}>
                      {isToday ? slot : `${dayLabel} ${slot}`}
                    </option>
                  ))}
                </select>
              </label>
              {!currentlyOpen && (
                <p
                  className={
                    boutique
                      ? "border-l border-[var(--store-ink)] pl-3 [font-family:var(--store-font-body)] text-[11px] leading-5 text-[var(--store-ink-muted)]"
                      : "rounded bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  }
                >
                  El local se encuentra cerrado.{" "}
                  {slots.length === 0
                    ? "No hay horarios de retiro disponibles en este momento."
                    : isToday
                      ? `Seleccioná un horario dentro de nuestras franjas de atención: ${formatRanges(ranges)}.`
                      : `Podés retirar ${dayLabel} dentro de nuestras franjas de atención: ${formatRanges(ranges)}.`}
                </p>
              )}
            </>
          ) : (
            <label className="block space-y-1">
              <span
                className={
                  boutique
                    ? "flex items-center gap-1 [font-family:var(--store-font-body)] text-[10px] uppercase tracking-[0.12em] text-[var(--store-ink-muted)]"
                    : "flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400"
                }
              >
                <MapPin size={12} strokeWidth={boutique ? 1.5 : undefined} /> Dirección de entrega *
              </span>
              <textarea
                required
                rows={2}
                className={`${fieldClass} resize-none`}
                placeholder="Calle, número, piso/depto y localidad"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
          )}

          {checkoutType === "MERCADO_PAGO" ? (
            <p
              className={
                boutique
                  ? "flex items-center gap-2 border-l border-[var(--store-ink)] pl-3 [font-family:var(--store-font-body)] text-[11px] leading-5 text-[var(--store-ink-muted)]"
                  : "flex items-center gap-2 rounded bg-sky-50 p-2 text-xs text-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
              }
            >
              <Wallet size={14} strokeWidth={boutique ? 1.5 : undefined} /> El pago se procesa en
              Mercado Pago. También podés coordinar por WhatsApp.
            </p>
          ) : (
            <select
              className={fieldClass}
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            >
              {paymentOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          )}

          {features.custom_notes && (
            <label className="block space-y-1">
              <span
                className={
                  boutique
                    ? "[font-family:var(--store-font-body)] text-[10px] uppercase tracking-[0.12em] text-[var(--store-ink-muted)]"
                    : "text-xs text-neutral-500 dark:text-neutral-400"
                }
              >
                Notas del pedido
              </span>
              <textarea
                rows={2}
                className={`${fieldClass} resize-none`}
                placeholder="Ej: tocar timbre, entregar después de las 20 h…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          )}

          {store.alias && payment.toLowerCase().includes("transferencia") && (
            <p
              className={
                boutique
                  ? "border-y border-[var(--store-divider)] py-2 [font-family:var(--store-font-body)] text-[11px] leading-5 text-[var(--store-ink-muted)]"
                  : "rounded bg-neutral-100 p-2 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              }
            >
              Transferencia · Alias: <b>{store.alias}</b>
              {store.cbu ? ` · CBU: ${store.cbu}` : ""}
              {store.titular ? ` · ${store.titular}` : ""}
            </p>
          )}

          <div
            className={
              boutique
                ? "flex items-baseline justify-between border-t border-[var(--store-divider)] pt-4 [font-family:var(--store-font-heading)] text-[20px] leading-none text-[var(--store-ink)]"
                : "flex justify-between text-lg font-bold text-neutral-900 dark:text-neutral-100"
            }
          >
            <span>Total estimado</span>
            <span className="tabular-nums">{formatARS(total)}</span>
          </div>

          {error && (
            <p
              className={
                boutique
                  ? "border-l border-[var(--store-ink)] pl-3 [font-family:var(--store-font-body)] text-xs text-[var(--store-ink)]"
                  : "rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
              }
            >
              {error}
            </p>
          )}

          {checkoutType === "MERCADO_PAGO" ? (
            <>
              <button
                disabled={!canSend}
                onClick={() => void confirmMercadoPago()}
                className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold transition-colors disabled:opacity-40 ${
                  boutique
                    ? `${primaryAction} [font-family:var(--store-font-body)] text-[11px] uppercase tracking-[0.1em]`
                    : "bg-sky-600 text-white hover:bg-sky-700"
                }`}
              >
                {processing ? <Loader2 size={20} className="animate-spin" /> : <Wallet size={20} strokeWidth={boutique ? 1.5 : undefined} />}
                {processing ? "Preparando pago…" : "Pagar con Mercado Pago"}
              </button>
              <button
                type="button"
                disabled={!canSend || processing}
                onClick={() => confirmWhatsApp("A coordinar")}
                className={
                  boutique
                    ? "flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--store-divider)] py-2.5 [font-family:var(--store-font-body)] text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--store-ink)] transition-colors hover:border-[var(--store-ink)] disabled:opacity-40"
                    : "flex w-full items-center justify-center gap-2 rounded-lg border border-green-600 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-40 dark:text-green-400 dark:hover:bg-green-950/30"
                }
              >
                <MessageCircle size={16} strokeWidth={boutique ? 1.5 : undefined} /> Pedir por WhatsApp
              </button>
            </>
          ) : (
            <button
              disabled={!canSend}
              onClick={() => confirmWhatsApp()}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold transition-colors disabled:opacity-40 ${
                boutique
                  ? `${primaryAction} [font-family:var(--store-font-body)] text-[11px] uppercase tracking-[0.1em]`
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              <MessageCircle size={20} strokeWidth={boutique ? 1.5 : undefined} /> Confirmar pedido por WhatsApp
            </button>
          )}

          <p
            className={
              boutique
                ? "flex items-center justify-center gap-1 text-center [font-family:var(--store-font-body)] text-[10px] uppercase tracking-[0.1em] text-[var(--store-ink-muted)]"
                : "flex items-center justify-center gap-1 text-center text-[11px] text-neutral-400 dark:text-neutral-500"
            }
          >
            <ShoppingBag size={11} strokeWidth={boutique ? 1.5 : undefined} /> Pedido sin cargo: se confirma con el comercio.
          </p>
        </footer>
      </aside>
    </div>
  );
}
