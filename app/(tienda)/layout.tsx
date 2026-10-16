import type { ReactNode } from "react";
import Link from "next/link";
import { Store as StoreIcon } from "lucide-react";
import { STORE } from "@/lib/store";
import ThemeToggle from "@/components/ThemeToggle";

export default function TiendaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-100">
            <StoreIcon className="h-5 w-5 text-green-600" />
            {STORE.name}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-neutral-200 bg-white px-4 py-6 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        Pedidos por WhatsApp · Alias {STORE.alias} · {STORE.titular}
      </footer>
    </div>
  );
}
