-- ============================================================
-- 008 · DISEÑO POR TENANT (UI LAYOUTS)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de:
--   schema.sql, 002, 003, 004, 005, 006 y 007.
--
-- Qué hace este script:
--   1. Agrega la clave `design` a `stores.settings` (JSONB), sin
--      crear columnas nuevas en `stores`.
--   2. Normaliza `design` con defaults por rubro:
--        - CLOTHING  -> storefront "boutique" + admin "sidebar-fixed"
--        - resto     -> storefront "retail"   + admin "navbar-top"
--   3. Endurece `stores_settings_shape_check` para validar también
--      el nuevo bloque `design` (enums, colores, fuentes, radio).
--   4. Inyecta un diseño por defecto en las 3 tiendas semilla.
--
-- El script es idempotente: se puede volver a ejecutar sin duplicar
-- datos y sin pisar un `design` que el tenant ya haya personalizado.
-- ============================================================

begin;

-- ============================================================
-- 1. NORMALIZADOR DEL BLOQUE `design`
-- ============================================================
-- Función auxiliar e inmutable. Nunca confía en la forma del dato:
-- cualquier valor ausente o inválido cae al default del layout.
--
-- `p_business_type` permite que el default dependa del rubro cuando
-- la tienda todavía no tiene un `design` explícito.
create or replace function normalize_store_design(
  p jsonb,
  p_business_type text default null
)
returns jsonb
language sql
immutable
as $$
  with src as (
    select
      coalesce(p, '{}'::jsonb) as d,
      case
        when coalesce(p ->> 'storefront_layout', '') in ('boutique', 'retail')
          then p ->> 'storefront_layout'
        when p_business_type = 'CLOTHING'
          then 'boutique'
        else 'retail'
      end as storefront_layout
  ),
  resolved as (
    select
      d,
      storefront_layout,
      case
        when coalesce(d ->> 'admin_layout', '') in ('sidebar-fixed', 'navbar-top')
          then d ->> 'admin_layout'
        when storefront_layout = 'boutique'
          then 'sidebar-fixed'
        else 'navbar-top'
      end as admin_layout,
      coalesce(d -> 'theme', '{}'::jsonb) as theme,
      coalesce(d -> 'theme' -> 'colors', '{}'::jsonb) as colors,
      coalesce(d -> 'theme' -> 'fonts', '{}'::jsonb) as fonts,
      coalesce(d -> 'theme' -> 'ui', '{}'::jsonb) as ui
    from src
  )
  select jsonb_build_object(
    'storefront_layout', storefront_layout,
    'admin_layout', admin_layout,
    'theme', jsonb_build_object(
      'colors', jsonb_build_object(
        'primary',
          case
            when colors ->> 'primary' ~ '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'
              then colors ->> 'primary'
            when storefront_layout = 'boutique'
              then '#FAD4D8'
            else '#1E40AF'
          end,
        'background',
          case
            when colors ->> 'background' ~ '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'
              then colors ->> 'background'
            when storefront_layout = 'boutique'
              then '#FAF9F6'
            else '#FAFAFA'
          end
      ),
      'fonts', jsonb_build_object(
        'heading',
          case
            when fonts ->> 'heading' ~ '^[A-Za-z0-9][A-Za-z0-9 -]{0,63}$'
              then btrim(fonts ->> 'heading')
            when storefront_layout = 'boutique'
              then 'Playfair Display'
            else 'Inter'
          end,
        'body',
          case
            when fonts ->> 'body' ~ '^[A-Za-z0-9][A-Za-z0-9 -]{0,63}$'
              then btrim(fonts ->> 'body')
            else 'Inter'
          end
      ),
      'ui', jsonb_build_object(
        'radius',
          case
            when ui ->> 'radius' ~ '^(0|[0-9]+(\.[0-9]+)?(px|rem|em|%))$'
              then ui ->> 'radius'
            when storefront_layout = 'boutique'
              then '0.5rem'
            else '0.375rem'
          end,
        'shadows',
          case
            when ui ->> 'shadows' in ('soft', 'sharp', 'none')
              then ui ->> 'shadows'
            else 'soft'
          end
      )
    )
  )
  from resolved;
$$;

-- ============================================================
-- 2. `normalize_store_settings` CON LA NUEVA CLAVE `design`
-- ============================================================
-- Mantiene intactas las claves existentes y agrega `design`.
-- El orden de las claves en el JSON resultante es estable.
create or replace function normalize_store_settings(p jsonb)
returns jsonb
language sql
immutable
as $$
  with normalized as (
    select
      case
        when coalesce(p ->> 'business_type', '') in ('MAYORISTA', 'GASTRONOMY', 'CLOTHING')
          then p ->> 'business_type'
        else 'MAYORISTA'
      end as business_type,
      case
        when coalesce(p ->> 'checkout_type', '') in ('WHATSAPP', 'MERCADO_PAGO')
          then p ->> 'checkout_type'
        else 'WHATSAPP'
      end as checkout_type
  )
  select jsonb_build_object(
    'business_type', business_type,
    'checkout_type', checkout_type,
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
    ),
    'design', normalize_store_design(p -> 'design', business_type)
  )
  from normalized;
$$;

-- El trigger existente ya llama a `normalize_store_settings`, por lo
-- que toda escritura futura en `stores` queda normalizada.
-- (Se recrea por claridad y para garantizar que apunte a la versión 008.)
create or replace function stores_before_write()
returns trigger
language plpgsql
as $$
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

-- ============================================================
-- 3. SEED DE DISEÑO PARA LAS 3 TIENDAS DEMO
-- ============================================================
-- Solo se inyecta si la tienda todavía no tiene `design`. Así, volver
-- a ejecutar la migración no pisa una personalización posterior.
update stores
set settings = settings || jsonb_build_object(
  'design',
  case stores.slug
    -- Retail: catálogo denso, navegación superior y look de almacén.
    when 'ag-mayorista' then '{
      "storefront_layout": "retail",
      "admin_layout": "navbar-top",
      "theme": {
        "colors": { "primary": "#1E40AF", "background": "#FAFAFA" },
        "fonts": { "heading": "Inter", "body": "Inter" },
        "ui": { "radius": "0.375rem", "shadows": "soft" }
      }
    }'::jsonb

    -- Retail gastronómico: misma estructura, paleta cálida.
    when 'rotiseria-express' then '{
      "storefront_layout": "retail",
      "admin_layout": "navbar-top",
      "theme": {
        "colors": { "primary": "#EA580C", "background": "#FFFBF5" },
        "fonts": { "heading": "Inter", "body": "Inter" },
        "ui": { "radius": "0.375rem", "shadows": "soft" }
      }
    }'::jsonb

    -- Boutique: aire, tipografía editorial y panel con sidebar fija.
    when 'aura-studio' then '{
      "storefront_layout": "boutique",
      "admin_layout": "sidebar-fixed",
      "theme": {
        "colors": { "primary": "#FAD4D8", "background": "#FAF9F6" },
        "fonts": { "heading": "Playfair Display", "body": "Inter" },
        "ui": { "radius": "0.5rem", "shadows": "soft" }
      }
    }'::jsonb

    else null
  end
)
where stores.slug in ('ag-mayorista', 'rotiseria-express', 'aura-studio')
  and stores.settings -> 'design' is null;

-- Backfill de CUALQUIER otra tienda existente (y normalización final
-- de las 3 semilla). El trigger vuelve a normalizar cada fila.
update stores
set settings = normalize_store_settings(settings);

-- ============================================================
-- 4. CONSTRAINT ESTRICTO DEL JSONB
-- ============================================================
-- `coalesce(..., false)` es importante: en un CHECK, NULL se trata
-- como "unknown" y la fila pasaría. Queremos que una clave ausente
-- o inválida falle de forma explícita.
alter table stores drop constraint if exists stores_settings_shape_check;
alter table stores add constraint stores_settings_shape_check check (
  -- Claves existentes
  coalesce(settings ->> 'business_type' in ('MAYORISTA', 'GASTRONOMY', 'CLOTHING'), false)
  and coalesce(settings ->> 'checkout_type' in ('WHATSAPP', 'MERCADO_PAGO'), false)
  and coalesce(jsonb_typeof(settings -> 'fulfillment') = 'object', false)
  and coalesce(jsonb_typeof(settings -> 'features') = 'object', false)

  -- Bloque design
  and coalesce(jsonb_typeof(settings -> 'design') = 'object', false)

  -- Layouts permitidos
  and coalesce(settings -> 'design' ->> 'storefront_layout' in ('boutique', 'retail'), false)
  and coalesce(settings -> 'design' ->> 'admin_layout' in ('sidebar-fixed', 'navbar-top'), false)

  -- Tema
  and coalesce(jsonb_typeof(settings -> 'design' -> 'theme') = 'object', false)
  and coalesce(jsonb_typeof(settings -> 'design' -> 'theme' -> 'colors') = 'object', false)
  and coalesce(jsonb_typeof(settings -> 'design' -> 'theme' -> 'fonts') = 'object', false)
  and coalesce(jsonb_typeof(settings -> 'design' -> 'theme' -> 'ui') = 'object', false)

  -- Colores hex (#RGB o #RRGGBB)
  and coalesce(
    settings -> 'design' -> 'theme' -> 'colors' ->> 'primary'
      ~ '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$',
    false
  )
  and coalesce(
    settings -> 'design' -> 'theme' -> 'colors' ->> 'background'
      ~ '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$',
    false
  )

  -- Fuentes: nombre no vacío (máx. 64 chars) y Body obligatorio
  and coalesce(
    settings -> 'design' -> 'theme' -> 'fonts' ->> 'heading'
      ~ '^[A-Za-z0-9][A-Za-z0-9 -]{0,63}$',
    false
  )
  and coalesce(
    settings -> 'design' -> 'theme' -> 'fonts' ->> 'body'
      ~ '^[A-Za-z0-9][A-Za-z0-9 -]{0,63}$',
    false
  )

  -- UI: radio CSS válido y sombras del catálogo
  and coalesce(
    settings -> 'design' -> 'theme' -> 'ui' ->> 'radius'
      ~ '^(0|[0-9]+(\.[0-9]+)?(px|rem|em|%))$',
    false
  )
  and coalesce(
    settings -> 'design' -> 'theme' -> 'ui' ->> 'shadows' in ('soft', 'sharp', 'none'),
    false
  )
);

commit;

-- ============================================================
-- VERIFICACIÓN RÁPIDA
-- ============================================================
-- select
--   slug,
--   settings -> 'design' ->> 'storefront_layout' as storefront,
--   settings -> 'design' ->> 'admin_layout'      as admin,
--   settings -> 'design' -> 'theme'              as theme
-- from stores
-- order by slug;
--
-- Debe fallar (constraint):
-- update stores
-- set settings = settings || '{"design":{"storefront_layout":"otro"}}'::jsonb
-- where slug = 'ag-mayorista';
