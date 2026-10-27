import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Store as StoreIcon } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { BUSINESS_TYPE_LABELS } from "@/lib/store-settings";
import { getStoreBySlug } from "@/lib/supabase/stores";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const { settings } = store;

  return (
    <div className="flex flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-solid text-white transition-colors hover:bg-brand-accent"
              aria-label="Volver a Nexo"
              title="Volver a Nexo"
            >
              <StoreIcon className="h-5 w-5" />
            </Link>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-lg font-extrabold tracking-tight text-brand">{store.name}</p>
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {store.subtitle || BUSINESS_TYPE_LABELS[settings.business_type]}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] font-semibold text-neutral-600 sm:inline dark:border-neutral-700 dark:text-neutral-300">
              {BUSINESS_TYPE_LABELS[settings.business_type]}
            </span>
            {store.whatsapp && (
              <a
                href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 sm:flex"
              >
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-7 text-center">
          <p className="text-sm font-semibold text-brand">{store.slogan}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{store.name}</span>
            {store.alias && (
              <>
                <span className="hidden sm:inline">·</span>
                <span>
                  Alias <b>{store.alias}</b>
                </span>
              </>
            )}
            {store.titular && (
              <>
                <span className="hidden sm:inline">·</span>
                <span>{store.titular}</span>
              </>
            )}
            <span className="hidden sm:inline">·</span>
            <span>
              {settings.fulfillment.pickup_enabled ? "Retiro en local" : "Delivery"}
              {settings.fulfillment.shipping_enabled && settings.fulfillment.pickup_enabled ? " + envío" : ""}
            </span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-brand dark:text-neutral-400"
          >
            <ArrowLeft size={12} /> Volver a Nexo Commerce
          </Link>
        </div>
      </footer>
    </div>
  );
}
