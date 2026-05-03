import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { GenerateAllDueResponse, SubscriptionPeriod } from "../lib/types";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useToast } from "../components/ui/Toaster";
import { formatShortDate, formatUsd } from "../lib/format";
import { cn } from "../lib/cn";

export function SubscriptionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const dueQuery = useQuery({
    queryKey: ["subscriptions-due"],
    queryFn: () => api.subscriptionsDue(),
  });

  const rows = dueQuery.data ?? [];
  const dueRows = useMemo(() => rows.filter((r) => r.status === "due"), [rows]);

  const generateOne = useMutation({
    mutationFn: ({ counterparty_id, period_start }: { counterparty_id: number; period_start: string }) =>
      api.generateSubscriptionDraft(counterparty_id, period_start),
    onSuccess: (data) => {
      if (data.status === "draft_created") {
        toast(
          data.detail
            ? `Draft generated. ${data.detail}`
            : `Draft generated for ${data.invoice_number}`
        );
      } else if (data.status === "pushed_to_xero") {
        toast(`Pushed to Xero as DRAFT (${data.invoice_number})`);
      } else if (data.status === "skipped") {
        toast(data.detail ?? "Already drafted", "error");
      } else {
        toast(data.detail ?? "Generation failed", "error");
      }
      qc.invalidateQueries({ queryKey: ["subscriptions-due"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast(e.message, "error"),
    onSettled: () => setBusyId(null),
  });

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
    onSettled: () => setBulkBusy(false),
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
            onClick={() => {
              setBulkBusy(true);
              generateAll.mutate();
            }}
          >
            Generate all due ({dueRows.length})
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
                const isBusy = busyId === id;
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
                          loading={isBusy}
                          disabled={isBusy || bulkBusy}
                          onClick={() => {
                            setBusyId(id);
                            generateOne.mutate({
                              counterparty_id: row.counterparty_id,
                              period_start: row.period_start,
                            });
                          }}
                        >
                          Generate draft
                        </Button>
                      ) : row.status === "draft_created" ? (
                        <span className="text-xs text-ink-muted">Already drafted</span>
                      ) : row.status === "pushed_to_xero" ? (
                        <span className="text-xs text-ink-muted">View invoice</span>
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
    </>
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
