import type { ReactNode } from "react";
import Link from "next/link";
import { Store as StoreIcon } from "lucide-react";
import mock from "@/data/products_mock.json";
import type { StoreData } from "@/lib/types";

const { store } = mock as unknown as StoreData;

export default function TiendaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-neutral-50">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-neutral-900">
            <StoreIcon className="h-5 w-5 text-green-600" />
            {store.name}
          </Link>
          <Link href="/admin/login" className="text-sm text-neutral-500 hover:text-neutral-900">
            Panel
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t border-neutral-200 bg-white px-4 py-6 text-center text-xs text-neutral-500">
        Pedidos por WhatsApp · Alias {store.alias} · {store.titular}
      </footer>
    </div>
  );
}
