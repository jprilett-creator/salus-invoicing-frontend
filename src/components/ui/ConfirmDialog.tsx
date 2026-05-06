import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, busy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="bg-white border border-card-border rounded-lg p-6 w-full max-w-md mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {body && <div className="mt-3 text-sm text-ink-dim">{body}</div>}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <Button
            variant={destructive ? "danger" : "primary"}
            loading={busy}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
