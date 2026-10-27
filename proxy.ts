import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * En Next.js 16 el antiguo `middleware.ts` se llama `proxy.ts`
 * (la función `middleware` pasa a llamarse `proxy`). Protege el panel
 * (`/admin` y `/[storeSlug]/admin/...`) y refresca la sesión de Supabase
 * en cada request.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // FALLO CERRADO: sin variables de entorno no hay sesión posible,
  // así que NUNCA dejamos pasar /admin (evita exponer el panel en un
  // despliegue mal configurado).
  if (!url || !anonKey) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.redirect(loginUrl);
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

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  // Requiere sesión Y rol admin (app_metadata es confiable: no lo escribe el cliente).
  const role = user?.app_metadata?.role;
  const isAdmin = Boolean(user) && role === "admin";

  if (!isLogin && !isAdmin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.redirect(loginUrl);
  }

  if (isLogin && isAdmin) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    return NextResponse.redirect(adminUrl);
  }

  return response;
}

export const config = {
  // Panel maestro (`/admin`, `/admin/login`) y paneles por tienda
  // (`/ag-mayorista/admin/productos`, etc.).
  matcher: ["/admin/:path*", "/:storeSlug/admin/:path*"],
};
