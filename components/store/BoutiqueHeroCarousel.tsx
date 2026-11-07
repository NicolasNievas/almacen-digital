import type { Store } from "@/lib/types";

type Props = {
  store: Store;
};

/**
 * Estructura del carrusel editorial del storefront boutique.
 *
 * Por ahora es un placeholder: ocupa el primer viewport (60vh) con el
 * neutro `--store-surface` para que la composición final se apoye en una
 * fotografía 3:4 sin tocar el resto de la página.
 */
export default function BoutiqueHeroCarousel({ store }: Props) {
  return (
    <section
      aria-label={`Carrusel de colección de ${store.name}`}
      className="relative w-full bg-[var(--store-surface)]"
    >
      <div className="flex h-[60vh] min-h-[360px] flex-col items-center justify-center gap-8 px-6 text-center md:min-h-[480px]">
        <span className="[font-family:var(--store-font-body)] text-[11px] font-medium uppercase leading-none tracking-[0.22em] text-[var(--store-ink-muted)]">
          Nueva colección
        </span>

        <p className="max-w-[18ch] [font-family:var(--store-font-heading)] text-[clamp(2rem,6vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.02em] text-[var(--store-ink)]">
          Placeholder de Carrusel
        </p>

        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="h-px w-10 bg-[var(--store-ink)]" />
          <span className="h-px w-10 bg-[var(--store-divider)]" />
          <span className="h-px w-10 bg-[var(--store-divider)]" />
        </div>
      </div>
    </section>
  );
}
