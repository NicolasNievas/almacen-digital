"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { STORE } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("No pudimos conectar con el servicio de cuentas. Contactá al administrador.");
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.push("/admin");
      router.refresh();
    } catch {
      // No mostramos el detalle técnico: solo un mensaje amigable.
      setError("No se pudo iniciar sesión. Verificá tu email y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold text-brand">{STORE.name}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Ingresá a tu panel de administración</p>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Contraseña</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-brand dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </label>

        {error && <p className="rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-solid py-2.5 font-semibold text-white hover:bg-brand-accent disabled:opacity-40"
        >
          <LogIn size={18} /> {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
