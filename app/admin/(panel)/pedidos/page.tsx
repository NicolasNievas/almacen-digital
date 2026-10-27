"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, ClipboardList, Loader2, Package, Printer, RefreshCw, X } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchAdminStore, fetchOrdersWithItems, fetchProducts } from "@/lib/supabase/queries";
import { printTicket, type TicketItem } from "@/lib/printTicket";
import { formatARS } from "@/lib/pricing";
import type { OrderItemRow, OrderWithItems, Product } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  COMPLETED: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  CANCELLED: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTicketItem(item: OrderItemRow, product?: Product): TicketItem {
  const listUnitPrice =
    product?.unit_price ?? (item.quantity > 0 ? item.line_total / item.quantity : item.line_total);

  let note: string | undefined;
  if (product) {
    if (product.pricing_type === "TIERED" && product.pricing_tiers.length > 0) {
      const tier = [...product.pricing_tiers]
        .sort((a, b) => b.min_quantity - a.min_quantity)
        .find((t) => item.quantity >= t.min_quantity);
      if (tier && tier.unit_price < listUnitPrice) {
        note = `(Promo x${tier.min_quantity}+: ${formatARS(tier.unit_price)} c/u)`;
      }
    } else if (product.pricing_type === "BUNDLE" && product.bundle_size) {
      note = `(Pack Combo x${product.bundle_size})`;
    }
  }

  return {
    productName: item.product_name,
    quantity: item.quantity,
    unitPrice: listUnitPrice,
    originalUnitPrice: listUnitPrice,
    subtotal: item.line_total,
    note,
  };
}

function printOrderTicket(order: OrderWithItems, productsByName: Map<string, Product>): void {
  const items: TicketItem[] = order.items.map((item) =>
    buildTicketItem(item, productsByName.get(item.product_name.trim().toLowerCase())),
  );
  const originalTotal = items.reduce((acc, i) => acc + (i.originalUnitPrice ?? i.unitPrice) * i.quantity, 0);

  printTicket({
    orderId: order.id,
    createdAt: order.created_at,
    customerName: order.customer_name ?? undefined,
    source: order.source,
    paymentMethod: order.payment_method ?? "—",
    items,
    total: order.total,
    originalTotal,
  });
}

export default function PedidosPage() {
  const configured = isSupabaseConfigured();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const productsByName = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.name.trim().toLowerCase(), p);
    return map;
  }, [products]);

  const load = useCallback(async () => {
    try {
      const store = await fetchAdminStore();
      const [ordersData, productsData] = await Promise.all([
        fetchOrdersWithItems(store.id),
        fetchProducts(store.id),
      ]);
      setOrders(ordersData);
      setProducts(productsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    (async () => {
      try {
        const store = await fetchAdminStore();
        const [ordersData, productsData] = await Promise.all([
          fetchOrdersWithItems(store.id),
          fetchProducts(store.id),
        ]);
        if (active) {
          setOrders(ordersData);
          setProducts(productsData);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No se pudieron cargar los pedidos.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [configured]);

  const processOrder = async (id: string, rpc: "confirm_order" | "cancel_order") => {
    setBusyId(id);
    setError(null);
    try {
      const { error: rpcError } = await createClient().rpc(rpc, { p_order: id });
      if (rpcError) throw rpcError;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar el pedido.");
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageOrders = orders.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Pedidos</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Gestión de pedidos web pendientes de confirmación y registro de ventas presenciales.
          </p>
        </div>
        <button
          type="button"
          onClick={() => configured && void load()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {!configured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          No pudimos cargar los pedidos en este momento. Volvé a intentar en unos minutos.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500 dark:bg-neutral-800/50 dark:text-neutral-400">
            <tr>
              <th className="p-3 font-medium">Fecha</th>
              <th className="p-3 font-medium">Origen</th>
              <th className="p-3 font-medium">Cliente</th>
              <th className="p-3 font-medium">Entrega</th>
              <th className="p-3 font-medium">Pago</th>
              <th className="p-3 font-medium">Total</th>
              <th className="p-3 font-medium">Estado</th>
              <th className="p-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-neutral-500 dark:text-neutral-400">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                  Cargando pedidos...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-neutral-500 dark:text-neutral-400">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                  Todavía no hay pedidos.
                </td>
              </tr>
            ) : (
              pageOrders.map((order) => (
                <Fragment key={order.id}>
                  <tr className="text-neutral-800 dark:text-neutral-200">
                    <td className="p-3 whitespace-nowrap text-neutral-500 dark:text-neutral-400">{formatDate(order.created_at)}</td>
                    <td className="p-3">
                      <span
                        className={
                          order.source === "POS"
                            ? "rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-300"
                        }
                      >
                        {order.source}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="block">{order.customer_name ?? "—"}</span>
                      {order.customer_phone && (
                        <span className="block text-xs text-neutral-400">{order.customer_phone}</span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-500 dark:text-neutral-400">
                      {order.source === "POS" ? (
                        <span className="italic">Venta presencial</span>
                      ) : order.fulfillment_type === "DELIVERY" ? (
                        <span className="block max-w-[220px]">
                          <b className="text-neutral-600 dark:text-neutral-300">Delivery</b>
                          <span className="block truncate text-xs">{order.delivery_address ?? "—"}</span>
                        </span>
                      ) : (
                        <span>
                          <b className="text-neutral-600 dark:text-neutral-300">Retiro</b>{" "}
                          {order.pickup_time?.slice(0, 5) ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-neutral-500 dark:text-neutral-400">{order.payment_method ?? "—"}</td>
                    <td className="p-3 font-medium">{formatARS(order.total)}</td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                          className="w-24 shrink-0 text-left text-xs text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-white"
                        >
                          {expanded === order.id ? "Ocultar" : `Ver ${order.items.length} item(s)`}
                        </button>
                        <button
                          type="button"
                          onClick={() => printOrderTicket(order, productsByName)}
                          className="flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-white"
                          aria-label="Imprimir ticket"
                          title="Imprimir ticket"
                        >
                          <Printer size={13} /> Imprimir
                        </button>
                        {order.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === order.id}
                              onClick={() => void processOrder(order.id, "confirm_order")}
                              className="flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
                            >
                              <Check size={13} /> Confirmar
                            </button>
                            <button
                              type="button"
                              disabled={busyId === order.id}
                              onClick={() => void processOrder(order.id, "cancel_order")}
                              className="flex items-center gap-1 rounded border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 hover:text-red-600 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300"
                            >
                              <X size={13} /> Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/40">
                    <td colSpan={8} className="px-3 py-2">
                      {expanded === order.id && (
                        <div className="w-full my-2 rounded-lg border border-neutral-200 bg-neutral-100 p-3 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-100">
                          {(order.notes || order.delivery_address) && (
                            <div className="mb-3 space-y-1 border-b border-neutral-200 pb-2 text-xs dark:border-neutral-700">
                              {order.delivery_address && (
                                <p>
                                  <b>Dirección:</b> {order.delivery_address}
                                </p>
                              )}
                              {order.notes && (
                                <p>
                                  <b>Notas:</b> {order.notes}
                                </p>
                              )}
                            </div>
                          )}
                          <ul className="space-y-2">
                            {order.items.map((item, index) => {
                              const unit = item.quantity > 0 ? item.line_total / item.quantity : item.line_total;
                              return (
                                <li
                                  key={`${order.id}-${index}`}
                                  className="flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-neutral-200 dark:border-neutral-700">
                                      {item.image_url ? (
                                        <Image
                                          src={item.image_url}
                                          alt={item.product_name}
                                          fill
                                          sizes="40px"
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                                          <Package size={16} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="block truncate font-medium text-neutral-900 dark:text-white">
                                        {item.product_name}
                                      </span>
                                      {(item.variant?.size || item.variant?.color || item.note) && (
                                        <span className="block truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                                          {[
                                            item.variant?.size ? `Talle ${item.variant.size}` : null,
                                            item.variant?.color,
                                            item.note ? `Nota: ${item.note}` : null,
                                          ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-3">
                                    <span className="text-neutral-600 dark:text-neutral-400">
                                      {item.quantity} un. x {formatARS(unit)}
                                    </span>
                                    <span className="font-medium tabular-nums text-neutral-900 dark:text-white">{formatARS(item.line_total)}</span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </td>
                  </tr>
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && orders.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300">
          <span>
            Página {current} de {totalPages} · {orders.length} pedidos
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-neutral-700 hover:text-neutral-900 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
            >
              <ChevronLeft size={15} /> Anterior
            </button>
            <button
              type="button"
              disabled={current >= totalPages}
              onClick={() => setPage(current + 1)}
              className="flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-neutral-700 hover:text-neutral-900 disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white"
            >
              Siguiente <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
