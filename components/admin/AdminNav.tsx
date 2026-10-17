"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, Package, ShoppingCart, Tags } from "lucide-react";

const nav = [
  { href: "/admin", label: "Métricas", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Tags },
  { href: "/admin/stock", label: "Stock", icon: Package },
  { href: "/admin/pos", label: "Punto de venta", icon: ShoppingCart },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
      {nav.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-brand-solid font-semibold text-brand"
                : "border-transparent font-medium text-neutral-600 hover:border-brand hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
