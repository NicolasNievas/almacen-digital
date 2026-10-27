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

La landing corporativa está en `/` y el panel de administración en `/admin`.

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
   ```

   Si la base ya existía con las migraciones 001–005, ejecutar **solo**
   `supabase/006_multitenant_saas.sql`. El script es idempotente y crea:

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

- `/admin` requiere sesión admin y lista todas las tiendas activas de `stores`.
  Cada tarjeta (y el botón "Ir a ...") lleva al panel de esa tienda.
- El panel por tienda resuelve el tenant desde el segmento `[storeSlug]`, así
  que la URL es compartible y cada sección filtra por su `store_id`.
- El selector del header navega a `/[otraTienda]/admin/<misma sección>` sin
  perder la subruta activa.
- `NEXT_PUBLIC_ADMIN_STORE_SLUG` (`ag-mayorista` por defecto) solo define la
  tienda destacada en el panel maestro; ya no condiciona al resto del panel.

## Rutas principales

```text
/                       Landing corporativa
/[storeSlug]            Tienda dinámica (settings-driven)
/[storeSlug] 404        Vista personalizada si el slug no existe
/admin                  Panel maestro (selección de tienda)
/[storeSlug]/admin      Panel de la tienda (métricas, productos, stock, POS, pedidos)
/api/mercadopago/...    Creación de preferencia de pago
```

## Scripts

```bash
npm run dev      # desarrollo
npm run build    # build de producción
npm run start    # servir el build
npm run lint     # ESLint
```

## Notas de seguridad

- El catálogo público solo lee tiendas activas y productos activos.
- `orders`, `order_items` y `stock_logs` quedan solo para administradores.
- `create_sale` exige rol admin y una tienda válida; los pedidos web entran
  como `PENDING` y el stock se descuenta al confirmarlos desde el panel.
- El access token de Mercado Pago nunca se expone al navegador.
