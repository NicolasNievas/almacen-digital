-- ============================================================
-- 002 · Pedidos web en estado PENDING (sin descontar stock)
-- Ejecutar en el SQL Editor de Supabase sobre una base ya creada
-- con supabase/schema.sql. Es idempotente (create or replace).
-- ============================================================

-- Columna opcional para tags del catálogo.
alter table products add column if not exists tags text[] not null default '{}';

-- create_sale ahora marca las ventas del POS como COMPLETED explícitamente.
create or replace function create_sale(p_source text, p_items jsonb, p_customer text default null,
                                       p_pickup text default null, p_payment text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_total numeric := 0; it jsonb; prod products; v_qty int; v_line numeric;
begin
  if p_source = 'POS' and not is_admin() then raise exception 'No autorizado'; end if;

  insert into orders(source, customer_name, pickup_time, payment_method, total, status)
  values (p_source, p_customer, p_pickup, p_payment, 0, 'COMPLETED')
  returning id into v_order;

  for it in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_qty := (it->>'quantity')::int;
    select * into prod from products where id = (it->>'product_id')::uuid and active for update;
    if not found then raise exception 'Producto no disponible'; end if;
    if prod.stock < v_qty then raise exception 'Stock insuficiente para %', prod.name; end if;

    v_line := calc_line_total(prod, v_qty);
    update products set stock = stock - v_qty where id = prod.id;
    insert into order_items(order_id, product_id, quantity, line_total) values (v_order, prod.id, v_qty, v_line);
    insert into stock_logs(product_id, delta, reason, order_id)
      values (prod.id, -v_qty, case when p_source = 'POS' then 'SALE_POS' else 'SALE_WEB' end, v_order);
    v_total := v_total + v_line;
  end loop;

  update orders set total = v_total where id = v_order;
  return v_order;
end $$;

-- El carrito web registra el pedido como PENDING sin tocar stock.
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

grant execute on function create_sale to anon, authenticated;
grant execute on function create_web_order to anon, authenticated;
grant execute on function confirm_order to authenticated;
grant execute on function cancel_order to authenticated;
