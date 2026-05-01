import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../../lib/cn";

type ToastKind = "success" | "error";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToasterContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToasterContext = createContext<ToasterContextValue | undefined>(undefined);

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = ++idRef.current;
      setToasts((current) => [...current, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToasterContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 bg-white border border-card-border rounded-md py-3 pl-3 pr-4 min-w-[280px] max-w-md animate-slide-up"
            )}
            role="status"
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                t.kind === "success" ? "bg-mint" : "bg-danger"
              )}
            />
            <span className="text-sm text-ink-dim">{t.message}</span>
          </div>
        ))}
      </div>
    </ToasterContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToasterContext);
  if (!ctx) throw new Error("useToast must be inside ToasterProvider");
  return ctx;
}
