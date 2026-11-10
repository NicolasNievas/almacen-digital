/**
 * Clases compartidas del back-office editorial.
 *
 * Un solo sistema visual para sidebar, páginas, tablas, formularios y
 * modales: canvas del tenant, separadores de 1px, radios de 8px solo en
 * controles y cero sombras. Las cadenas viven acá para que cada módulo no
 * reinvente botones ni campos.
 */

const FOCUS =
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-ink)]";

export const ADMIN_EYEBROW =
  "text-[10px] font-medium uppercase leading-none tracking-[0.22em] text-[var(--admin-faint)]";

export const ADMIN_ACTION_PRIMARY =
  `inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--admin-accent)] px-4 py-2.5 text-[11px] font-medium uppercase leading-none tracking-[0.1em] text-[var(--admin-on-accent)] transition-colors duration-200 hover:bg-[var(--admin-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none ${FOCUS}`;

export const ADMIN_ACTION_GHOST =
  `inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--admin-line-strong)] px-4 py-2.5 text-[11px] font-medium uppercase leading-none tracking-[0.1em] text-[var(--admin-ink)] transition-colors duration-200 hover:border-[var(--admin-ink)] hover:bg-[var(--admin-surface)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none ${FOCUS}`;

export const ADMIN_ACTION_QUIET =
  `inline-flex items-center gap-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-[var(--admin-muted)] transition-colors duration-200 hover:text-[var(--admin-ink)] ${FOCUS}`;

export const ADMIN_ICON_BUTTON =
  `inline-flex h-10 w-10 shrink-0 items-center justify-center text-[var(--admin-muted)] transition-colors duration-200 hover:text-[var(--admin-ink)] disabled:opacity-40 motion-reduce:transition-none ${FOCUS}`;

export const ADMIN_INPUT =
  `w-full appearance-none rounded-none border-0 border-b border-[var(--admin-line-strong)] bg-transparent px-0 py-2 text-sm text-[var(--admin-ink)] outline-none transition-colors duration-200 placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-ink)] motion-reduce:transition-none ${FOCUS}`;

export const ADMIN_INPUT_INLINE =
  `w-full appearance-none rounded-none border-0 border-b border-[var(--admin-line)] bg-transparent px-0 py-1 text-sm text-[var(--admin-ink)] outline-none transition-colors duration-200 placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-ink)] motion-reduce:transition-none ${FOCUS}`;

export const ADMIN_LABEL =
  "block space-y-2 text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-[var(--admin-muted)]";

export const ADMIN_TABLE_HEAD =
  "border-b border-[var(--admin-line)] pb-3 text-left text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--admin-faint)]";

export const ADMIN_ROW =
  "border-b border-[var(--admin-line)] transition-colors duration-200 hover:bg-[var(--admin-surface)] motion-reduce:transition-none";

export const ADMIN_ERROR =
  "border-y border-[var(--admin-line)] py-3 text-sm leading-6 text-[var(--admin-ink)]";

export const ADMIN_LOADING =
  "flex items-center justify-center gap-2 py-24 text-[10px] uppercase tracking-[0.18em] text-[var(--admin-muted)]";

export const ADMIN_EMPTY_TITLE =
  "text-center [font-family:var(--store-font-heading)] text-[24px] font-normal leading-[1.2] text-[var(--admin-ink)]";

export const ADMIN_EMPTY_TEXT = "text-center text-sm leading-6 text-[var(--admin-muted)]";

export const ADMIN_MODAL_OVERLAY =
  "fixed inset-0 z-50 flex justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px]";

export const ADMIN_MODAL_PANEL =
  "my-6 w-full border border-[var(--admin-line)] bg-[var(--admin-canvas)] text-[var(--admin-ink)]";
