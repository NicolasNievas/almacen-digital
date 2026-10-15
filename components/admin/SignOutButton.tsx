"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        await createClient().auth.signOut();
      }
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
    >
      <LogOut size={15} /> {loading ? "Saliendo..." : "Salir"}
    </button>
  );
}
