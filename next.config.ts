import type { NextConfig } from "next";

/**
 * Headers de seguridad aplicados a todas las rutas.
 *
 * - `X-Content-Type-Options`: evita que el navegador adivine el MIME type.
 * - `X-Frame-Options` + `frame-ancestors`: bloquean clickjacking.
 * - `Permissions-Policy`: desactiva APIs del navegador que no usamos.
 * - `COOP` / `CORP`: aislan la ventana y los recursos del origen.
 *   No se activa COEP (`require-corp`) porque rompería imágenes de
 *   Cloudinary/Unsplash que no envían CORP.
 * - CSP en `Report-Only`: no bloquea nada todavía, solo reporta en la
 *   consola del navegador. Cuando esté limpia, renombrar la key a
 *   `Content-Security-Policy` y migrar los scripts inline a nonces
 *   generados en `proxy.ts`.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: false,
  partialPrefetching: false, // Habilitarlo solo si cacheComponents: true

  // Oculta `X-Powered-By: Next.js` de las respuestas.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    // Cloudinary para uploads del panel + Unsplash para el catálogo demo.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
