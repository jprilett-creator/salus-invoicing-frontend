import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { GenerateAllDueResponse, SubscriptionPeriod } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useToast } from "../components/ui/Toaster";
import { PdfPreviewModal } from "../components/PdfPreviewModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { formatShortDate, formatUsd } from "../lib/format";
import { cn } from "../lib/cn";

const XERO_VIEW_BASE =
  "https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=";

export function SubscriptionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Proforma preview modal state for a single Due row.
  const [proforma, setProforma] = useState<{
    row: SubscriptionPeriod;
    blob: Blob | null;
    loading: boolean;
    error: string | null;
    syncing: boolean;
  } | null>(null);

  // View-pushed modal state.
  const [viewing, setViewing] = useState<SubscriptionPeriod | null>(null);

  const dueQuery = useQuery({
    queryKey: ["subscriptions-due"],
    queryFn: () => api.subscriptionsDue(),
  });

  const rows = dueQuery.data ?? [];
  const dueRows = useMemo(() => rows.filter((r) => r.status === "due"), [rows]);

  const openProforma = async (row: SubscriptionPeriod) => {
    setProforma({
      row,
      blob: null,
      loading: true,
      error: null,
      syncing: false,
    });
    try {
      const blob = await api.generateSubscriptionProforma(
        row.counterparty_id,
        row.period_start
      );
      setProforma((p) => (p && p.row === row ? { ...p, blob, loading: false } : p));
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't generate proforma";
      setProforma((p) =>
        p && p.row === row ? { ...p, error: msg, loading: false } : p
      );
    }
  };

  const approveProforma = async () => {
    if (!proforma) return;
    setProforma((p) => (p ? { ...p, syncing: true } : p));
    try {
      const result = await api.generateSubscriptionDraft(
        proforma.row.counterparty_id,
        proforma.row.period_start
      );
      if (result.status === "draft_created") {
        toast(`Draft generated for ${result.invoice_number}`);
      } else if (result.status === "pushed_to_xero") {
        toast(`Pushed to Xero as DRAFT (${result.invoice_number})`);
      } else if (result.status === "skipped") {
        toast(result.detail ?? "Already drafted", "error");
      } else {
        toast(result.detail ?? "Sync failed", "error");
      }
      qc.invalidateQueries({ queryKey: ["subscriptions-due"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setProforma(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sync failed", "error");
      setProforma((p) => (p ? { ...p, syncing: false } : p));
    }
  };

  const generateAll = useMutation({
    mutationFn: () =>
      api.generateAllDueSubscriptions(
        dueRows.map((r) => ({
          counterparty_id: r.counterparty_id,
          period_start: r.period_start,
        }))
      ),
    onSuccess: (data: GenerateAllDueResponse) => {
      const drafted = data.results.filter((r) => r.status === "draft_created").length;
      const pushed = data.results.filter((r) => r.status === "pushed_to_xero").length;
      const failed = data.results.filter((r) => r.status === "failed").length;
      const summary = data.xero_configured
        ? `Generated ${pushed + drafted} drafts, pushed to Xero`
        : `Generated drafts in local ledger; Xero push pending`;
      if (failed > 0) {
        toast(`${summary} (${failed} failed)`, "error");
      } else {
        toast(summary);
      }
      qc.invalidateQueries({ queryKey: ["subscriptions-due"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast(e.message, "error"),
    onSettled: () => {
      setBulkBusy(false);
      setBulkConfirmOpen(false);
    },
  });

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring fee invoices for fund subscriptions."
      />

      <div className="px-10 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">
            {dueRows.length === 0
              ? "Nothing due right now."
              : `${dueRows.length} subscription${dueRows.length === 1 ? "" : "s"} due, totalling ${formatUsd(
                  dueRows.reduce((s, r) => s + r.amount_usd, 0)
                )}.`}
          </p>
          <Button
            disabled={dueRows.length === 0 || bulkBusy}
            loading={bulkBusy}
            onClick={() => setBulkConfirmOpen(true)}
          >
            Generate &amp; push all ({dueRows.length})
          </Button>
        </div>

        {dueQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner foreground={false} />
          </div>
        ) : dueQuery.isError ? (
          <div className="bg-white border border-card-border rounded-lg p-6">
            <p className="text-sm text-danger">
              Couldn&apos;t load subscriptions. {(dueQuery.error as Error).message}
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-card-border rounded-lg p-10 text-center">
            <p className="text-sm text-ink-muted">No subscription periods configured.</p>
          </div>
        ) : (
          <div className="bg-white border border-card-border rounded-lg overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_1.4fr_1fr_1fr_0.9fr_1fr] gap-4 px-5 py-3 border-b border-card-border bg-page text-[10px] font-medium uppercase tracking-wider text-ink-muted">
              <span>Counterparty</span>
              <span>Period</span>
              <span className="text-right">Amount</span>
              <span>Due date</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>
            <ul className="divide-y divide-card-border">
              {rows.map((row) => {
                const id = `${row.counterparty_id}:${row.period_start}`;
                return (
                  <li
                    key={id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1.4fr_1fr_1fr_0.9fr_1fr] gap-4 items-center px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">
                        {row.counterparty_short_name}
                      </div>
                      <div className="mt-0.5 text-xs text-ink-muted truncate">
                        {row.counterparty_legal_name}
                      </div>
                    </div>
                    <div className="text-sm text-ink">{row.period_label}</div>
                    <div className="text-sm text-ink text-right tabular-nums">
                      {formatUsd(row.amount_usd)}
                    </div>
                    <div className="text-sm text-ink-muted">{formatShortDate(row.due_date)}</div>
                    <div>
                      <SubscriptionStatusBadge status={row.status} />
                    </div>
                    <div className="text-right">
                      {row.status === "due" ? (
                        <Button
                          size="sm"
                          disabled={bulkBusy}
                          onClick={() => openProforma(row)}
                        >
                          Generate proforma
                        </Button>
                      ) : row.status === "draft_created" ? (
                        <span className="text-xs text-ink-muted">Already drafted</span>
                      ) : row.status === "pushed_to_xero" ? (
                        <button
                          type="button"
                          className="text-xs text-mint-deep hover:underline"
                          onClick={() => setViewing(row)}
                        >
                          View invoice
                        </button>
                      ) : (
                        <span className="text-xs text-ink-muted">Paid</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {proforma && (
        <PdfPreviewModal
          title={`Proforma — ${proforma.row.counterparty_short_name}`}
          subtitle={`${proforma.row.period_label} · ${formatUsd(
            proforma.row.amount_usd
          )}`}
          blob={proforma.blob}
          loading={proforma.loading}
          error={proforma.error}
          onClose={() => {
            if (!proforma.syncing) setProforma(null);
          }}
          footer={
            <>
              <button
                type="button"
                className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
                onClick={() => setProforma(null)}
                disabled={proforma.syncing}
              >
                Cancel
              </button>
              <Button
                onClick={approveProforma}
                loading={proforma.syncing}
                disabled={proforma.loading || !!proforma.error || proforma.syncing}
              >
                Approve &amp; sync to Xero
              </Button>
            </>
          }
        />
      )}

      {viewing && (
        <PushedInvoiceModal
          row={viewing}
          onClose={() => setViewing(null)}
        />
      )}

      {bulkConfirmOpen && (
        <ConfirmDialog
          title={`Generate & push all ${dueRows.length}?`}
          body={
            <p>
              This will skip per-invoice preview and push every due
              subscription straight to Xero as a draft. Are you sure?
            </p>
          }
          confirmLabel="Generate & push"
          busy={bulkBusy}
          onCancel={() => setBulkConfirmOpen(false)}
          onConfirm={() => {
            setBulkBusy(true);
            generateAll.mutate();
          }}
        />
      )}
    </>
  );
}

function PushedInvoiceModal({
  row,
  onClose,
}: {
  row: SubscriptionPeriod;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await api.generateSubscriptionProforma(
        row.counterparty_id,
        row.period_start
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = row.counterparty_short_name.toLowerCase().replace(/\s+/g, "-");
      a.download = `${slug}-${row.period_start}-subscription.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Download failed", "error");
    } finally {
      setDownloading(false);
    }
  };

  const xeroUrl = row.xero_invoice_id
    ? `${XERO_VIEW_BASE}${row.xero_invoice_id}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-card-border rounded-lg p-6 w-full max-w-md mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-ink">
          {row.counterparty_short_name}
        </h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          {row.counterparty_legal_name}
        </p>

        <dl className="mt-5 grid grid-cols-[7rem_1fr] gap-y-3 text-sm">
          <dt className="text-xs uppercase tracking-wide text-ink-muted">
            Invoice
          </dt>
          <dd className="text-ink font-mono">
            {row.draft_invoice_id ?? "—"}
          </dd>

          <dt className="text-xs uppercase tracking-wide text-ink-muted">
            Total
          </dt>
          <dd className="text-ink tabular-nums">
            {formatUsd(row.amount_usd)}
          </dd>

          <dt className="text-xs uppercase tracking-wide text-ink-muted">
            Period
          </dt>
          <dd className="text-ink">{row.period_label}</dd>

          <dt className="text-xs uppercase tracking-wide text-ink-muted">
            Status
          </dt>
          <dd>
            <SubscriptionStatusBadge status={row.status} />
          </dd>

          <dt className="text-xs uppercase tracking-wide text-ink-muted">
            Xero ID
          </dt>
          <dd className="text-ink-dim font-mono text-xs break-all">
            {row.xero_invoice_id ?? "—"}
          </dd>
        </dl>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            loading={downloading}
            onClick={downloadPdf}
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </Button>
          {xeroUrl ? (
            <a
              href={xeroUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-mint text-white hover:bg-mint-hover"
            >
              Open in Xero <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="text-xs text-ink-muted">No Xero link yet</span>
          )}
        </div>

        <button
          type="button"
          className="mt-4 text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function SubscriptionStatusBadge({ status }: { status: SubscriptionPeriod["status"] }) {
  const styles: Record<SubscriptionPeriod["status"], string> = {
    due: "bg-mint-dim text-mint-deep",
    draft_created: "bg-warn-bg text-warn-deep",
    pushed_to_xero: "bg-neutral-bg text-neutral-deep",
    paid: "bg-mint-dim text-mint-deep",
  };
  const labels: Record<SubscriptionPeriod["status"], string> = {
    due: "Due",
    draft_created: "Draft",
    pushed_to_xero: "Pushed",
    paid: "Paid",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}
