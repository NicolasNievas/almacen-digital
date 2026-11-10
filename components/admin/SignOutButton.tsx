"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Props = {
  className?: string;
};

export default function SignOutButton({ className }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      router.replace("/admin/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={
        className ??
        "flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:text-white"
      }
    >
      <LogOut size={15} strokeWidth={1.5} /> {loading ? "Saliendo..." : "Salir"}
    </button>
  );
}
