"use client";

import { Moon, Sun } from "lucide-react";
import { applyTheme, useTheme, type Theme } from "@/lib/theme";

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

/**
 * Selector segmentado de tema para el pie de la sidebar.
 *
 * A diferencia del icono suelto, muestra ambos estados siempre visibles y
 * el activo con contraste pleno: el control no depende de un tooltip para
 * entenderse. La lógica vive en `applyTheme`.
 */
export default function ThemeSwitch() {
  const theme = useTheme();

  return (
    <div
      role="group"
      aria-label="Tema de la interfaz"
      className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--admin-line)] p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => applyTheme(value)}
            aria-pressed={active}
            className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-medium uppercase leading-none tracking-[0.12em] transition-colors duration-200 motion-reduce:transition-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-[var(--admin-ink)] ${
              active
                ? "bg-[var(--admin-ink)] text-[var(--admin-canvas)]"
                : "text-[var(--admin-muted)] hover:bg-[var(--admin-surface)] hover:text-[var(--admin-ink)]"
            }`}
          >
            <Icon size={12} strokeWidth={1.6} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
