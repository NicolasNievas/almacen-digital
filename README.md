# Nexo Commerce · SaaS multitenant

Plataforma de gestión y e-commerce para distintos tipos de comercio. Una sola
base de datos y un solo código sirven múltiples tiendas; cada tienda define su
experiencia desde `stores.settings` (JSONB).

## Demos incluidos

| Tienda | Slug | Rubro | Checkout |
| --- | --- | --- | --- |
| AG Mayorista | `/ag-mayorista` | Mayorista / almacén | WhatsApp |
| Rotisería Express | `/rotiseria-express` | Gastronomía | WhatsApp |
| Aura Studio | `/aura-studio` | Indumentaria | Mercado Pago (+ fallback WhatsApp) |

La landing corporativa está en `/` y el panel maestro (solo superadmin) en
`/admin`. Cada tienda tiene su propio panel en `/[storeSlug]/admin`.

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.local.example` a `.env.local` y completar:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   NEXT_PUBLIC_ADMIN_STORE_SLUG=ag-mayorista
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   MERCADO_PAGO_ACCESS_TOKEN=... # opcional
   ```

3. En el **SQL Editor de Supabase**, ejecutar las migraciones en orden si la
   base es nueva:

   ```text
   supabase/schema.sql
   supabase/002_web_orders_pending.sql
   supabase/003_pos_pickup_time.sql
   supabase/004_pos_pickup_null.sql
   supabase/005_fix_security_grants.sql
   supabase/006_multitenant_saas.sql   <-- arquitectura SaaS
   supabase/007_user_stores_permissions.sql   <-- roles por tienda
   ```

   Si la base ya existía con las migraciones 001–005, ejecutar **solo**
   `supabase/006_multitenant_saas.sql` y luego
   `supabase/007_user_stores_permissions.sql`. La migración 006 es idempotente y
   crea:

   - `stores` (tenant principal) con `settings` JSONB.
   - `store_id` en `categories`, `products`, `orders`, `order_items` y
     `stock_logs`, con backfill a AG Mayorista.
   - PK compuesta `(store_id, id)` en categorías y FK compuesta en productos.
   - Variantes/galería (`sizes`, `colors`, `images`) y datos de entrega.
   - RPCs tenant-aware (`create_sale`, `create_web_order`) y RLS por tienda.
   - Las 3 tiendas demo con catálogo de ejemplo.

4. Iniciar el proyecto:

   ```bash
   npm run dev
   ```

## Estructura de `stores.settings`

```json
{
  "business_type": "MAYORISTA",
  "checkout_type": "WHATSAPP",
  "fulfillment": {
    "shipping_enabled": false,
    "pickup_enabled": true
  },
  "features": {
    "variants_enabled": false,
    "gallery_enabled": false,
    "pos_enabled": true,
    "stock_alerts": true,
    "custom_notes": false
  }
}
```

Valores permitidos:

- `business_type`: `MAYORISTA` | `GASTRONOMY` | `CLOTHING`
- `checkout_type`: `WHATSAPP` | `MERCADO_PAGO`

La UI se adapta automáticamente:

- **CLOTHING**: selector de talle/color y galería con múltiples imágenes.
- **GASTRONOMY**: notas por ítem y elección Delivery / Takeaway.
- **MAYORISTA**: packs, escalones de precio y retiro en local.
- **WHATSAPP**: arma el desglose completo y abre `wa.me`.
- **MERCADO_PAGO**: crea la preferencia en
  `/api/mercadopago/preference` (server-side) y redirige al checkout.

## Panel de administración

Hay dos niveles de rutas:

```text
/admin                        Panel maestro (SuperAdmin): lista las tiendas
/admin?store=aura-studio      Redirige a /aura-studio/admin
/[storeSlug]/admin            Métricas de la tienda
/[storeSlug]/admin/productos
/[storeSlug]/admin/stock
/[storeSlug]/admin/pos
/[storeSlug]/admin/pedidos
```

- `/admin` es exclusivo del rol **superadmin**: lista todas las tiendas activas
  de `stores`. Cada tarjeta (y el botón "Ir a ...") lleva al panel de esa tienda.
  Un admin de tienda que entre a `/admin` es derivado a su propio panel.
- El panel por tienda resuelve el tenant desde el segmento `[storeSlug]`, así
  que la URL es compartible y cada sección filtra por su `store_id`.
- El selector del header navega a `/[otraTienda]/admin/<misma sección>` sin
  perder la subruta activa. Un admin de tienda solo ve las tiendas asignadas en
  `user_stores`; si tiene una sola, el desplegable se muestra deshabilitado.
- `NEXT_PUBLIC_ADMIN_STORE_SLUG` (`ag-mayorista` por defecto) solo define la
  tienda destacada en el panel maestro; ya no condiciona al resto del panel.

## Roles y accesos

La autorización se valida en tres capas: proxy, layouts de servidor y RLS.

| Rol | Dónde se define | Acceso |
| --- | --- | --- |
| `superadmin` | `auth.users.raw_app_meta_data.role` | Todo el SaaS y `/admin` |
| `admin` | `auth.users.raw_app_meta_data.role` | Solo tiendas activas en `user_stores` |
| sin rol | — | Solo el storefront público |

La migración `007_user_stores_permissions.sql` crea:

- `user_stores (user_id, store_id, active)`: vínculo usuario ↔ tienda.
- `is_superadmin()`: `app_metadata.role = 'superadmin'`.
- `has_store_access(store_id)`: superadmin o admin con vínculo activo.
- Políticas RLS y RPCs que validan la tienda del registro.

Para habilitar usuarios, usar los bloques comentados al final de 007. Ejemplo:

```sql
-- Superadmin
update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"superadmin"}'::jsonb
  where email = 'superadmin@tudominio.com';

-- Admin de AG Mayorista
update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
  where email = 'admin@ag-mayorista.com';

insert into user_stores (user_id, store_id)
select u.id, s.id
from auth.users u
join stores s on s.slug = 'ag-mayorista'
where u.email = 'admin@ag-mayorista.com'
on conflict (user_id, store_id) do update set active = true;
```

Después de cambiar `app_metadata`, el usuario debe cerrar y volver a iniciar
sesión para que el JWT incluya el rol nuevo.

> **Importante:** si ya tenías usuarios con `role: "admin"`, al aplicar 007
> necesitan al menos una fila activa en `user_stores`. Sin asignación, el proxy
> y `requireAdmin` los redirigen al login (fail-closed).

## Rutas principales

```text
/                       Landing corporativa
/[storeSlug]            Tienda dinámica (settings-driven)
/[storeSlug] 404        Vista personalizada si el slug no existe
/admin                  Panel maestro (solo superadmin)
/[storeSlug]/admin      Panel de la tienda (métricas, productos, stock, POS, pedidos)
/api/mercadopago/...    Creación de preferencia de pago
```

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run start      # servir el build
npm run lint       # ESLint
npm run typecheck  # TypeScript sin emitir
npm test           # tests una vez (CI)
npm run test:watch # tests en modo watch
```

## Pruebas y CI

El proyecto usa [Vitest](https://vitest.dev/) con React Testing Library y
`jsdom`. La configuración está en `vitest.config.mts` y el setup global
(limpieza del DOM + matchers de jest-dom) en `vitest.setup.ts`.

Los tests viven junto al código, en carpetas `__tests__`:

- `lib/__tests__/auth.test.ts`: permisos y redirecciones de `requireAdmin` y
  `requireSuperadmin` (sin sesión, sin rol, superadmin, admin con y sin tienda
  asignada). Mockea Supabase y `next/navigation`, así que no necesita un
  proyecto real ni variables de entorno.
- `lib/__tests__/pricing.test.ts`: totales de POS/compras para precios
  `SIMPLE`, `TIERED` y `BUNDLE`, cantidades inválidas y ahorro (`calcSavings`).

Para agregar tests de componentes, crear archivos `*.test.tsx` y usar
`render`/`screen` de `@testing-library/react`; la limpieza entre tests ya está
configurada.

El workflow `.github/workflows/ci.yml` corre en cada push y pull request a
`develop` y `main`:

1. `npm ci`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm test`

## Notas de seguridad

- El catálogo público solo lee tiendas activas y productos activos.
- `orders`, `order_items` y `stock_logs` quedan solo para usuarios con acceso
  a la tienda del registro (`has_store_access`).
- Un `admin` de tienda no puede leer ni escribir pedidos, stock ni productos
  pausados de otra tienda aunque conozca su `store_id`: la RLS y las RPCs
  validan el vínculo en `user_stores`. El catálogo activo sigue siendo público.
- El panel maestro `/admin` y la escritura del registro de tiendas quedan
  reservados al `superadmin`.
- `create_sale`, `confirm_order`, `cancel_order` y `adjust_stock` exigen acceso
  a la tienda del registro; los pedidos web entran como `PENDING` y el stock se
  descuenta al confirmarlos desde el panel.
- El access token de Mercado Pago nunca se expone al navegador.
