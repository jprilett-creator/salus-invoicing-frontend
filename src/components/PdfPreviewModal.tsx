import { useEffect, useMemo, type ReactNode } from "react";
import { X } from "lucide-react";
import { Spinner } from "./ui/Spinner";

interface Props {
  title: string;
  subtitle?: string;
  blob: Blob | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  footer: ReactNode;
}

export function PdfPreviewModal({
  title,
  subtitle,
  blob,
  loading,
  error,
  onClose,
  footer,
}: Props) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-card-border rounded-lg w-full max-w-4xl mx-4 flex flex-col animate-slide-up"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 p-5 border-b border-card-border">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ink truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-ink-muted truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1 rounded shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 bg-page">
          {loading ? (
            <div className="h-[60vh] flex items-center justify-center gap-3 text-sm text-ink-muted">
              <Spinner foreground={false} />
              Generating proforma…
            </div>
          ) : error ? (
            <div className="h-[60vh] flex items-center justify-center px-6">
              <p className="text-sm text-danger">{error}</p>
            </div>
          ) : url ? (
            <iframe
              title={title}
              src={url}
              className="w-full"
              style={{ height: "60vh", border: 0 }}
            />
          ) : null}
        </div>

        <footer className="p-4 border-t border-card-border flex items-center justify-end gap-3 bg-white rounded-b-lg">
          {footer}
        </footer>
      </div>
    </div>
  );
}
