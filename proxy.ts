import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminRole, listAccessibleStoreSlugs } from "@/lib/supabase/access";

const LOGIN_PATH = "/admin/login";

/** Copia las cookies refrescadas por Supabase al response de redirección. */
function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  motivo?: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (motivo) url.searchParams.set("motivo", motivo);

  const redirectResponse = NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

/**
 * Conserva la sección activa al derivar a un admin a su propia tienda:
 * `/otra-tienda/admin/productos` → `/mi-tienda/admin/productos`.
 */
function ownStoreHref(pathname: string, slug: string) {
  const segments = pathname.split("/").filter(Boolean);
  const adminIndex = segments.indexOf("admin");
  const suffix = adminIndex >= 0 ? `/${segments.slice(adminIndex).join("/")}` : "/admin";
  return `/${slug}${suffix}`;
}

/**
 * En Next.js 16 el antiguo `middleware.ts` se llama `proxy.ts`
 * (la función `middleware` pasa a llamarse `proxy`).
 *
 * Protege el panel maestro (`/admin`) y los paneles por tienda
 * (`/[storeSlug]/admin/...`) con dos niveles:
 *   - `superadmin` → acceso total.
 *   - `admin`      → solo tiendas con fila activa en `user_stores`.
 *
 * También refresca la sesión de Supabase en cada request.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const isLogin = pathname === LOGIN_PATH;
  // `/admin` y cualquier subruta del panel maestro (salvo el login).
  const isMasterPanel = segments[0] === "admin" && !isLogin;
  // `/ag-mayorista/admin/...`
  const storeSlug = segments.length >= 2 && segments[1] === "admin" ? segments[0] : null;

  // FALLO CERRADO: sin variables de entorno no hay sesión posible,
  // así que NUNCA dejamos pasar el panel (evita exponerlo en un
  // despliegue mal configurado). El login se muestra para no loopear.
  if (!url || !anonKey) {
    if (isLogin) return NextResponse.next();
    return redirectWithCookies(request, NextResponse.next(), LOGIN_PATH);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // IMPORTANTE: no agregar lógica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: solo el login es público.
  if (!user) {
    if (isLogin) return response;
    return redirectWithCookies(request, response, LOGIN_PATH);
  }

  const role = getAdminRole(user);

  // Usuario autenticado sin rol de panel: puede ver el login para
  // cambiar de cuenta, pero no entra a ninguna ruta protegida.
  if (role === "none") {
    if (isLogin) return response;
    return redirectWithCookies(request, response, LOGIN_PATH);
  }

  // Superadmin: acceso total y `/admin` como tablero maestro.
  if (role === "superadmin") {
    if (isLogin) return redirectWithCookies(request, response, "/admin");
    return response;
  }

  // Admin de tienda: resolver sus tiendas autorizadas.
  const storeSlugs = await listAccessibleStoreSlugs(supabase, user.id);
  const ownSlug = storeSlugs[0] ?? null;

  // Si ya está logueado, el login lo lleva a su panel (o lo deja verlo
  // cuando todavía no tiene ninguna tienda asignada, sin loopear).
  if (isLogin) {
    return ownSlug
      ? redirectWithCookies(request, response, `/${ownSlug}/admin`)
      : response;
  }

  // El panel maestro es exclusivo del superadmin.
  if (isMasterPanel) {
    return ownSlug
      ? redirectWithCookies(request, response, `/${ownSlug}/admin`)
      : redirectWithCookies(request, response, LOGIN_PATH, "sin-acceso");
  }

  // Panel de una tienda: debe tener un vínculo activo en `user_stores`.
  if (storeSlug) {
    if (storeSlugs.includes(storeSlug)) return response;
    return ownSlug
      ? redirectWithCookies(request, response, ownStoreHref(pathname, ownSlug))
      : redirectWithCookies(request, response, LOGIN_PATH, "sin-acceso");
  }

  return response;
}

export const config = {
  // Panel maestro (`/admin`, `/admin/login`) y paneles por tienda
  // (`/ag-mayorista/admin/productos`, etc.).
  matcher: ["/admin/:path*", "/:storeSlug/admin/:path*"],
};
