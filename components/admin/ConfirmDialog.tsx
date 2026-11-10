"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  ADMIN_ACTION_GHOST,
  ADMIN_EYEBROW,
  ADMIN_MODAL_OVERLAY,
} from "@/lib/admin-ui";

type Props = {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, onCancel]);

  return (
    <div
      className={`${ADMIN_MODAL_OVERLAY} items-center`}
      role="dialog"
      aria-modal="true"
      onClick={() => !loading && onCancel()}
    >
      <div
        className="w-full max-w-sm border border-[var(--admin-line)] bg-[var(--admin-canvas)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4 px-6 py-6">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={18}
              strokeWidth={1.5}
              className="mt-0.5 shrink-0 text-[var(--admin-danger)]"
            />
            <div className="space-y-2">
              <p className={ADMIN_EYEBROW}>Confirmación</p>
              <h2 data-display className="[font-family:var(--admin-display-font)] text-[22px] font-normal leading-[1.15] text-[var(--admin-ink)]">
                {title}
              </h2>
              <div className="text-[13px] leading-6 text-[var(--admin-muted)]">{message}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--admin-line)] px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={loading} className={ADMIN_ACTION_GHOST}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--admin-danger)] px-4 py-2.5 text-[11px] font-medium uppercase leading-none tracking-[0.1em] text-[var(--admin-on-danger)] transition-colors duration-200 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-danger)]"
          >
            {loading && <Loader2 size={13} strokeWidth={1.5} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
