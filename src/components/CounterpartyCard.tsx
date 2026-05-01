import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { NeutralBadge, StatusBadge } from "./ui/StatusBadge";
import type { CounterpartySummary } from "../lib/types";

const ROLE_LABEL: Record<string, string> = {
  funder: "Funder",
  supplier: "Supplier",
};

interface Props {
  cp: CounterpartySummary;
  lastInvoicedAt?: string | null;
}

export function CounterpartyCard({ cp, lastInvoicedAt }: Props) {
  return (
    <Link
      to={`/counterparties/${cp.id}`}
      className="group block bg-white border border-card-border rounded-lg p-6 hover:border-mint transition-colors"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold text-ink truncate">
              {cp.short_name}
            </h3>
            <ChevronRight className="h-4 w-4 text-ink-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150" />
          </div>
          <p className="mt-0.5 text-sm text-ink-muted truncate">{cp.name}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {cp.roles.map((r) => (
              <NeutralBadge key={r}>{ROLE_LABEL[r] ?? r}</NeutralBadge>
            ))}
            <span className="text-xs text-ink-muted">
              · {cp.currency}
            </span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2 text-right">
          <StatusBadge status={cp.status} />
          <span className="text-xs text-ink-muted">
            {lastInvoicedAt ? (
              <>Last invoiced {formatDate(lastInvoicedAt)}</>
            ) : (
              <>No invoices yet</>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}
