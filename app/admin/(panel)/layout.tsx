import type { ReactNode } from "react";
import Link from "next/link";
import { ClipboardList, LayoutDashboard, Package, ShoppingCart, Store, Tags } from "lucide-react";
import SignOutButton from "@/components/admin/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import { STORE } from "@/lib/store";

const nav = [
  { href: "/admin", label: "Métricas", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Tags },
  { href: "/admin/stock", label: "Stock", icon: Package },
  { href: "/admin/pos", label: "Punto de venta", icon: ShoppingCart },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
];

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 font-bold text-brand">
            <Store size={18} /> Panel · {STORE.name}
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
              Ver tienda
            </Link>
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-600 hover:border-brand hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
