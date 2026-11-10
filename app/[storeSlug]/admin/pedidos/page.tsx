"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  StickyNote,
  UserRound,
  X,
  type LucideIcon,
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
 * Aura (tema editorial) reparte con `fr` proporcionales: Entrega queda cerca
 * del centro y Total, Estado y Acciones respiran en tracks propios. Acciones
 * conserva un mínimo porque aloja cuatro controles. El fallback mantiene el
 * reparto utilitario del resto de los tenants.
 */
const ORDER_TABLE =
  "w-full min-w-[900px] [--admin-table-cols:var(--admin-cols-orders,104px_62px_minmax(0,1fr)_minmax(0,1fr)_108px_108px_236px)] [--admin-grid-gap:0.75rem]";

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

/**
 * Bloque de logística del pedido expandido (cliente, entrega, pago, notas).
 * Vive en la columna izquierda del sub-panel y no compite con la tabla: cada
 * dato lleva su etiqueta arriba y un icono fino de Lucide a la izquierda.
 */
function OrderPanelMeta({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        size={14}
        strokeWidth={1.5}
        aria-hidden
        className="mt-[3px] shrink-0 text-[var(--admin-faint)]"
      />
      <div className="min-w-0 space-y-1">
        <p className={ADMIN_EYEBROW}>{label}</p>
        <div className="text-[13px] leading-5 text-[var(--admin-ink)]">{children}</div>
      </div>
    </div>
  );
}

function buildTicketItem(item: OrderItemRow, product?: Product): TicketItem {  const listUnitPrice =
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
          <div role="table" aria-label="Pedidos" className={ORDER_TABLE}>
            <div role="rowgroup">
              <div role="row" className={ADMIN_GRID_HEAD}>
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
                <div role="columnheader" className={`${ADMIN_CELL_HEAD} text-center`}>
                  Total
                </div>
                <div role="columnheader" className={`${ADMIN_CELL_HEAD} text-center`}>
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
                    <div role="row" className={ADMIN_GRID_ROW}>
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
                      <div role="cell" className="py-4 text-center text-[13px] tabular-nums text-[var(--admin-ink)]">
                        {formatARS(order.total)}
                      </div>
                      <div role="cell" className="flex justify-center py-4">
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
                      <div role="row" className="border-b border-[var(--admin-line)]">
                        <div
                          role="cell"
                          className="border-l-2 border-l-[var(--store-primary,var(--admin-accent))] py-6"
                        >
                          <div className="grid gap-8 px-8 lg:grid-cols-12">
                            <div className="flex flex-col gap-5 lg:col-span-4">
                              <OrderPanelMeta icon={UserRound} label="Cliente">
                                {order.customer_name ? (
                                  <>
                                    <span className="block truncate">{order.customer_name}</span>
                                    {order.customer_phone && (
                                      <span className="block text-[12px] tabular-nums text-[var(--admin-muted)]">
                                        {order.customer_phone}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[var(--admin-muted)]">Consumidor final</span>
                                )}
                              </OrderPanelMeta>

                              <OrderPanelMeta icon={MapPin} label="Entrega">
                                {order.source === "POS" ? (
                                  "Venta presencial"
                                ) : order.fulfillment_type === "DELIVERY" ? (
                                  <>
                                    <span className="block">Delivery</span>
                                    <span className="block text-[12px] leading-5 text-[var(--admin-muted)]">
                                      {order.delivery_address ?? "Dirección a coordinar"}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="block">Retiro en local</span>
                                    <span className="block text-[12px] tabular-nums text-[var(--admin-muted)]">
                                      {order.pickup_time?.slice(0, 5) ?? "Horario a coordinar"}
                                    </span>
                                  </>
                                )}
                              </OrderPanelMeta>

                              {order.payment_method && (
                                <OrderPanelMeta icon={CreditCard} label="Pago">
                                  {order.payment_method}
                                </OrderPanelMeta>
                              )}

                              {order.notes && (
                                <OrderPanelMeta icon={StickyNote} label="Notas">
                                  <span className="block text-[12px] leading-5 text-[var(--admin-muted)]">
                                    {order.notes}
                                  </span>
                                </OrderPanelMeta>
                              )}
                            </div>

                            <div className="lg:col-span-8">
                              <p className={`${ADMIN_EYEBROW} mb-1`}>
                                {order.items.length} {order.items.length === 1 ? "ítem" : "ítems"}
                              </p>
                              <ul className="divide-y divide-[var(--admin-line)]">
                                {order.items.map((item, index) => {
                                  const unit =
                                    item.quantity > 0 ? item.line_total / item.quantity : item.line_total;
                                  const detail = [
                                    item.variant?.size ? `Talle ${item.variant.size}` : null,
                                    item.variant?.color,
                                    item.note ? `Nota: ${item.note}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ");

                                  return (
                                    <li
                                      key={`${order.id}-${index}`}
                                      className="flex items-center gap-4 py-3.5"
                                    >
                                      <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-[var(--admin-canvas)]">
                                        {item.image_url ? (
                                          <Image
                                            src={item.image_url}
                                            alt={item.product_name}
                                            fill
                                            sizes="48px"
                                            className="object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center text-[var(--admin-faint)]">
                                            <Package size={16} strokeWidth={1.5} />
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] leading-5 text-[var(--admin-ink)]">
                                          {item.product_name}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                          {detail && (
                                            <span className="truncate text-[11px] leading-4 text-[var(--admin-muted)]">
                                              {detail}
                                            </span>
                                          )}
                                          <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[var(--admin-surface)] px-2 py-0.5 text-[10px] tabular-nums leading-4 text-[var(--admin-muted)]">
                                            {item.quantity} un. × {formatARS(unit)} c/u
                                          </span>
                                        </div>
                                      </div>
                                      <span className="shrink-0 whitespace-nowrap text-[13px] tabular-nums text-[var(--admin-ink)]">
                                        {formatARS(item.line_total)}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                              <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-[var(--admin-line)] pt-3">
                                <span className={ADMIN_EYEBROW}>Total del pedido</span>
                                <span className="whitespace-nowrap text-[15px] tabular-nums text-[var(--admin-ink)]">
                                  {formatARS(order.total)}
                                </span>
                              </div>
                            </div>
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
