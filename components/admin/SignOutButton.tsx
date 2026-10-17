"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        await createClient().auth.signOut();
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      window.location.href = "/admin/login";
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:text-white"
    >
      <LogOut size={15} /> {loading ? "Saliendo..." : "Salir"}
    </button>
  );
}