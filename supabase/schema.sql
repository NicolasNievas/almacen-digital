-- ============ TABLAS ============
create table categories (
  id text primary key,
  name text not null,
  sort_order int default 0
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id text references categories(id),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  pricing_type text not null default 'SIMPLE' check (pricing_type in ('SIMPLE','TIERED','BUNDLE')),
  pricing_tiers jsonb not null default '[]',
  bundle_size int,
  bundle_price numeric(12,2),
  stock int not null default 0 check (stock >= 0),
  active boolean not null default true,
  image_url text,
  created_at timestamptz default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('WEB','POS')),
  customer_name text,
  pickup_time text,
  payment_method text,
  total numeric(12,2) not null,
  status text not null default 'COMPLETED',
  created_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  line_total numeric(12,2) not null
);

create table stock_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  delta int not null,
  reason text not null check (reason in ('SALE_WEB','SALE_POS','MANUAL_ADJUST')),
  order_id uuid references orders(id),
  created_at timestamptz default now()
);

create index on order_items(order_id);
create index on stock_logs(product_id, created_at desc);

-- Opcional: etiquetas para el buscador y los badges de la tienda.
-- En bases ya creadas, ejecutá solo esta línea.
alter table products add column if not exists tags text[] not null default '{}';

-- ============ SUBTOTAL (espeja lib/pricing.ts) ============
create function calc_line_total(p products, qty int) returns numeric
language plpgsql stable as $$
declare unit numeric;
begin
  if p.pricing_type = 'TIERED' then
    select (t->>'unit_price')::numeric into unit
    from jsonb_array_elements(p.pricing_tiers) t
    where (t->>'min_quantity')::int <= qty
    order by (t->>'min_quantity')::int desc limit 1;
    return qty * coalesce(unit, p.unit_price);
  elsif p.pricing_type = 'BUNDLE' then
    return (qty / p.bundle_size) * p.bundle_price + (qty % p.bundle_size) * p.unit_price;
  end if;
  return qty * p.unit_price;
end $$;

-- ============ RLS ============
create function is_admin() returns boolean language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

alter table categories  enable row level security;
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table stock_logs  enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "public read active products" on products for select using (active = true or is_admin());
create policy "admin write categories" on categories for all using (is_admin()) with check (is_admin());
create policy "admin write products" on products for all using (is_admin()) with check (is_admin());
create policy "admin read orders" on orders for select using (is_admin());
create policy "admin read items" on order_items for select using (is_admin());
create policy "admin read logs" on stock_logs for select using (is_admin());
-- Sin policies de INSERT/UPDATE para anon: pedidos y stock se escriben solo vía RPC.

-- ============ DESCUENTO ATÓMICO DE STOCK ============
-- p_items: [{"product_id":"...","quantity":2}]
create function create_sale(p_source text, p_items jsonb, p_customer text default null,
                            p_pickup text default null, p_payment text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_total numeric := 0; it jsonb; prod products; v_qty int; v_line numeric;
begin
  -- GUARD ESTRICTO E INCONDICIONAL (ver migración 005): solo rol admin.
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  if p_source <> 'POS' then raise exception 'Fuente invalida'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Venta vacia'; end if;

  insert into orders(source, customer_name, pickup_time, payment_method, total, status)
  values (p_source, p_customer, p_pickup, p_payment, 0, 'COMPLETED')
  returning id into v_order;

  -- Orden por product_id evita deadlocks entre ventas concurrentes
  for it in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_qty := (it->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'Cantidad invalida'; end if;
    select * into prod from products where id = (it->>'product_id')::uuid and active for update; -- lock de fila
    if not found then raise exception 'Producto no disponible'; end if;
    if prod.stock < v_qty then raise exception 'Stock insuficiente para %', prod.name; end if;

    v_line := calc_line_total(prod, v_qty);
    update products set stock = stock - v_qty where id = prod.id;
    insert into order_items(order_id, product_id, quantity, line_total) values (v_order, prod.id, v_qty, v_line);
    insert into stock_logs(product_id, delta, reason, order_id)
      values (prod.id, -v_qty, 'SALE_POS', v_order);
    v_total := v_total + v_line;
  end loop;

  update orders set total = v_total where id = v_order;
  return v_order;
end $$;

grant execute on function create_sale to authenticated;
revoke execute on function create_sale from anon, public;

-- Ajuste manual (solo admin)
create function adjust_stock(p_product uuid, p_new_stock int) returns void
language plpgsql security definer set search_path = public as $$
declare old int;
begin
  if not is_admin() then raise exception 'No autorizado'; end if;
  select stock into old from products where id = p_product for update;
  update products set stock = p_new_stock where id = p_product;
  insert into stock_logs(product_id, delta, reason) values (p_product, p_new_stock - old, 'MANUAL_ADJUST');
end $$;

-- ============ PEDIDO WEB PENDIENTE (sin descontar stock) ============
-- El carrito web registra el pedido como 'PENDING'. El stock NO se toca
-- hasta que el admin lo confirme con confirm_order().
create or replace function create_web_order(p_items jsonb, p_customer text default null,
                                            p_pickup text default null, p_payment text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_total numeric := 0; it jsonb; prod products; v_qty int; v_line numeric;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene items';
  end if;

  insert into orders(source, customer_name, pickup_time, payment_method, total, status)
  values ('WEB', p_customer, p_pickup, p_payment, 0, 'PENDING') returning id into v_order;

  for it in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_qty := (it->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'Cantidad inválida'; end if;

    select * into prod from products where id = (it->>'product_id')::uuid and active;
    if not found then raise exception 'Producto no disponible'; end if;

    v_line := calc_line_total(prod, v_qty);
    insert into order_items(order_id, product_id, quantity, line_total) values (v_order, prod.id, v_qty, v_line);
    v_total := v_total + v_line;
  end loop;

  update orders set total = v_total where id = v_order;
  return v_order;
end $$;

-- Confirma un pedido pendiente: descuenta stock y registra en stock_logs (solo admin).
create or replace function confirm_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ord orders; it record; prod products;
begin
  if not is_admin() then raise exception 'No autorizado'; end if;

  select * into ord from orders where id = p_order for update;
  if not found then raise exception 'Pedido inexistente'; end if;
  if ord.status <> 'PENDING' then raise exception 'El pedido no está pendiente'; end if;

  -- Orden por product_id evita deadlocks entre confirmaciones concurrentes
  for it in select product_id, quantity from order_items where order_id = p_order order by product_id loop
    select * into prod from products where id = it.product_id for update;
    if not found then raise exception 'Producto inexistente'; end if;
    if prod.stock < it.quantity then raise exception 'Stock insuficiente para %', prod.name; end if;

    update products set stock = stock - it.quantity where id = it.product_id;
    insert into stock_logs(product_id, delta, reason, order_id)
      values (it.product_id, -it.quantity, 'SALE_WEB', p_order);
  end loop;

  update orders set status = 'COMPLETED' where id = p_order;
end $$;

-- Cancela un pedido pendiente sin tocar stock (solo admin).
create or replace function cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'No autorizado'; end if;
  update orders set status = 'CANCELLED' where id = p_order and status = 'PENDING';
  if not found then raise exception 'El pedido no está pendiente'; end if;
end $$;

-- ============ MÉTRICAS (solo admin, con security_invoker las vistas respetan RLS) ============
create view sales_metrics with (security_invoker = true) as
select count(*) as orders_count, coalesce(avg(total),0) as avg_ticket, coalesce(sum(total),0) as revenue
from orders where status = 'COMPLETED';

create view top_products with (security_invoker = true) as
select p.name, sum(oi.quantity) as units_sold
from order_items oi join products p on p.id = oi.product_id
group by p.name order by units_sold desc limit 10;

-- ============ GRANTS (Supabase) ============
-- Lectura pública del catálogo.
grant usage on schema public to anon, authenticated;
grant select on categories, products to anon;
-- Escritura del panel admin (RLS exige is_admin()).
grant select, insert, update, delete on categories, products to authenticated;
grant select on orders, order_items, stock_logs to authenticated;
grant select on sales_metrics, top_products to authenticated;
-- RPCs.
grant execute on function adjust_stock to authenticated;
grant execute on function create_web_order to anon, authenticated;
grant execute on function confirm_order to authenticated;
grant execute on function cancel_order to authenticated;
