-- ============================================================
-- 005 · FIX DE SEGURIDAD CRÍTICO
-- Vulnerabilidad: `create_sale` estaba concedida a `anon` y su
-- guard solo cubría p_source = 'POS'. Cualquier visitante sin
-- sesión podía llamarla con p_source = 'WEB' para crear órdenes
-- COMPLETED y descontar stock real.
--
-- Fix: guard estricto e incondicional + REVOKE a anon/public.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create or replace function create_sale(p_source text, p_items jsonb, p_customer text default null,
                                       p_pickup text default null, p_payment text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_total numeric := 0; it jsonb; prod products; v_qty int; v_line numeric;
begin
  -- GUARD ESTRICTO E INCONDICIONAL: cualquier origen exige rol admin.
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  -- Solo el POS presencial usa esta función; el flujo web va por create_web_order.
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

-- Solo el panel POS (siempre autenticado y con rol admin) puede ejecutarla.
grant execute on function create_sale to authenticated;
revoke execute on function create_sale from anon, public;

-- Verificación (debe devolver false en producción):
-- select has_function_privilege('anon', 'create_sale(text,jsonb,text,text,text)', 'EXECUTE');
