import { Eye } from "lucide-react";
import { Checkbox } from "./ui/Checkbox";
import { cn } from "../lib/cn";
import type { InvoiceDraft } from "../lib/types";

interface Props {
  draft: InvoiceDraft;
  approved: boolean;
  onToggle: (approved: boolean) => void;
  onPreview?: () => void;
  previewLoading?: boolean;
}

export function InvoiceDraftCard({
  draft,
  approved,
  onToggle,
  onPreview,
  previewLoading,
}: Props) {
  const subscription = draft.subscription;
  const lineCount =
    (subscription ? subscription.line_items.length : 0) + draft.fee_lines.length;

  return (
    <div
      className={cn(
        "bg-white border rounded-lg p-6 transition-colors",
        approved ? "border-mint" : "border-card-border"
      )}
    >
      <header className="flex items-start justify-between gap-6 pb-5 border-b border-card-border">
        <div>
          <h3 className="text-lg font-medium text-ink">
            {draft.counterparty.name}
          </h3>
          <p className="mt-1 text-xs text-ink-muted font-mono tracking-wide">
            {draft.invoice_number}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted uppercase tracking-wide">
            Total
          </p>
          <p className="mt-1 text-xl font-semibold text-ink tabular-nums">
            {formatMoney(draft.total, draft.counterparty.currency)}
          </p>
        </div>
      </header>

      <div className="mt-5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-card-border">
              <th className="py-2 text-left text-xs font-medium text-ink-muted uppercase tracking-wide">
                Description
              </th>
              <th className="py-2 text-right text-xs font-medium text-ink-muted uppercase tracking-wide w-28">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {draft.fee_lines.map((line, idx) => (
              <tr
                key={`fl-${idx}`}
                className="border-b border-card-border last:border-0"
              >
                <td className="py-3 pr-4 text-sm text-ink-dim">
                  <span className="block truncate max-w-md">{line.description}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {line.salus_id} · {line.fee_type}
                  </span>
                </td>
                <td className="py-3 text-right text-sm text-ink-dim tabular-nums">
                  {formatMoney(line.amount, draft.counterparty.currency)}
                </td>
              </tr>
            ))}
            {subscription?.line_items.map((li, idx) => (
              <tr
                key={`sub-${idx}`}
                className="border-b border-card-border last:border-0"
              >
                <td className="py-3 pr-4 text-sm text-ink-dim">
                  {li.description}
                </td>
                <td className="py-3 text-right text-sm text-ink-dim tabular-nums">
                  {formatMoney(li.line_amount, draft.counterparty.currency)}
                </td>
              </tr>
            ))}
            {lineCount === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="py-6 text-sm text-ink-muted text-center"
                >
                  No line items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="mt-5 pt-4 border-t border-card-border flex items-center justify-between gap-4 flex-wrap">
        <Checkbox
          id={`approve-${draft.invoice_number}`}
          checked={approved}
          onChange={(e) => onToggle(e.target.checked)}
          label="Approve this invoice"
        />
        <div className="flex items-center gap-4">
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              disabled={previewLoading}
              className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2} />
              {previewLoading ? "Rendering…" : "Preview proforma"}
            </button>
          )}
          <span className="text-xs text-ink-muted">
            {draft.counterparty.payment_terms_days}-day payment terms ·{" "}
            {draft.counterparty.currency}
          </span>
        </div>
      </footer>
    </div>
  );
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
