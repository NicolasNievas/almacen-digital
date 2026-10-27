import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente público SIN cookies para datos de catálogo (tiendas, productos).
 * Permite renderizar Server Components sin depender de la sesión y sin
 * arrastrar `cookies()` a la landing.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;

  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
