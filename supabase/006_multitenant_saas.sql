-- ============================================================
-- 006 · ARQUITECTURA SAAS MULTITENANT
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de:
--   schema.sql, 002, 003, 004 y 005.
--
-- Qué hace este script:
--   1. Crea la tabla `stores` (tenant principal) con `settings` JSONB.
--   2. Agrega `store_id` a categories/products/orders/order_items/stock_logs.
--   3. Convierte categories en PK compuesta (store_id, id) y actualiza su FK.
--   4. Agrega soporte de variantes/galería (sizes, colors, images) y de
--      entrega (fulfillment_type, delivery_address, notes, etc.).
--   5. Reescribe las RPCs para que SIEMPRE operen dentro de una tienda.
--   6. Activa RLS por tenant y siembra 3 demos:
--      AG Mayorista · Rotisería Express · Aura Studio.
--
-- El script es idempotente: se puede volver a ejecutar sin duplicar datos.
-- ============================================================

begin;

-- ============================================================
-- 1. TABLA PRINCIPAL DE COMERCIOS (STORES)
-- ============================================================
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  subtitle text not null default '',
  slogan text not null default '',
  whatsapp text not null default '',
  alias text not null default '',
  cbu text not null default '',
  titular text not null default '',
  settings jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Normaliza el JSONB y garantiza que existan todas las claves.
create or replace function normalize_store_settings(p jsonb)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'business_type',
      case
        when coalesce(p ->> 'business_type', '') in ('MAYORISTA', 'GASTRONOMY', 'CLOTHING')
          then p ->> 'business_type'
        else 'MAYORISTA'
      end,
    'checkout_type',
      case
        when coalesce(p ->> 'checkout_type', '') in ('WHATSAPP', 'MERCADO_PAGO')
          then p ->> 'checkout_type'
        else 'WHATSAPP'
      end,
    'fulfillment', jsonb_build_object(
      'shipping_enabled',
        case when p -> 'fulfillment' ->> 'shipping_enabled' = 'true' then true else false end,
      'pickup_enabled',
        case when p -> 'fulfillment' ->> 'pickup_enabled' = 'false' then false else true end
    ),
    'features', jsonb_build_object(
      'variants_enabled',
        case when p -> 'features' ->> 'variants_enabled' = 'true' then true else false end,
      'gallery_enabled',
        case when p -> 'features' ->> 'gallery_enabled' = 'true' then true else false end,
      'pos_enabled',
        case when p -> 'features' ->> 'pos_enabled' = 'false' then false else true end,
      'stock_alerts',
        case when p -> 'features' ->> 'stock_alerts' = 'false' then false else true end,
      'custom_notes',
        case when p -> 'features' ->> 'custom_notes' = 'true' then true else false end
    )
  );
$$;

create or replace function stores_before_write()
returns trigger language plpgsql as $$
begin
  new.slug := lower(trim(new.slug));
  new.settings := normalize_store_settings(coalesce(new.settings, '{}'::jsonb));
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_stores_before_write on stores;
create trigger trg_stores_before_write
  before insert or update on stores
  for each row execute function stores_before_write();

alter table stores drop constraint if exists stores_settings_shape_check;
alter table stores add constraint stores_settings_shape_check check (
  settings ->> 'business_type' in ('MAYORISTA', 'GASTRONOMY', 'CLOTHING')
  and settings ->> 'checkout_type' in ('WHATSAPP', 'MERCADO_PAGO')
  and jsonb_typeof(settings -> 'fulfillment') = 'object'
  and jsonb_typeof(settings -> 'features') = 'object'
);

-- ============================================================
-- 2. SEED DE LAS 3 TIENDAS DEMO
-- ============================================================
insert into stores (id, slug, name, subtitle, slogan, whatsapp, alias, cbu, titular, settings, active)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'ag-mayorista',
    'AG Mayorista',
    'Ventas por mayor y menor',
    'Donde cuidar tu bolsillo también es invertir en tu futuro.',
    '5491123456789',
    'almacen.barrio.mp',
    '0000000000000000000000',
    'AG Mayorista S.A.',
    '{
      "business_type": "MAYORISTA",
      "checkout_type": "WHATSAPP",
      "fulfillment": { "shipping_enabled": false, "pickup_enabled": true },
      "features": {
        "variants_enabled": false, "gallery_enabled": false,
        "pos_enabled": true, "stock_alerts": true, "custom_notes": false
      }
    }'::jsonb,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'rotiseria-express',
    'Rotisería Express',
    'Comida casera lista para disfrutar',
    'El sabor de casa, a un mensaje de distancia.',
    '5493515550001',
    'rotiseria.express',
    '0000000000000000000001',
    'Rotisería Express',
    '{
      "business_type": "GASTRONOMY",
      "checkout_type": "WHATSAPP",
      "fulfillment": { "shipping_enabled": true, "pickup_enabled": true },
      "features": {
        "variants_enabled": false, "gallery_enabled": false,
        "pos_enabled": true, "stock_alerts": true, "custom_notes": true
      }
    }'::jsonb,
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'aura-studio',
    'Aura Studio',
    'Moda contemporánea · Ediciones limitadas',
    'Prendas que acompañan tu forma de habitar el mundo.',
    '5491145550002',
    'aura.studio',
    '0000000000000000000002',
    'Aura Studio SAS',
    '{
      "business_type": "CLOTHING",
      "checkout_type": "MERCADO_PAGO",
      "fulfillment": { "shipping_enabled": true, "pickup_enabled": true },
      "features": {
        "variants_enabled": true, "gallery_enabled": true,
        "pos_enabled": true, "stock_alerts": true, "custom_notes": false
      }
    }'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  subtitle = excluded.subtitle,
  slogan = excluded.slogan,
  whatsapp = excluded.whatsapp,
  alias = excluded.alias,
  cbu = excluded.cbu,
  titular = excluded.titular,
  settings = excluded.settings,
  active = excluded.active;

-- ============================================================
-- 3. STORE_ID EN TODAS LAS TABLAS DE NEGOCIO
-- ============================================================
alter table categories  add column if not exists store_id uuid references stores(id) on delete cascade;
alter table products    add column if not exists store_id uuid references stores(id) on delete cascade;
alter table orders      add column if not exists store_id uuid references stores(id) on delete cascade;
alter table order_items add column if not exists store_id uuid references stores(id) on delete cascade;
alter table stock_logs  add column if not exists store_id uuid references stores(id) on delete cascade;

-- Backfill: todo lo existente pertenece a AG Mayorista.
update categories set store_id = (select id from stores where slug = 'ag-mayorista')
  where store_id is null;
update products set store_id = (select id from stores where slug = 'ag-mayorista')
  where store_id is null;
update orders set store_id = (select id from stores where slug = 'ag-mayorista')
  where store_id is null;
update order_items oi set store_id = o.store_id
  from orders o where o.id = oi.order_id and oi.store_id is null;
update stock_logs sl set store_id = p.store_id
  from products p where p.id = sl.product_id and sl.store_id is null;

alter table categories  alter column store_id set not null;
alter table products    alter column store_id set not null;
alter table orders      alter column store_id set not null;
alter table order_items alter column store_id set not null;
alter table stock_logs  alter column store_id set not null;

-- ============================================================
-- 4. CATEGORÍAS POR TIENDA (PK COMPUESTA)
-- ============================================================
-- Las categorías dejan de ser globales: el mismo id puede existir en dos tiendas.
alter table products drop constraint if exists products_category_id_fkey;
alter table products drop constraint if exists products_store_category_fkey;
alter table categories drop constraint if exists categories_pkey;
alter table categories add constraint categories_pkey primary key (store_id, id);
alter table products add constraint products_store_category_fkey
  foreign key (store_id, category_id) references categories(store_id, id) on update cascade;

create index if not exists categories_store_idx on categories(store_id);
create index if not exists products_store_idx on products(store_id);
create index if not exists products_store_active_idx on products(store_id, active);
create index if not exists orders_store_created_idx on orders(store_id, created_at desc);
create index if not exists order_items_store_idx on order_items(store_id);
create index if not exists stock_logs_store_created_idx on stock_logs(store_id, created_at desc);

-- ============================================================
-- 5. VARIANTES, GALERÍA Y DATOS DE ENTREGA
-- ============================================================
alter table products add column if not exists description text;
alter table products add column if not exists images text[] not null default '{}';
alter table products add column if not exists sizes text[] not null default '{}';
alter table products add column if not exists colors text[] not null default '{}';

-- Compatibilidad: la imagen principal también vive en `images`.
update products
  set images = array[image_url]
  where image_url is not null and cardinality(images) = 0;

alter table orders add column if not exists customer_phone text;
alter table orders add column if not exists fulfillment_type text;
alter table orders add column if not exists delivery_address text;
alter table orders add column if not exists notes text;

update orders set fulfillment_type = 'PICKUP' where fulfillment_type is null;
alter table orders alter column fulfillment_type set default 'PICKUP';
alter table orders alter column fulfillment_type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'orders'::regclass
      and conname = 'orders_fulfillment_type_check'
  ) then
    alter table orders add constraint orders_fulfillment_type_check
      check (fulfillment_type in ('PICKUP', 'DELIVERY'));
  end if;
end $$;

alter table order_items add column if not exists variant jsonb not null default '{}'::jsonb;
alter table order_items add column if not exists note text;

-- ============================================================
-- 6. RLS POR TENANT
-- ============================================================
alter table stores enable row level security;

drop policy if exists "public read active stores" on stores;
drop policy if exists "admin write stores" on stores;
create policy "public read active stores" on stores
  for select using (active = true or is_admin());
create policy "admin write stores" on stores
  for all using (is_admin()) with check (is_admin());

-- Catálogo público: solo tiendas activas (o admin).
drop policy if exists "public read categories" on categories;
drop policy if exists "public read active products" on products;
create policy "public read categories" on categories for select using (
  is_admin() or exists (
    select 1 from stores s where s.id = categories.store_id and s.active
  )
);
create policy "public read active products" on products for select using (
  is_admin() or (
    active = true and exists (
      select 1 from stores s where s.id = products.store_id and s.active
    )
  )
);

-- Escritura del panel: solo admin global.
drop policy if exists "admin write categories" on categories;
drop policy if exists "admin write products" on products;
create policy "admin write categories" on categories
  for all using (is_admin()) with check (is_admin());
create policy "admin write products" on products
  for all using (is_admin()) with check (is_admin());

-- Pedidos y stock: solo admin (se escriben vía RPC security definer).
drop policy if exists "admin read orders" on orders;
drop policy if exists "admin read items" on order_items;
drop policy if exists "admin read logs" on stock_logs;
drop policy if exists "admin write orders" on orders;
drop policy if exists "admin write items" on order_items;
drop policy if exists "admin write logs" on stock_logs;
create policy "admin read orders" on orders for select using (is_admin());
create policy "admin read items" on order_items for select using (is_admin());
create policy "admin read logs" on stock_logs for select using (is_admin());
create policy "admin write orders" on orders for all using (is_admin()) with check (is_admin());
create policy "admin write items" on order_items for all using (is_admin()) with check (is_admin());
create policy "admin write logs" on stock_logs for all using (is_admin()) with check (is_admin());

-- ============================================================
-- 7. RPCs TENANT-AWARE
-- ============================================================
-- Las firmas viejas se eliminan para evitar sobrecargas ambiguas.
drop function if exists create_sale(text, jsonb, text, text, text);
drop function if exists create_web_order(jsonb, text, text, text);

-- Venta presencial (POS). Solo admin y siempre dentro de una tienda.
create function create_sale(
  p_store uuid,
  p_source text,
  p_items jsonb,
  p_customer text default null,
  p_pickup text default null,
  p_payment text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order uuid;
  v_total numeric := 0;
  it jsonb;
  prod products;
  v_qty int;
  v_line numeric;
begin
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  if p_source <> 'POS' then raise exception 'Fuente invalida'; end if;
  if p_store is null then raise exception 'Tienda requerida'; end if;
  if not exists (select 1 from stores where id = p_store and active) then
    raise exception 'Tienda no disponible';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Venta vacia'; end if;

  insert into orders (store_id, source, customer_name, pickup_time, payment_method, total, status)
  values (p_store, p_source, p_customer, p_pickup, p_payment, 0, 'COMPLETED')
  returning id into v_order;

  for it in select value from jsonb_array_elements(p_items) order by value ->> 'product_id' loop
    v_qty := (it ->> 'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'Cantidad invalida'; end if;

    select * into prod from products
      where id = (it ->> 'product_id')::uuid and store_id = p_store and active
      for update;
    if not found then raise exception 'Producto no disponible'; end if;
    if prod.stock < v_qty then raise exception 'Stock insuficiente para %', prod.name; end if;

    v_line := calc_line_total(prod, v_qty);
    update products set stock = stock - v_qty where id = prod.id;
    insert into order_items (store_id, order_id, product_id, quantity, line_total, variant, note)
    values (p_store, v_order, prod.id, v_qty, v_line, coalesce(it -> 'variant', '{}'::jsonb), nullif(it ->> 'note', ''));
    insert into stock_logs (store_id, product_id, delta, reason, order_id)
    values (p_store, prod.id, -v_qty, 'SALE_POS', v_order);
    v_total := v_total + v_line;
  end loop;

  update orders set total = v_total where id = v_order;
  return v_order;
end $$;

grant execute on function create_sale(uuid, text, jsonb, text, text, text) to authenticated;
revoke execute on function create_sale(uuid, text, jsonb, text, text, text) from anon, public;

-- Pedido web (PENDING, sin descontar stock).
create function create_web_order(
  p_store uuid,
  p_items jsonb,
  p_customer text default null,
  p_pickup text default null,
  p_payment text default null,
  p_phone text default null,
  p_fulfillment text default 'PICKUP',
  p_address text default null,
  p_notes text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order uuid;
  v_total numeric := 0;
  it jsonb;
  prod products;
  v_qty int;
  v_line numeric;
begin
  if p_store is null then raise exception 'Tienda requerida'; end if;
  if not exists (select 1 from stores where id = p_store and active) then
    raise exception 'Tienda no disponible';
  end if;
  if p_fulfillment not in ('PICKUP', 'DELIVERY') then
    raise exception 'Tipo de entrega invalido';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene items';
  end if;

  insert into orders (
    store_id, source, customer_name, customer_phone, pickup_time, payment_method,
    fulfillment_type, delivery_address, notes, total, status
  )
  values (
    p_store, 'WEB', p_customer, p_phone, p_pickup, p_payment,
    p_fulfillment, p_address, p_notes, 0, 'PENDING'
  )
  returning id into v_order;

  for it in select value from jsonb_array_elements(p_items) order by value ->> 'product_id' loop
    v_qty := (it ->> 'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'Cantidad inválida'; end if;

    select * into prod from products
      where id = (it ->> 'product_id')::uuid and store_id = p_store and active;
    if not found then raise exception 'Producto no disponible'; end if;

    v_line := calc_line_total(prod, v_qty);
    insert into order_items (store_id, order_id, product_id, quantity, line_total, variant, note)
    values (p_store, v_order, prod.id, v_qty, v_line, coalesce(it -> 'variant', '{}'::jsonb), nullif(it ->> 'note', ''));
    v_total := v_total + v_line;
  end loop;

  update orders set total = v_total where id = v_order;
  return v_order;
end $$;

grant execute on function create_web_order(uuid, jsonb, text, text, text, text, text, text, text) to anon, authenticated;

-- Confirma un pedido pendiente: descuenta stock y registra el log.
create or replace function confirm_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ord orders;
  it record;
  prod products;
begin
  if not is_admin() then raise exception 'No autorizado'; end if;

  select * into ord from orders where id = p_order for update;
  if not found then raise exception 'Pedido inexistente'; end if;
  if ord.status <> 'PENDING' then raise exception 'El pedido no está pendiente'; end if;

  for it in select product_id, quantity from order_items where order_id = p_order order by product_id loop
    select * into prod from products where id = it.product_id and store_id = ord.store_id for update;
    if not found then raise exception 'Producto inexistente'; end if;
    if prod.stock < it.quantity then raise exception 'Stock insuficiente para %', prod.name; end if;

    update products set stock = stock - it.quantity where id = it.product_id;
    insert into stock_logs (store_id, product_id, delta, reason, order_id)
    values (ord.store_id, it.product_id, -it.quantity, 'SALE_WEB', p_order);
  end loop;

  update orders set status = 'COMPLETED' where id = p_order;
end $$;

create or replace function cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'No autorizado'; end if;
  update orders set status = 'CANCELLED' where id = p_order and status = 'PENDING';
  if not found then raise exception 'El pedido no está pendiente'; end if;
end $$;

create or replace function adjust_stock(p_product uuid, p_new_stock int) returns void
language plpgsql security definer set search_path = public as $$
declare
  old int;
  v_store uuid;
begin
  if not is_admin() then raise exception 'No autorizado'; end if;
  select stock, store_id into old, v_store from products where id = p_product for update;
  if not found then raise exception 'Producto inexistente'; end if;
  update products set stock = p_new_stock where id = p_product;
  insert into stock_logs (store_id, product_id, delta, reason)
  values (v_store, p_product, p_new_stock - old, 'MANUAL_ADJUST');
end $$;

grant execute on function adjust_stock(uuid, int) to authenticated;
revoke execute on function adjust_stock(uuid, int) from anon, public;
grant execute on function confirm_order(uuid) to authenticated;
grant execute on function cancel_order(uuid) to authenticated;

-- ============================================================
-- 8. MÉTRICAS POR TIENDA
-- ============================================================
drop view if exists sales_metrics;
drop view if exists top_products;

create view sales_metrics with (security_invoker = true) as
select
  store_id,
  count(*) as orders_count,
  coalesce(avg(total), 0) as avg_ticket,
  coalesce(sum(total), 0) as revenue
from orders where status = 'COMPLETED'
group by store_id;

create view top_products with (security_invoker = true) as
select oi.store_id, p.name, sum(oi.quantity) as units_sold
from order_items oi
join products p on p.id = oi.product_id
group by oi.store_id, p.name
order by units_sold desc;

-- ============================================================
-- 9. GRANTS
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select on stores to anon, authenticated;
grant select, insert, update, delete on stores to authenticated;
grant select on categories, products to anon;
grant select, insert, update, delete on categories, products to authenticated;
grant select on orders, order_items, stock_logs to authenticated;
grant select on sales_metrics, top_products to authenticated;

-- ============================================================
-- 10. CATÁLOGO DEMO
-- ============================================================

-- AG Mayorista: categorías base (se conservan las existentes).
insert into categories (store_id, id, name, sort_order)
select s.id, v.id, v.name, v.sort_order
from (values
  ('almacen', 'Almacén', 1),
  ('bebidas', 'Bebidas', 2),
  ('fiambreria', 'Fiambrería', 3),
  ('promos', 'Promociones', 4)
) as v(id, name, sort_order)
cross join (select id from stores where slug = 'ag-mayorista') s
on conflict (store_id, id) do nothing;

-- AG Mayorista: productos demo solo si la tienda está vacía.
insert into products (
  id, store_id, name, description, category_id, unit_price, pricing_type,
  pricing_tiers, bundle_size, bundle_price, stock, active, tags, image_url, images
)
select v.id::uuid, s.id, v.name, v.description, v.category_id, v.unit_price, v.pricing_type,
  v.pricing_tiers::jsonb, v.bundle_size, v.bundle_price, v.stock, true,
  v.tags::text[], v.image_url, v.images::text[]
from (values
  (
    'a0000001-0000-4000-8000-000000000001', 'Yerba Mate 1kg', 'Yerba mate de hoja seleccionada. Ideal para el mate diario.',
    'almacen', 6500::numeric, 'BUNDLE', '[]', 2, 11500::numeric, 40,
    '{"COMBO"}', 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80']
  ),
  (
    'a0000001-0000-4000-8000-000000000002', 'Fideos Spaghetti 500g', 'Pasta seca de sémola de trigo candeal.',
    'almacen', 1800, 'TIERED', '[{"min_quantity":5,"unit_price":1500},{"min_quantity":10,"unit_price":1350}]', null, null, 120,
    '{"OFERTA"}', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=900&q=80']
  ),
  (
    'a0000001-0000-4000-8000-000000000003', 'Fernet Branca 750ml', 'Fernet clásico para mezclar con cola.',
    'bebidas', 18000, 'TIERED', '[{"min_quantity":6,"unit_price":16000}]', null, null, 36,
    '{"OFERTA"}', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80']
  ),
  (
    'a0000001-0000-4000-8000-000000000004', 'Jamón Cocido 100g', 'Fiambre en fetas, listo para tu picada.',
    'fiambreria', 1900, 'SIMPLE', '[]', null, null, 25,
    '{}', 'https://images.unsplash.com/photo-1524438418049-ab2acb7aa49a?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1524438418049-ab2acb7aa49a?auto=format&fit=crop&w=900&q=80']
  )
) as v(id, name, description, category_id, unit_price, pricing_type, pricing_tiers, bundle_size, bundle_price, stock, tags, image_url, images)
cross join (select id from stores where slug = 'ag-mayorista') s
where not exists (select 1 from products p where p.store_id = s.id)
on conflict (id) do nothing;

-- Rotisería Express
insert into categories (store_id, id, name, sort_order)
select s.id, v.id, v.name, v.sort_order
from (values
  ('empanadas', 'Empanadas', 1),
  ('pizzas', 'Pizzas', 2),
  ('platos', 'Platos principales', 3),
  ('combos', 'Combos', 4),
  ('bebidas', 'Bebidas', 5),
  ('postres', 'Postres', 6)
) as v(id, name, sort_order)
cross join (select id from stores where slug = 'rotiseria-express') s
on conflict (store_id, id) do nothing;

insert into products (
  id, store_id, name, description, category_id, unit_price, pricing_type,
  pricing_tiers, stock, active, tags, image_url, images, sizes, colors
)
select v.id::uuid, s.id, v.name, v.description, v.category_id, v.unit_price, 'SIMPLE',
  '[]'::jsonb, v.stock, true, v.tags::text[], v.image_url, v.images::text[], '{}'::text[], '{}'::text[]
from (values
  (
    'b0000001-0000-4000-8000-000000000001', 'Empanadas de Carne (docena)', 'Masa fina, relleno jugoso. Aclaración de cocción opcional.',
    'empanadas', 12000::numeric, 30, '{"MÁS VENDIDO"}',
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80']
  ),
  (
    'b0000001-0000-4000-8000-000000000002', 'Pizza Muzzarella Grande', '8 porciones, masa artesanal y muzzarella de primera.',
    'pizzas', 9500, 20, '{"CLÁSICO"}',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80']
  ),
  (
    'b0000001-0000-4000-8000-000000000003', 'Milanesa con Papas', 'Milanesa de ternera con papas fritas. Porción abundante.',
    'platos', 11500, 15, '{"CASERO"}',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80']
  ),
  (
    'b0000001-0000-4000-8000-000000000004', 'Combo Familiar', '2 pizzas grandes + gaseosa 1.5L. Ideal para compartir.',
    'combos', 22000, 10, '{"COMBO"}',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80']
  ),
  (
    'b0000001-0000-4000-8000-000000000005', 'Gaseosa 1.5L', 'Bien fría, para completar el pedido.',
    'bebidas', 2800, 48, '{}',
    'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=900&q=80']
  ),
  (
    'b0000001-0000-4000-8000-000000000006', 'Flan Casero', 'Flan de vainilla con caramelo. Porción individual.',
    'postres', 4500, 12, '{}',
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80']
  )
) as v(id, name, description, category_id, unit_price, stock, tags, image_url, images)
cross join (select id from stores where slug = 'rotiseria-express') s
on conflict (id) do nothing;

-- Aura Studio
insert into categories (store_id, id, name, sort_order)
select s.id, v.id, v.name, v.sort_order
from (values
  ('remeras', 'Remeras', 1),
  ('pantalones', 'Pantalones', 2),
  ('abrigos', 'Abrigos', 3),
  ('faldas', 'Faldas', 4),
  ('accesorios', 'Accesorios', 5)
) as v(id, name, sort_order)
cross join (select id from stores where slug = 'aura-studio') s
on conflict (store_id, id) do nothing;

insert into products (
  id, store_id, name, description, category_id, unit_price, pricing_type,
  pricing_tiers, stock, active, tags, image_url, images, sizes, colors
)
select v.id::uuid, s.id, v.name, v.description, v.category_id, v.unit_price, 'SIMPLE',
  '[]'::jsonb, v.stock, true, v.tags::text[], v.image_url, v.images::text[], v.sizes::text[], v.colors::text[]
from (values
  (
    'c0000001-0000-4000-8000-000000000001', 'Remera Oversize Aura', 'Algodón pesado, calce relajado y caída perfecta.',
    'remeras', 28900::numeric, 24, '{"NUEVO"}',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
    array[
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=80'
    ],
    array['S','M','L','XL'], array['Negro','Blanco','Arena']
  ),
  (
    'c0000001-0000-4000-8000-000000000002', 'Jean Wide Leg', 'Denim rígido de tiro alto y pierna ancha.',
    'pantalones', 54900, 18, '{"FAVORITO"}',
    'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
    array[
      'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80'
    ],
    array['36','38','40','42','44'], array['Azul','Negro']
  ),
  (
    'c0000001-0000-4000-8000-000000000003', 'Campera Bomber', 'Nylon mate con interior acolchado. Un clásico de temporada.',
    'abrigos', 78900, 12, '{"EDICIÓN LIMITADA"}',
    'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80',
    array[
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80'
    ],
    array['S','M','L'], array['Negro','Verde']
  ),
  (
    'c0000001-0000-4000-8000-000000000004', 'Buzo Frisa', 'Frisa premium, puños anchos y capucha forrada.',
    'abrigos', 45900, 20, '{"NUEVO"}',
    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80'],
    array['S','M','L','XL'], array['Gris','Negro','Crema']
  ),
  (
    'c0000001-0000-4000-8000-000000000005', 'Pollera Plisada', 'Caída fluida y cintura elastizada.',
    'faldas', 32900, 14, '{}',
    'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=80'],
    array['S','M','L'], array['Negro','Vino']
  ),
  (
    'c0000001-0000-4000-8000-000000000006', 'Bolso Mini', 'Cuerina texturada con correa regulable.',
    'accesorios', 25000, 22, '{}',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
    array['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80'],
    array[]::text[], array['Negro','Crudo']
  )
) as v(id, name, description, category_id, unit_price, stock, tags, image_url, images, sizes, colors)
cross join (select id from stores where slug = 'aura-studio') s
on conflict (id) do nothing;

commit;

-- ============================================================
-- VERIFICACIÓN RÁPIDA
-- ============================================================
-- select slug, name, settings -> 'business_type' as tipo from stores order by slug;
-- select store_id, count(*) from products group by store_id;
-- select has_function_privilege('anon', 'create_sale(uuid,text,jsonb,text,text,text)', 'EXECUTE'); -- false
