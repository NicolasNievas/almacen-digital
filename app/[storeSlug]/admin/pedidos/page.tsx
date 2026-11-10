"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  ADMIN_ACTION_GHOST,
  ADMIN_CELL_HEAD,
  ADMIN_EMPTY_TEXT,
  ADMIN_EMPTY_TITLE,
  ADMIN_ERROR,
  ADMIN_EYEBROW,
  ADMIN_GRID_HEAD,
  ADMIN_GRID_ROW,
  ADMIN_LOADING,
} from "@/lib/admin-ui";
import { resolveAdminStoreSlug } from "@/lib/admin-store";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchAdminStore, fetchOrdersWithItems, fetchProducts } from "@/lib/supabase/queries";
import { printTicket, type TicketItem } from "@/lib/printTicket";
import { formatARS } from "@/lib/pricing";
import type { OrderItemRow, OrderWithItems, Product } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-[var(--admin-warning)]",
  COMPLETED: "bg-[var(--admin-positive)]",
  CANCELLED: "bg-[var(--admin-faint)]",
};

const STATUS_TEXT: Record<string, string> = {
  PENDING: "text-[var(--admin-warning)]",
  COMPLETED: "text-[var(--admin-positive)]",
  CANCELLED: "text-[var(--admin-muted)]",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const FILTERS = [
  { key: "ALL", label: "Todos" },
  { key: "PENDING", label: "Pendientes" },
  { key: "COMPLETED", label: "Completados" },
  { key: "CANCELLED", label: "Cancelados" },
] as const;

const PAGE_SIZE = 10;

/**
 * Una sola plantilla para cabecera, fila principal y fila expandida.
 * Total, Estado y Acciones tienen tracks fijos a la derecha; el subtotal de
 * cada ítem hereda el track de Total y queda en la misma vertical.
 */
const ORDER_GRID =
  "grid-cols-[106px_66px_minmax(0,1fr)_minmax(0,1fr)_98px_104px_246px]";

const MINI_PRIMARY =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-[var(--admin-accent)] px-2.5 py-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.1em] text-[var(--admin-on-accent)] transition-colors duration-200 hover:bg-[var(--admin-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";

const MINI_GHOST =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--admin-line-strong)] px-2.5 py-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.1em] text-[var(--admin-muted)] transition-colors duration-200 hover:border-[var(--admin-ink)] hover:text-[var(--admin-ink)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none";

const MINI_ICON =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center text-[var(--admin-muted)] transition-colors duration-200 hover:text-[var(--admin-ink)] disabled:opacity-40 motion-reduce:transition-none";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
  const params = useParams<{ storeSlug: string }>();
  const storeSlug = resolveAdminStoreSlug(params.storeSlug);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const loading = loadedSlug !== storeSlug;
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  // La página se reinicia sola al cambiar de tienda sin efectos: si el slug
  // guardado no coincide con el activo, se usa la primera página.
  const [pagination, setPagination] = useState({ slug: storeSlug, page: 1 });
  const page = pagination.slug === storeSlug ? pagination.page : 1;
  const setPage = (next: number) => setPagination({ slug: storeSlug, page: next });

  const productsByName = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.name.trim().toLowerCase(), p);
    return map;
  }, [products]);

  const load = useCallback(async () => {
    try {
      const store = await fetchAdminStore(storeSlug);
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
      setLoadedSlug(storeSlug);
    }
  }, [storeSlug]);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    (async () => {
      try {
        const store = await fetchAdminStore(storeSlug);
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
        if (active) setLoadedSlug(storeSlug);
      }
    })();
    return () => {
      active = false;
    };
  }, [configured, storeSlug]);

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

  const filtered = useMemo(
    () => (statusFilter === "ALL" ? orders : orders.filter((o) => o.status === statusFilter)),
    [orders, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageOrders = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const countFor = (key: string) =>
    key === "ALL" ? orders.length : orders.filter((o) => o.status === key).length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Operaciones"
        title="Pedidos"
        description="Pedidos web pendientes de confirmación y ventas presenciales registradas en caja."
        actions={
          <button
            type="button"
            onClick={() => configured && void load()}
            className={ADMIN_ACTION_GHOST}
          >
            <RefreshCw size={14} strokeWidth={1.5} /> Actualizar
          </button>
        }
      />

      {error && (
        <p className={ADMIN_ERROR} role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--admin-line)] pb-2">
        <div className="flex flex-wrap items-center gap-7">
          {FILTERS.map((filter) => {
            const active = statusFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.key);
                  setPage(1);
                  setExpanded(null);
                }}
                aria-pressed={active}
                className={`relative pb-2 text-[10px] font-medium uppercase leading-none tracking-[0.16em] transition-colors duration-200 motion-reduce:transition-none ${
                  active
                    ? "text-[var(--admin-ink)] after:absolute after:inset-x-0 after:-bottom-[9px] after:h-px after:bg-[var(--admin-ink)]"
                    : "text-[var(--admin-muted)] hover:text-[var(--admin-ink)]"
                }`}
              >
                {filter.label}
                <span aria-hidden="true" className="mx-1.5 text-[var(--admin-line-strong)]">
                  ·
                </span>
                <span className="text-[9px] tabular-nums text-[var(--admin-faint)]">
                  {countFor(filter.key)}
                </span>
              </button>
            );
          })}
        </div>
        <p className={ADMIN_EYEBROW}>Ordenados por fecha</p>
      </div>

      {!configured ? (
        <div className="border-y border-[var(--admin-line)] py-16">
          <p className={ADMIN_EMPTY_TITLE}>Pedidos no disponibles</p>
          <p className={`${ADMIN_EMPTY_TEXT} mt-2`}>
            No pudimos cargar los pedidos. Volvé a intentar en unos minutos.
          </p>
        </div>
      ) : loading ? (
        <div className={ADMIN_LOADING}>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Cargando pedidos
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-y border-[var(--admin-line)] py-16">
          <ClipboardList size={20} strokeWidth={1.5} className="mx-auto mb-4 text-[var(--admin-faint)]" />
          <p className={ADMIN_EMPTY_TITLE}>
            {orders.length === 0 ? "Todavía no hay pedidos" : "Sin pedidos en este estado"}
          </p>
          <p className={`${ADMIN_EMPTY_TEXT} mt-2`}>
            {orders.length === 0
              ? "Las ventas de la tienda y de la caja van a aparecer acá."
              : "Probá con otro filtro para ver el resto del historial."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div role="table" aria-label="Pedidos" className="w-full min-w-[900px]">
            <div role="rowgroup">
              <div role="row" className={`${ADMIN_GRID_HEAD} ${ORDER_GRID}`}>
                <div role="columnheader" className={ADMIN_CELL_HEAD}>
                  Fecha
                </div>
                <div role="columnheader" className={ADMIN_CELL_HEAD}>
                  Origen
                </div>
                <div role="columnheader" className={ADMIN_CELL_HEAD}>
                  Cliente
                </div>
                <div role="columnheader" className={ADMIN_CELL_HEAD}>
                  Entrega
                </div>
                <div role="columnheader" className={`${ADMIN_CELL_HEAD} text-right`}>
                  Total
                </div>
                <div role="columnheader" className={ADMIN_CELL_HEAD}>
                  Estado
                </div>
                <div role="columnheader" className={`${ADMIN_CELL_HEAD} text-right`}>
                  Acciones
                </div>
              </div>
            </div>
            <div role="rowgroup">
              {pageOrders.map((order) => {
                const open = expanded === order.id;
                const busy = busyId === order.id;
                return (
                  <Fragment key={order.id}>
                    <div role="row" className={`${ADMIN_GRID_ROW} ${ORDER_GRID}`}>
                      <div
                        role="cell"
                        className="whitespace-nowrap py-4 text-[12px] tabular-nums text-[var(--admin-muted)]"
                      >
                        {formatDate(order.created_at)}
                      </div>
                      <div role="cell" className="py-4">
                        <span className="text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-[var(--admin-muted)]">
                          {order.source}
                        </span>
                      </div>
                      <div role="cell" className="min-w-0 py-4">
                        <span className="block truncate text-[13px] leading-5 text-[var(--admin-ink)]">
                          {order.customer_name ?? "—"}
                        </span>
                        {order.customer_phone && (
                          <span className="block truncate text-[11px] leading-4 text-[var(--admin-faint)]">
                            {order.customer_phone}
                          </span>
                        )}
                      </div>
                      <div role="cell" className="min-w-0 py-4 text-[12px] leading-5 text-[var(--admin-muted)]">
                        {order.source === "POS" ? (
                          <span>Venta presencial</span>
                        ) : order.fulfillment_type === "DELIVERY" ? (
                          <span className="block">
                            <span className="text-[var(--admin-ink)]">Delivery</span>
                            <span className="block truncate text-[11px]">{order.delivery_address ?? "—"}</span>
                          </span>
                        ) : (
                          <span>
                            <span className="text-[var(--admin-ink)]">Retiro</span>{" "}
                            {order.pickup_time?.slice(0, 5) ?? "—"}
                          </span>
                        )}
                      </div>
                      <div role="cell" className="py-4 text-right text-[13px] tabular-nums text-[var(--admin-ink)]">
                        {formatARS(order.total)}
                      </div>
                      <div role="cell" className="py-4">
                        <span
                          className={`inline-flex items-center gap-2 text-[10px] font-medium uppercase leading-none tracking-[0.12em] ${
                            STATUS_TEXT[order.status] ?? "text-[var(--admin-muted)]"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              STATUS_DOT[order.status] ?? "bg-[var(--admin-faint)]"
                            }`}
                          />
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </div>
                      <div role="cell" className="flex items-center justify-end gap-1.5 py-4">
                        <button
                          type="button"
                          onClick={() => setExpanded(open ? null : order.id)}
                          aria-expanded={open}
                          className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-medium uppercase leading-none tracking-[0.1em] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)]"
                        >
                          {order.items.length} {order.items.length === 1 ? "ítem" : "ítems"}
                          <ChevronDown
                            size={12}
                            strokeWidth={1.5}
                            className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => printOrderTicket(order, productsByName)}
                          className={MINI_ICON}
                          aria-label="Imprimir ticket"
                          title="Imprimir ticket"
                        >
                          <Printer size={14} strokeWidth={1.5} />
                        </button>
                        {order.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void processOrder(order.id, "confirm_order")}
                              className={MINI_PRIMARY}
                            >
                              <Check size={12} strokeWidth={1.5} /> Confirmar
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void processOrder(order.id, "cancel_order")}
                              className={`${MINI_GHOST} px-2 hover:border-[var(--admin-danger)] hover:text-[var(--admin-danger)]`}
                              aria-label={`Cancelar pedido de ${order.customer_name ?? "cliente"}`}
                              title="Cancelar pedido"
                            >
                              <X size={13} strokeWidth={1.5} />
                            </button>
                          </>
                        )}
                        {busy && (
                          <Loader2
                            size={13}
                            strokeWidth={1.5}
                            className="animate-spin text-[var(--admin-faint)]"
                          />
                        )}
                      </div>
                    </div>

                    {open && (
                      <div
                        role="row"
                        className="border-b border-[var(--admin-line)] bg-[var(--admin-surface)]"
                      >
                        <div role="cell" className="py-5">
                          {(order.notes || order.delivery_address || order.payment_method) && (
                            <div className="mb-4 space-y-1 border-b border-[var(--admin-line)] pb-4 text-[12px] leading-5 text-[var(--admin-muted)]">
                              {order.delivery_address && (
                                <p>
                                  <span className="text-[var(--admin-ink)]">Dirección</span>{" "}
                                  {order.delivery_address}
                                </p>
                              )}
                              {order.payment_method && (
                                <p>
                                  <span className="text-[var(--admin-ink)]">Pago</span>{" "}
                                  {order.payment_method}
                                </p>
                              )}
                              {order.notes && (
                                <p>
                                  <span className="text-[var(--admin-ink)]">Notas</span> {order.notes}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="divide-y divide-[var(--admin-line)]">
                            {order.items.map((item, index) => {
                              const unit =
                                item.quantity > 0 ? item.line_total / item.quantity : item.line_total;
                              return (
                                <div
                                  key={`${order.id}-${index}`}
                                  className={`grid items-center gap-x-4 py-3 ${ORDER_GRID}`}
                                >
                                  <div className="col-span-4 flex min-w-0 items-center gap-3">
                                    <div className="relative h-11 w-11 shrink-0 overflow-hidden bg-[var(--admin-canvas)]">
                                      {item.image_url ? (
                                        <Image
                                          src={item.image_url}
                                          alt={item.product_name}
                                          fill
                                          sizes="44px"
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-[var(--admin-faint)]">
                                          <Package size={16} strokeWidth={1.5} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="block truncate text-[13px] leading-5 text-[var(--admin-ink)]">
                                        {item.product_name}
                                      </span>
                                      {(item.variant?.size || item.variant?.color || item.note) && (
                                        <span className="block truncate text-[11px] leading-4 text-[var(--admin-muted)]">
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
                                  <div className="col-start-5 flex flex-col items-end text-right">
                                    <span className="text-[13px] tabular-nums text-[var(--admin-ink)]">
                                      {formatARS(item.line_total)}
                                    </span>
                                    <span className="text-[10px] tabular-nums text-[var(--admin-muted)]">
                                      {item.quantity} un. × {formatARS(unit)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={ADMIN_EYEBROW}>
            Página {current} de {totalPages} · {filtered.length} pedidos
          </p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
              className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={13} strokeWidth={1.5} /> Anterior
            </button>
            <button
              type="button"
              disabled={current >= totalPages}
              onClick={() => setPage(current + 1)}
              className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-ink)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              Siguiente <ChevronRight size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
