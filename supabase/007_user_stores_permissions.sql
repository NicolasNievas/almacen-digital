-- ============================================================
-- 007 · PERMISOS GRANULARES POR TIENDA
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de:
--   schema.sql, 002, 003, 004, 005 y 006.
--
-- Qué hace este script:
--   1. Crea `user_stores` (qué usuarios administran qué tiendas).
--   2. Define `is_superadmin()` y `has_store_access(store_id)`.
--   3. Redefine `is_admin()` para que un admin de tienda solo cuente
--      como tal si tiene al menos un vínculo activo en `user_stores`.
--   4. Reemplaza las políticas RLS para que cada tienda solo pueda
--      leer/escribir sus propios datos.
--   5. Endurece las RPCs (`create_sale`, `confirm_order`, `cancel_order`,
--      `adjust_stock`) para validar el acceso a la tienda del registro.
--
-- Modelo de roles (guardado en `auth.users.raw_app_meta_data`):
--   - `superadmin` → acceso total al SaaS y al panel maestro `/admin`.
--   - `admin`      → acceso solo a las tiendas con fila activa en
--                    `user_stores`; su panel vive en `/{slug}/admin`.
--
-- IMPORTANTE: los usuarios que ya tenían `role = 'admin'` necesitan al menos
-- una fila activa en `user_stores`. Sin asignación quedan sin acceso (fail-closed).
--
-- El script es idempotente: se puede volver a ejecutar sin duplicar datos.
-- ============================================================

begin;

-- ============================================================
-- 1. TABLA DE ACCESO USUARIO ↔ TIENDA
-- ============================================================
create table if not exists user_stores (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, store_id)
);

create index if not exists user_stores_store_active_idx
  on user_stores(store_id) where active;

create or replace function user_stores_before_write()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_user_stores_before_write on user_stores;
create trigger trg_user_stores_before_write
  before insert or update on user_stores
  for each row execute function user_stores_before_write();

-- ============================================================
-- 2. FUNCIONES DE AUTORIZACIÓN
-- ============================================================
-- `security definer` evita recursión de RLS: las políticas de
-- `user_stores` llaman a `is_superadmin()` y `has_store_access()` lee
-- `user_stores` sin pasar por sus propias políticas.
create or replace function is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'superadmin'
$$;

create or replace function has_store_access(p_store_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_store_id is not null
    and (
      is_superadmin()
      or (
        coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
        and exists (
          select 1
          from user_stores us
          where us.store_id = p_store_id
            and us.user_id = auth.uid()
            and us.active
        )
      )
    )
$$;

-- Compatibilidad: ahora un `admin` sin tiendas asignadas NO es admin.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select is_superadmin()
    or (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
      and exists (
        select 1
        from user_stores us
        where us.user_id = auth.uid()
          and us.active
      )
    )
$$;

-- Las políticas RLS se evalúan también para `anon` (catálogo público).
grant execute on function is_superadmin() to anon, authenticated;
grant execute on function has_store_access(uuid) to anon, authenticated;

-- RLS de `user_stores`: cada usuario ve sus vínculos; solo el
-- superadmin puede crear, editar o desactivar asignaciones.
alter table user_stores enable row level security;

drop policy if exists "read own store links" on user_stores;
drop policy if exists "superadmin manage store links" on user_stores;
create policy "read own store links" on user_stores
  for select using (user_id = auth.uid());
create policy "superadmin manage store links" on user_stores
  for all using (is_superadmin()) with check (is_superadmin());

-- ============================================================
-- 3. RLS POR TIENDA
-- ============================================================
-- Tiendas: lectura pública de activas + acceso a las propias.
-- La escritura del registro de tienda queda reservada al superadmin.
drop policy if exists "public read active stores" on stores;
drop policy if exists "admin write stores" on stores;
drop policy if exists "superadmin write stores" on stores;
create policy "public read active stores" on stores
  for select using (active = true or is_superadmin() or has_store_access(id));
create policy "superadmin write stores" on stores
  for all using (is_superadmin()) with check (is_superadmin());

-- Catálogo: lectura pública solo de tiendas activas; cada admin ve y
-- edita únicamente el catálogo de sus tiendas.
drop policy if exists "public read categories" on categories;
drop policy if exists "admin write categories" on categories;
drop policy if exists "store access write categories" on categories;
create policy "public read categories" on categories for select using (
  has_store_access(store_id)
  or exists (
    select 1 from stores s where s.id = categories.store_id and s.active
  )
);
create policy "store access write categories" on categories
  for all using (has_store_access(store_id)) with check (has_store_access(store_id));

drop policy if exists "public read active products" on products;
drop policy if exists "admin write products" on products;
drop policy if exists "store access write products" on products;
create policy "public read active products" on products for select using (
  has_store_access(store_id)
  or (
    active = true and exists (
      select 1 from stores s where s.id = products.store_id and s.active
    )
  )
);
create policy "store access write products" on products
  for all using (has_store_access(store_id)) with check (has_store_access(store_id));

-- Pedidos, ítems y logs: solo usuarios con acceso a la tienda del registro.
drop policy if exists "admin read orders" on orders;
drop policy if exists "admin write orders" on orders;
drop policy if exists "store access read orders" on orders;
drop policy if exists "store access write orders" on orders;
create policy "store access read orders" on orders
  for select using (has_store_access(store_id));
create policy "store access write orders" on orders
  for all using (has_store_access(store_id)) with check (has_store_access(store_id));

drop policy if exists "admin read items" on order_items;
drop policy if exists "admin write items" on order_items;
drop policy if exists "store access read items" on order_items;
drop policy if exists "store access write items" on order_items;
create policy "store access read items" on order_items
  for select using (has_store_access(store_id));
create policy "store access write items" on order_items
  for all using (has_store_access(store_id)) with check (has_store_access(store_id));

drop policy if exists "admin read logs" on stock_logs;
drop policy if exists "admin write logs" on stock_logs;
drop policy if exists "store access read logs" on stock_logs;
drop policy if exists "store access write logs" on stock_logs;
create policy "store access read logs" on stock_logs
  for select using (has_store_access(store_id));
create policy "store access write logs" on stock_logs
  for all using (has_store_access(store_id)) with check (has_store_access(store_id));

-- ============================================================
-- 4. RPCs CON VALIDACIÓN POR TIENDA
-- ============================================================
-- Venta presencial (POS): el usuario debe administrar `p_store`.
create or replace function create_sale(
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
  if p_store is null then raise exception 'Tienda requerida'; end if;
  if not has_store_access(p_store) then raise exception 'Acceso denegado'; end if;
  if p_source <> 'POS' then raise exception 'Fuente invalida'; end if;
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

-- Confirmar pedido: valida el acceso a la tienda del pedido.
create or replace function confirm_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  ord orders;
  it record;
  prod products;
begin
  select * into ord from orders where id = p_order for update;
  if not found then raise exception 'Pedido inexistente'; end if;
  if not has_store_access(ord.store_id) then raise exception 'No autorizado'; end if;
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

-- Cancelar pedido: valida el acceso a la tienda del pedido.
create or replace function cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_store uuid;
begin
  select store_id into v_store from orders where id = p_order;
  if not found then raise exception 'Pedido inexistente'; end if;
  if not has_store_access(v_store) then raise exception 'No autorizado'; end if;

  update orders set status = 'CANCELLED' where id = p_order and status = 'PENDING';
  if not found then raise exception 'El pedido no está pendiente'; end if;
end $$;

-- Ajuste manual de stock: valida el acceso a la tienda del producto.
create or replace function adjust_stock(p_product uuid, p_new_stock int) returns void
language plpgsql security definer set search_path = public as $$
declare
  old int;
  v_store uuid;
begin
  select stock, store_id into old, v_store from products where id = p_product for update;
  if not found then raise exception 'Producto inexistente'; end if;
  if not has_store_access(v_store) then raise exception 'No autorizado'; end if;

  update products set stock = p_new_stock where id = p_product;
  insert into stock_logs (store_id, product_id, delta, reason)
  values (v_store, p_product, p_new_stock - old, 'MANUAL_ADJUST');
end $$;

-- ============================================================
-- 5. GRANTS
-- ============================================================
grant select, insert, update, delete on user_stores to authenticated;
revoke all on user_stores from anon;

-- ============================================================
-- 6. BOOTSTRAP DE USUARIOS (DESCOMENTAR Y ADAPTAR)
-- ============================================================
-- Los roles viven en `app_metadata` (solo los puede escribir el servidor).
-- Después de cambiarlos, el usuario debe cerrar y volver a iniciar sesión
-- para que el JWT incluya el rol nuevo.
--
-- Superadmin (acceso total + panel maestro /admin):
-- update auth.users
--   set raw_app_meta_data =
--     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"superadmin"}'::jsonb
--   where email = 'admin@example.com';
--
-- Admin de una tienda (acceso solo a las tiendas asignadas):
-- update auth.users
--   set raw_app_meta_data =
--     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--   where email = 'admin@ag-mayorista.com';
--
-- Asignar tienda(s) al admin:
-- insert into user_stores (user_id, store_id)
-- select u.id, s.id
-- from auth.users u
-- join stores s on s.slug = 'ag-mayorista'
-- where u.email = 'admin@ag-mayorista.com'
-- on conflict (user_id, store_id) do update set active = true;
--
-- Quitar acceso sin borrar el vínculo (auditoría):
-- update user_stores set active = false
-- where user_id = (select id from auth.users where email = 'admin@ag-mayorista.com')
--   and store_id = (select id from stores where slug = 'ag-mayorista');

commit;

-- ============================================================
-- VERIFICACIÓN RÁPIDA
-- ============================================================
-- select * from user_stores order by user_id, store_id;
-- select has_function_privilege('anon', 'create_sale(uuid,text,jsonb,text,text,text)', 'EXECUTE'); -- false
-- select is_superadmin(); -- true solo para un JWT con role = superadmin
