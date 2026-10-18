-- 004: El POS ya no guarda una hora de retiro.
-- El campo "Retiro" (pickup_time) es exclusivo de los pedidos web.
-- Antes, create_sale rellenaba pickup_time con to_char(now(),'HH24:MI'),
-- que usa la zona horaria del servidor (UTC) y generaba una hora errónea.
-- Ejecutar en el SQL Editor de Supabase.

create or replace function create_sale(p_source text, p_items jsonb, p_customer text default null,
                                       p_pickup text default null, p_payment text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order uuid; v_total numeric := 0; it jsonb; prod products; v_qty int; v_line numeric;
begin
  -- GUARD ESTRICTO E INCONDICIONAL (ver migración 005): solo rol admin.
  if not is_admin() then raise exception 'Acceso denegado'; end if;
  if p_source <> 'POS' then raise exception 'Fuente invalida'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Venta vacia'; end if;

  -- pickup_time solo si viene (web). Para POS queda NULL.
  insert into orders(source, customer_name, pickup_time, payment_method, total, status)
  values (p_source, p_customer, p_pickup, p_payment, 0, 'COMPLETED')
  returning id into v_order;

  for it in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    v_qty := (it->>'quantity')::int;
    if v_qty is null or v_qty <= 0 then raise exception 'Cantidad invalida'; end if;
    select * into prod from products where id = (it->>'product_id')::uuid and active for update;
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

-- Limpiar horas de retiro erróneas ya guardadas en ventas del POS.
update orders set pickup_time = null where source = 'POS';
