import { createBrowserClient } from "@supabase/ssr";

/**
 * Indica si las variables públicas de Supabase están definidas.
 * Permite que la Fase 1 (mock) siga funcionando sin `.env.local`.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Cliente de Supabase para el navegador (Client Components).
 * Requiere `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Configurá tu .env.local (ver Fase 2).",
    );
  }

  return createBrowserClient(url, anonKey);
}
