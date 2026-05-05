import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api } from "../lib/api";
import type {
  CounterpartyDetail,
  CounterpartyInvoice,
  InvoiceStatus,
} from "../lib/types";
import { Spinner } from "./ui/Spinner";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select } from "./ui/Select";
import { formatShortDate } from "../lib/format";
import { cn } from "../lib/cn";

type StatusFilter = "all" | InvoiceStatus;

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  drafted: "Drafted",
  pushed_to_xero: "Pushed to Xero",
  paid: "Paid",
  disputed: "Disputed",
};

export function InvoicingHistoryTab({ cp }: { cp: CounterpartyDetail }) {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const q = useQuery({
    queryKey: ["counterparty-invoices", cp.id, from, to],
    queryFn: () =>
      api.listCounterpartyInvoices(cp.id, {
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const filtered = useMemo(() => {
    if (!q.data) return [];
    if (status === "all") return q.data;
    return q.data.filter((i) => i.status === status);
  }, [q.data, status]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, i) => ({
        count: acc.count + 1,
        salus: acc.salus + i.salus_fee,
        insurance: acc.insurance + i.insurance_fee,
        subscription: acc.subscription + i.subscription_fee,
        other: acc.other + i.other_fees,
        total: acc.total + i.total,
      }),
      { count: 0, salus: 0, insurance: 0, subscription: 0, other: 0, total: 0 }
    );
  }, [filtered]);

  const fmt = (n: number) =>
    `${cp.currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const onExport = () => {
    const headers = [
      "Invoice number",
      "Date",
      "Period",
      "Salus fee",
      "Insurance fee",
      "Subscription fee",
      "Other",
      "Total",
      "Currency",
      "Status",
      "Xero ID",
    ];
    const lines = [headers.join(",")];
    for (const i of filtered) {
      const row = [
        i.invoice_number,
        formatShortDate(i.invoiced_at),
        i.period ?? "",
        i.salus_fee.toFixed(2),
        i.insurance_fee.toFixed(2),
        i.subscription_fee.toFixed(2),
        i.other_fees.toFixed(2),
        i.total.toFixed(2),
        cp.currency,
        STATUS_LABEL[i.status],
        i.xero_invoice_id ?? "",
      ].map((c) => csvEscape(String(c)));
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cp.short_name.toLowerCase().replace(/\s+/g, "-")}-invoices.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-card-border rounded-lg p-4 flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor="ih-from">From</Label>
          <Input
            id="ih-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ih-to">To</Label>
          <Input
            id="ih-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ih-status">Status</Label>
          <Select
            id="ih-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All</option>
            <option value="drafted">Drafted</option>
            <option value="pushed_to_xero">Pushed to Xero</option>
            <option value="paid">Paid</option>
            <option value="disputed">Disputed</option>
          </Select>
        </div>
        <div className="flex-1" />
        <Button variant="secondary" size="sm" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-card-border rounded-lg overflow-hidden">
        {q.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner foreground={false} />
          </div>
        ) : q.isError ? (
          <p className="p-6 text-sm text-danger">
            Couldn&apos;t load invoices. {(q.error as Error).message}
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">
            No invoices match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-bg/40">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2 font-medium">Invoice</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Period</th>
                  <th className="px-4 py-2 font-medium text-right">Salus fee</th>
                  <th className="px-4 py-2 font-medium text-right">Insurance</th>
                  <th className="px-4 py-2 font-medium text-right">Other</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr
                    key={i.invoice_number}
                    className="border-t border-card-border hover:bg-neutral-bg/30"
                  >
                    <td className="px-4 py-2 font-medium text-ink whitespace-nowrap">
                      {i.invoice_number}
                    </td>
                    <td className="px-4 py-2 text-ink-muted whitespace-nowrap">
                      {formatShortDate(i.invoiced_at)}
                    </td>
                    <td className="px-4 py-2 text-ink-muted whitespace-nowrap">
                      {i.period ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-ink whitespace-nowrap">
                      {i.salus_fee ? fmt(i.salus_fee) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-ink whitespace-nowrap">
                      {i.insurance_fee ? fmt(i.insurance_fee) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-ink whitespace-nowrap">
                      {i.subscription_fee + i.other_fees
                        ? fmt(i.subscription_fee + i.other_fees)
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-ink font-medium whitespace-nowrap">
                      {fmt(i.total)}
                    </td>
                    <td className="px-4 py-2">
                      <StatusPill status={i.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subtotal cards */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SubtotalCard label="Invoices" value={String(totals.count)} />
          <SubtotalCard label="Salus fees" value={fmt(totals.salus)} />
          <SubtotalCard label="Insurance fees" value={fmt(totals.insurance)} />
          <SubtotalCard
            label="Other"
            value={fmt(totals.subscription + totals.other)}
          />
          <SubtotalCard label="Total" value={fmt(totals.total)} highlight />
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const cfg: Record<InvoiceStatus, string> = {
    drafted: "bg-neutral-bg text-ink-muted border-card-border",
    pushed_to_xero: "bg-mint-dim text-mint-deep border-mint",
    paid: "bg-mint-dim text-mint-deep border-mint",
    disputed: "bg-danger-bg text-danger-deep border-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-wide",
        cfg[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function SubtotalCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        highlight
          ? "bg-mint-dim border-mint"
          : "bg-white border-card-border"
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-base font-semibold",
          highlight ? "text-mint-deep" : "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
