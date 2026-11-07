import type { ReactNode } from "react";
import type { Store } from "@/lib/types";
import { designToCssVars } from "@/lib/store-design";
import { storeFontClassName } from "@/lib/store-fonts";

type Props = {
  store: Store;
  className?: string;
  children: ReactNode;
};

/**
 * Scope visual de un tenant.
 *
 * Es un Server Component: el `style` con las CSS variables y las clases
 * de `next/font` se serializan en el HTML inicial. No hay hidratación ni
 * efecto de cliente que aplique el tema después del primer paint.
 */
export default function StoreThemeScope({ store, className, children }: Props) {
  const { design } = store.settings;

  return (
    <div
      data-store={store.slug}
      data-storefront-layout={design.storefront_layout}
      data-admin-layout={design.admin_layout}
      className={[storeFontClassName(design), className].filter(Boolean).join(" ")}
      style={designToCssVars(design)}
    >
      {children}
    </div>
  );
}
