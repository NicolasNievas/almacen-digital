import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

/**
 * Cabecera editorial de cada módulo del back-office: etiqueta breve,
 * título en Playfair y acciones alineadas a la base. El separador inferior
 * es la única frontera entre cabecera y datos.
 */
export default function AdminPageHeader({ eyebrow = "Administración", title, description, actions }: Props) {
  return (
    <header className="flex flex-col gap-6 border-b border-[var(--admin-line)] pb-7 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="text-[10px] font-medium uppercase leading-none tracking-[0.24em] text-[var(--admin-faint)]">
          {eyebrow}
        </p>
        <h1 data-display className="mt-3 text-[clamp(28px,3.2vw,42px)] font-normal leading-[1.08] tracking-[-0.01em] text-[var(--admin-ink)]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--admin-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
