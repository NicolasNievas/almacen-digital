import type { ReactNode } from "react";
import Link from "next/link";
import { Store as StoreIcon } from "lucide-react";
import { STORE } from "@/lib/store";
import ThemeToggle from "@/components/ThemeToggle";

export default function TiendaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-solid text-white">
              <StoreIcon className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold tracking-tight text-brand">{STORE.name}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {STORE.subtitle}
              </span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-brand">{STORE.slogan}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{STORE.name}</span>
            <span className="hidden sm:inline">·</span>
            <span>Pedidos por WhatsApp</span>
            <span className="hidden sm:inline">·</span>
            <span>
              Alias <b>{STORE.alias}</b>
            </span>
            <span className="hidden sm:inline">·</span>
            <span>{STORE.titular}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
