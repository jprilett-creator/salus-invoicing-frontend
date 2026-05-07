import {
  useEffect,
  useMemo,
  useState,
  type DragEvent as ReactDragEvent,
  type FormEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import type {
  CounterpartyDetail,
  CounterpartyInvoice,
  HistoricalInvoice,
  HistoricalInvoiceFeeType,
  InvoiceStatus,
} from "../lib/types";
import { Spinner } from "./ui/Spinner";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select } from "./ui/Select";
import { Textarea } from "./ui/Textarea";
import { DropZone } from "./DropZone";
import { useToast } from "./ui/Toaster";
import { formatShortDate } from "../lib/format";
import { cn } from "../lib/cn";

type StatusFilter = "all" | InvoiceStatus | "historical";

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  drafted: "Drafted",
  pushed_to_xero: "Pushed to Xero",
  paid: "Paid",
  disputed: "Disputed",
};

const FEE_TYPE_LABEL: Record<HistoricalInvoiceFeeType, string> = {
  transaction_fee: "Transaction fee",
  insurance_admin: "Insurance admin",
  subscription: "Subscription",
  other: "Other",
};

const HISTORICAL_ACCEPT =
  ".pdf,.xlsx,.xls,.csv,application/pdf," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/vnd.ms-excel,text/csv,application/csv";

interface PlatformRow {
  kind: "platform";
  invoice_number: string;
  invoiced_at: string;
  period: string | null;
  salus_fee: number;
  insurance_fee: number;
  other: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  xero_invoice_id: string | null;
  fee_type_label: string;
}

interface HistoricalRow {
  kind: "historical";
  id: number;
  invoice_number: string;
  invoiced_at: string;
  period: string | null;
  salus_fee: number;
  insurance_fee: number;
  other: number;
  total: number;
  currency: string;
  status: "historical";
  fee_type: HistoricalInvoiceFeeType;
  fee_type_label: string;
  file_filename: string;
  note: string | null;
}

type Row = PlatformRow | HistoricalRow;

function platformToRow(i: CounterpartyInvoice, currency: string): PlatformRow {
  const platformLabels: string[] = [];
  if (i.salus_fee) platformLabels.push("Salus");
  if (i.insurance_fee) platformLabels.push("Insurance");
  if (i.subscription_fee) platformLabels.push("Subscription");
  if (i.other_fees) platformLabels.push("Other");
  return {
    kind: "platform",
    invoice_number: i.invoice_number,
    invoiced_at: i.invoiced_at,
    period: i.period,
    salus_fee: i.salus_fee,
    insurance_fee: i.insurance_fee,
    other: i.subscription_fee + i.other_fees,
    total: i.total,
    currency,
    status: i.status,
    xero_invoice_id: i.xero_invoice_id,
    fee_type_label: platformLabels.join(", ") || "—",
  };
}

function historicalToRow(h: HistoricalInvoice): HistoricalRow {
  // Mirror platform's salus/insurance/other split based on fee_type.
  const isInsurance = h.fee_type === "insurance_admin";
  const isSalus = h.fee_type === "transaction_fee";
  return {
    kind: "historical",
    id: h.id,
    invoice_number: h.invoice_number,
    invoiced_at: h.invoice_date,
    period: null,
    salus_fee: isSalus ? h.total_amount : 0,
    insurance_fee: isInsurance ? h.total_amount : 0,
    other: !isSalus && !isInsurance ? h.total_amount : 0,
    total: h.total_amount,
    currency: h.currency,
    status: "historical",
    fee_type: h.fee_type,
    fee_type_label: FEE_TYPE_LABEL[h.fee_type],
    file_filename: h.file_filename,
    note: h.note,
  };
}

export function InvoicingHistoryTab({ cp }: { cp: CounterpartyDetail }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  const platformQuery = useQuery({
    queryKey: ["counterparty-invoices", cp.id, from, to],
    queryFn: () =>
      api.listCounterpartyInvoices(cp.id, {
        from: from || undefined,
        to: to || undefined,
      }),
  });

  const historicalQuery = useQuery({
    queryKey: ["counterparty-historical-invoices", cp.id],
    queryFn: () => api.listHistoricalInvoices(cp.id),
  });

  const merged = useMemo<Row[]>(() => {
    const platform = (platformQuery.data ?? []).map((i) =>
      platformToRow(i, cp.currency)
    );
    const historical = (historicalQuery.data ?? []).map(historicalToRow);
    // Apply the From / To filter on the historical side too — the platform
    // endpoint already does it server-side.
    const filteredHistorical = historical.filter((h) => {
      if (from && h.invoiced_at < from) return false;
      if (to && h.invoiced_at > to) return false;
      return true;
    });
    return [...platform, ...filteredHistorical].sort((a, b) =>
      a.invoiced_at < b.invoiced_at ? 1 : -1
    );
  }, [platformQuery.data, historicalQuery.data, cp.currency, from, to]);

  const filtered = useMemo(() => {
    if (status === "all") return merged;
    if (status === "historical")
      return merged.filter((r) => r.kind === "historical");
    return merged.filter((r) => r.kind === "platform" && r.status === status);
  }, [merged, status]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        count: acc.count + 1,
        salus: acc.salus + r.salus_fee,
        insurance: acc.insurance + r.insurance_fee,
        other: acc.other + r.other,
        total: acc.total + r.total,
      }),
      { count: 0, salus: 0, insurance: 0, other: 0, total: 0 }
    );
  }, [filtered]);

  const fmt = (n: number, ccy = cp.currency) =>
    `${ccy} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const onExport = () => {
    const headers = [
      "Invoice number",
      "Date",
      "Period",
      "Salus fee",
      "Insurance fee",
      "Other",
      "Total",
      "Currency",
      "Status",
      "Type",
      "Source",
    ];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const row = [
        r.invoice_number,
        formatShortDate(r.invoiced_at),
        r.period ?? "",
        r.salus_fee.toFixed(2),
        r.insurance_fee.toFixed(2),
        r.other.toFixed(2),
        r.total.toFixed(2),
        r.currency,
        r.kind === "platform" ? STATUS_LABEL[r.status] : "Historical",
        r.fee_type_label,
        r.kind === "platform" ? "Platform" : "Historical",
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

  const downloadHistorical = async (row: HistoricalRow) => {
    try {
      const { blob, filename } = await api.downloadHistoricalInvoice(row.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? row.file_filename ?? "invoice";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Download failed", "error");
    }
  };

  const deleteMut = useMutation({
    mutationFn: (hiId: number) => api.deleteHistoricalInvoice(hiId),
    onSuccess: () => {
      toast("Historical invoice deleted.");
      qc.invalidateQueries({
        queryKey: ["counterparty-historical-invoices", cp.id],
      });
    },
    onError: (e) =>
      toast(e instanceof Error ? e.message : "Delete failed", "error"),
  });

  const isLoading = platformQuery.isLoading || historicalQuery.isLoading;
  const loadError = platformQuery.error ?? historicalQuery.error;

  return (
    <div className="space-y-4">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Invoicing history</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setUploadOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Upload historical invoice
        </Button>
      </div>

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
            <option value="historical">Historical</option>
          </Select>
        </div>
        <div className="flex-1" />
        <Button variant="secondary" size="sm" onClick={onExport}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border border-card-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner foreground={false} />
          </div>
        ) : loadError ? (
          <p className="p-6 text-sm text-danger">
            Couldn&apos;t load invoices. {(loadError as Error).message}
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
                  <th className="px-4 py-2 font-medium">Period / Type</th>
                  <th className="px-4 py-2 font-medium text-right">Salus fee</th>
                  <th className="px-4 py-2 font-medium text-right">Insurance</th>
                  <th className="px-4 py-2 font-medium text-right">Other</th>
                  <th className="px-4 py-2 font-medium text-right">Total</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Xero</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isHistorical = r.kind === "historical";
                  return (
                    <tr
                      key={isHistorical ? `h-${r.id}` : `p-${r.invoice_number}`}
                      className={cn(
                        "border-t border-card-border hover:bg-neutral-bg/30",
                        isHistorical && "cursor-pointer"
                      )}
                      onClick={
                        isHistorical
                          ? () => downloadHistorical(r as HistoricalRow)
                          : undefined
                      }
                    >
                      <td className="px-4 py-2 font-medium text-ink whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {r.invoice_number}
                          {isHistorical && <HistoricalBadge />}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-ink-muted whitespace-nowrap">
                        {formatShortDate(r.invoiced_at)}
                      </td>
                      <td className="px-4 py-2 text-ink-muted whitespace-nowrap">
                        {r.kind === "platform"
                          ? (r.period ?? r.fee_type_label)
                          : r.fee_type_label}
                      </td>
                      <td className="px-4 py-2 text-right text-ink whitespace-nowrap">
                        {r.salus_fee ? fmt(r.salus_fee, r.currency) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-ink whitespace-nowrap">
                        {r.insurance_fee ? fmt(r.insurance_fee, r.currency) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-ink whitespace-nowrap">
                        {r.other ? fmt(r.other, r.currency) : "—"}
                      </td>
                      <td className="px-4 py-2 text-right text-ink font-medium whitespace-nowrap">
                        {fmt(r.total, r.currency)}
                      </td>
                      <td className="px-4 py-2">
                        {r.kind === "platform" ? (
                          <StatusPill status={r.status} />
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-card-border bg-neutral-bg text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                            Uploaded
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-2 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.kind === "platform" && (
                          <XeroSyncBadge
                            xeroInvoiceId={r.xero_invoice_id}
                            status={r.status}
                          />
                        )}
                        {/* TODO: wire when backend exposes
                            xero_invoice_status/push_error on
                            /api/counterparties/{id}/invoices — show a Retry
                            button next to the badge for failed pushes. */}
                      </td>
                      <td
                        className="px-4 py-2 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isHistorical && (
                          <button
                            type="button"
                            className="text-ink-muted hover:text-danger p-1 rounded"
                            aria-label="Delete historical invoice"
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete historical invoice ${r.invoice_number}?`
                                )
                              ) {
                                deleteMut.mutate((r as HistoricalRow).id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
          <SubtotalCard label="Other" value={fmt(totals.other)} />
          <SubtotalCard label="Total" value={fmt(totals.total)} highlight />
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          cp={cp}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            qc.invalidateQueries({
              queryKey: ["counterparty-historical-invoices", cp.id],
            });
            setUploadOpen(false);
            toast("Historical invoice uploaded.");
          }}
        />
      )}
    </div>
  );
}

function HistoricalBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-card-border bg-page text-[10px] font-medium uppercase tracking-wide text-ink-muted">
      Historical
    </span>
  );
}

const XERO_VIEW_BASE =
  "https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=";

function XeroSyncBadge({
  xeroInvoiceId,
  status,
}: {
  xeroInvoiceId: string | null;
  status: InvoiceStatus;
}) {
  if (xeroInvoiceId) {
    return (
      <a
        href={`${XERO_VIEW_BASE}${xeroInvoiceId}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-mint bg-mint-dim text-[10px] font-medium uppercase tracking-wide text-mint-deep hover:underline"
      >
        Synced to Xero
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  if (status === "drafted") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-card-border bg-neutral-bg text-[10px] font-medium uppercase tracking-wide text-ink-muted">
        Not synced
      </span>
    );
  }
  return <span className="text-xs text-ink-muted">—</span>;
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

const MAX_BYTES = 10 * 1024 * 1024;

type DetectableField =
  | "invoice_number"
  | "invoice_date"
  | "total_amount"
  | "currency";

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isAcceptableType(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    isPdf(file) ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function UploadModal({
  cp,
  onClose,
  onUploaded,
}: {
  cp: CounterpartyDetail;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState(cp.currency || "USD");
  const [feeType, setFeeType] =
    useState<HistoricalInvoiceFeeType>("transaction_fee");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(
    null
  );
  const [detected, setDetected] = useState<Set<DetectableField>>(new Set());
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const extract = useMutation({
    mutationFn: (pdf: File) => api.extractHistoricalInvoice(pdf),
    onSuccess: (res) => {
      if (!res.extracted) {
        setExtractionMessage(
          "Couldn't auto-read this invoice. Please fill in manually."
        );
        return;
      }
      const f = res.extracted_fields;
      const next = new Set<DetectableField>();
      if (f.invoice_number) {
        setInvoiceNumber(f.invoice_number);
        next.add("invoice_number");
      }
      if (f.invoice_date) {
        setInvoiceDate(f.invoice_date);
        next.add("invoice_date");
      }
      if (f.total_amount != null) {
        setTotalAmount(String(f.total_amount));
        next.add("total_amount");
      }
      if (f.currency) {
        setCurrency(f.currency.toUpperCase());
        next.add("currency");
      }
      setDetected(next);
      if (next.size === 0) {
        setExtractionMessage(
          "Couldn't auto-read this invoice. Please fill in manually."
        );
      }
    },
    onError: () => {
      setExtractionMessage(
        "Couldn't auto-read this invoice. Please fill in manually."
      );
    },
  });

  const accept = (incoming: File) => {
    setDropError(null);
    setExtractionMessage(null);
    if (!isAcceptableType(incoming)) {
      setDropError("PDF, XLSX or CSV only.");
      return;
    }
    if (incoming.size > MAX_BYTES) {
      setDropError("File exceeds 10MB limit.");
      return;
    }
    setFile(incoming);
    setDetected(new Set());
    if (isPdf(incoming)) {
      extract.mutate(incoming);
    }
  };

  const replace = () => {
    setFile(null);
    setDetected(new Set());
    setExtractionMessage(null);
    setDropError(null);
    extract.reset();
  };

  const onDragEnter = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes("Files")) setDragActive(true);
  };

  const onDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  const onDragLeave = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset when actually leaving the modal box, not a child element.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragActive(false);
  };

  const onDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) accept(dropped);
  };

  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Pick a file first.");
      return api.uploadHistoricalInvoice(cp.id, {
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        total_amount: Number.parseFloat(totalAmount),
        currency: currency.trim().toUpperCase(),
        fee_type: feeType,
        note: note.trim() || null,
        file,
      });
    },
    onSuccess: () => onUploaded(),
    onError: (e) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Upload failed";
      setError(msg);
      toast(msg, "error");
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Drop a PDF, XLSX or CSV file.");
      return;
    }
    if (!invoiceNumber.trim()) {
      setError("Invoice number is required.");
      return;
    }
    if (!invoiceDate) {
      setError("Invoice date is required.");
      return;
    }
    const amount = Number.parseFloat(totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a positive total amount.");
      return;
    }
    if (!currency.trim()) {
      setError("Currency is required.");
      return;
    }
    upload.mutate();
  };

  const extracting = extract.isPending;
  const formDisabled = extracting;
  const showForm = file !== null;

  // Drop fields out of "detected" once the user edits them, so the badge
  // doesn't lie about what the field currently holds.
  const editField = (key: DetectableField, setter: () => void) => {
    setter();
    if (detected.has(key)) {
      setDetected((cur) => {
        const next = new Set(cur);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative bg-white border rounded-lg w-full max-w-2xl mx-4 animate-slide-up overflow-hidden transition-colors",
          dragActive
            ? "border-mint ring-2 ring-mint/40"
            : "border-card-border"
        )}
        onClick={(e) => e.stopPropagation()}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="px-6 pt-6 pb-2 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-ink">
              Upload historical invoice
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              For invoices issued outside the platform — for cross-referencing
              alongside platform-issued invoices for {cp.short_name}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1 rounded shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!showForm ? (
          <div className="px-6 pb-6">
            <DropZone
              accept={HISTORICAL_ACCEPT}
              onFile={accept}
              primaryText="Drag PDF here, or click to browse"
              secondaryText="PDF auto-reads invoice number, date, amount, currency. XLSX/CSV upload manually. Max 10MB."
              icon={<Upload className="h-8 w-8" strokeWidth={1.5} />}
              className="py-16"
            />
            {dropError && (
              <p className="mt-3 text-sm text-danger">{dropError}</p>
            )}
            <div className="mt-5 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 pb-6 space-y-5">
            <div className="bg-page border border-card-border rounded-md px-3 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText
                  className="h-4 w-4 text-ink-muted shrink-0"
                  strokeWidth={1.75}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {file!.name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {(file!.size / 1024).toFixed(1)} KB
                    {extracting && (
                      <span className="ml-2 inline-flex items-center gap-1.5 text-ink-muted">
                        <Spinner />
                        Reading invoice…
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={replace}
                className="text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline shrink-0"
              >
                Replace
              </button>
            </div>

            {extractionMessage && (
              <div className="flex items-start gap-2 rounded-md border border-warn/40 bg-warn-bg/40 px-3 py-2 text-xs text-warn-deep">
                <AlertTriangle
                  className="h-3.5 w-3.5 shrink-0 mt-0.5"
                  strokeWidth={2}
                />
                <span>{extractionMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel
                  htmlFor="hi-num"
                  text="Invoice number"
                  detected={detected.has("invoice_number")}
                />
                <Input
                  id="hi-num"
                  value={invoiceNumber}
                  onChange={(e) =>
                    editField("invoice_number", () =>
                      setInvoiceNumber(e.target.value)
                    )
                  }
                  placeholder="INV-1234"
                  required
                  disabled={formDisabled}
                />
              </div>
              <div>
                <FieldLabel
                  htmlFor="hi-date"
                  text="Invoice date"
                  detected={detected.has("invoice_date")}
                />
                <Input
                  id="hi-date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) =>
                    editField("invoice_date", () =>
                      setInvoiceDate(e.target.value)
                    )
                  }
                  required
                  disabled={formDisabled}
                />
              </div>
              <div>
                <FieldLabel
                  htmlFor="hi-total"
                  text="Total amount"
                  detected={detected.has("total_amount")}
                />
                <Input
                  id="hi-total"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={totalAmount}
                  onChange={(e) =>
                    editField("total_amount", () =>
                      setTotalAmount(e.target.value)
                    )
                  }
                  placeholder="0.00"
                  required
                  disabled={formDisabled}
                />
              </div>
              <div>
                <FieldLabel
                  htmlFor="hi-ccy"
                  text="Currency"
                  detected={detected.has("currency")}
                />
                <Select
                  id="hi-ccy"
                  value={currency}
                  onChange={(e) =>
                    editField("currency", () => setCurrency(e.target.value))
                  }
                  disabled={formDisabled}
                >
                  {["USD", "EUR", "GBP", "SGD", "AED"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="hi-type">Type</Label>
                <Select
                  id="hi-type"
                  value={feeType}
                  onChange={(e) =>
                    setFeeType(e.target.value as HistoricalInvoiceFeeType)
                  }
                  disabled={formDisabled}
                >
                  <option value="transaction_fee">Transaction fee</option>
                  <option value="insurance_admin">Insurance admin</option>
                  <option value="subscription">Subscription</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="hi-note">Note (optional)</Label>
                <Textarea
                  id="hi-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Context, e.g. covers Jan–Mar pre-platform period"
                  disabled={formDisabled}
                />
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
              >
                Cancel
              </button>
              <Button
                type="submit"
                loading={upload.isPending}
                disabled={upload.isPending || formDisabled}
              >
                Upload
              </Button>
            </div>
          </form>
        )}

        {dragActive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-mint-dim/80 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2 text-mint-deep">
              <Upload className="h-10 w-10" strokeWidth={1.5} />
              <p className="text-sm font-medium">Drop to upload</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  text,
  detected,
}: {
  htmlFor: string;
  text: string;
  detected: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-1">
      <Label htmlFor={htmlFor} className="!mb-0">
        {text}
      </Label>
      {detected && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-mint-deep">
          <Sparkles className="h-3 w-3" strokeWidth={2} />
          Detected
        </span>
      )}
    </div>
  );
}
