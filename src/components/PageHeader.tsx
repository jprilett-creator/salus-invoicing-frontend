import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../lib/cn";

interface Tab {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}

interface Props {
  title: string;
  subtitle?: string;
  backTo?: { to: string; label: string };
  tabs?: Tab[];
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, backTo, tabs, right }: Props) {
  return (
    <header
      className="border-b border-card-border"
      style={{
        background:
          "linear-gradient(to right, #E8F9F0 0%, #F4FBE8 55%, #FAFAFA 100%)",
      }}
    >
      <div className="px-10 pt-8 pb-0">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            {backTo && (
              <Link
                to={backTo.to}
                className="inline-block mb-2 text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline"
              >
                ← {backTo.label}
              </Link>
            )}
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-ink-muted max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>

        {tabs && tabs.length > 0 ? (
          <nav className="mt-6 flex items-center gap-6 -mb-px">
            {tabs.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={t.onClick}
                className={cn(
                  "pb-3 text-sm border-b-2 transition-colors whitespace-nowrap",
                  t.active
                    ? "border-ink text-ink font-medium"
                    : "border-transparent text-ink-muted hover:text-ink"
                )}
              >
                {typeof t.count === "number" && (
                  <span className="mr-1 text-ink-muted">{t.count}</span>
                )}
                {t.label}
              </button>
            ))}
          </nav>
        ) : (
          <div className="h-8" />
        )}
      </div>
    </header>
  );
}
