import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import SignOutButton from "@/components/admin/SignOutButton";
import AdminNav from "@/components/admin/AdminNav";
import ThemeToggle from "@/components/ThemeToggle";
import { STORE } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

// El layout lee cookies (sesión de Supabase) = dato dinámico, por lo que
// /admin debe renderizarse a tiempo de request en lugar de prerenderizarse.
export const dynamic = "force-dynamic";

/**
 * Refuerzo server-side: el proxy (`proxy.ts`) ya filtra, pero este layout
 * vuelve a verificar la sesión y el rol admin ANTES de renderizar cualquier
 * vista administrativa. Así /admin queda protegido aunque el proxy falle,
 * se omita o no matchee la ruta.
 */
async function requireAdmin() {
  let authUser: User | null = null;
  let failed = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) failed = true;
    authUser = data.user;
  } catch {
    failed = true;
  }
  if (failed || !authUser || authUser.app_metadata?.role !== "admin") {
    redirect("/admin/login");
  }
}

export default async function PanelLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-solid text-white">
              <Store size={16} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-bold text-brand">{STORE.name}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {STORE.subtitle}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              Ver tienda
            </Link>
            <SignOutButton />
          </div>
        </div>
        <AdminNav />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
