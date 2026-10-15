import type { ReactNode } from "react";
import Link from "next/link";
import { ClipboardList, LayoutDashboard, Package, ShoppingCart } from "lucide-react";
import SignOutButton from "@/components/admin/SignOutButton";

const nav = [
  { href: "/admin", label: "Métricas", icon: LayoutDashboard },
  { href: "/admin/stock", label: "Stock", icon: Package },
  { href: "/admin/pos", label: "Punto de venta", icon: ShoppingCart },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
];

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-bold text-neutral-900">Panel · Almacén</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
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
              className="flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-neutral-600 hover:border-green-600 hover:text-neutral-900"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
