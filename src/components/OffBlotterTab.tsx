import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import type {
  CounterpartyDetail,
  InsuranceCertExtraction,
  OffBlotterExtractResponse,
  OffBlotterLine,
  OffBlotterStatus,
} from "../lib/types";
import { DropZone } from "./DropZone";
import { Button } from "./ui/Button";
import { Spinner } from "./ui/Spinner";
import { useToast } from "./ui/Toaster";
import { formatShortDate } from "../lib/format";
import { cn } from "../lib/cn";

type Stage = "idle" | "extracting" | "preview" | "saving" | "error";

const apiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://salus-invoicing.onrender.com";

export function OffBlotterTab({ cp }: { cp: CounterpartyDetail }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const linesQuery = useQuery({
    queryKey: ["off-blotter", cp.id],
    queryFn: () => api.listOffBlotterLines(cp.id),
  });

  const [stage, setStage] = useState<Stage>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extraction, setExtraction] =
    useState<OffBlotterExtractResponse | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["off-blotter", cp.id] });

  const handleDrop = async (file: File) => {
    setPdfFile(file);
    setStage("extracting");
    setErrMsg(null);
    try {
      const res = await api.extractOffBlotterCert(file);
      setExtraction(res);
      setStage(res.extracted ? "preview" : "error");
      if (!res.extracted) {
        setErrMsg(res.error ?? "Extraction unavailable.");
      }
    } catch (e) {
      setStage("error");
      setErrMsg(e instanceof Error ? e.message : "Extraction failed.");
    }
  };

  const reset = () => {
    setPdfFile(null);
    setExtraction(null);
    setStage("idle");
    setErrMsg(null);
  };

  const saveLine = useMutation({
    mutationFn: async (counterpartyId: number) => {
      if (!extraction) throw new Error("No extraction in flight");
      const f = extraction.extracted_fields;
      const inception = f.inception_date ?? f.certificate_date;
      if (!inception) throw new Error("Missing inception_date / certificate_date");
      if (f.insured_value_amount == null || !f.insured_value_currency)
        throw new Error("Missing insured value or currency");
      return api.createOffBlotterLine({
        counterparty_id: counterpartyId,
        inception_date: inception,
        insured_value_amount: f.insured_value_amount,
        insured_value_currency: f.insured_value_currency,
        certificate_number: f.certificate_number,
        buyer_reference: f.buyer_legal_name,
        commodity: f.commodity,
        quantity_text: f.quantity,
        po_reference: f.po_reference,
        referenced_supplier_invoice: f.referenced_supplier_invoice,
        cert_extraction_json: JSON.stringify(f),
        pdf: pdfFile,
      });
    },
    onSuccess: () => {
      toast("Off-blotter line saved.");
      reset();
      refresh();
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError ? e.message :
        e instanceof Error ? e.message : "Save failed.";
      setErrMsg(msg);
      setStage("error");
    },
  });

  const isSupplier = cp.roles.includes("supplier");
  if (!isSupplier) {
    return (
      <div className="bg-white border border-card-border rounded-lg p-10 text-center">
        <p className="text-sm text-ink-muted">
          Off-blotter / insurance certificates are tracked on supplier
          counterparties only. Add the &quot;supplier&quot; role to enable this tab.
        </p>
      </div>
    );
  }

  const lines = linesQuery.data ?? [];
  const active = lines.filter((l) => l.status === "active");
  const history = lines.filter((l) => l.status !== "active");

  return (
    <div className="space-y-6">
      {/* Drop zone / extraction preview */}
      <section className="bg-white border border-card-border rounded-lg p-6">
        {stage === "idle" && (
          <DropZone
            accept="application/pdf"
            onFile={handleDrop}
            primaryText="Drop insurance certificate here"
            secondaryText="Salus will extract the cargo, value, and parties, and create an off-blotter line attributed to this supplier."
          />
        )}
        {stage === "extracting" && (
          <div className="flex items-center gap-3 py-6">
            <Spinner />
            <span className="text-sm text-ink-dim">
              Reading certificate<span className="text-ink-muted">…</span>
            </span>
          </div>
        )}
        {stage === "preview" && extraction && (
          <ExtractionPreview
            cp={cp}
            extraction={extraction}
            pdfFilename={pdfFile?.name}
            saving={saveLine.isPending}
            onCancel={reset}
            onSave={(targetCpId) => saveLine.mutate(targetCpId)}
          />
        )}
        {stage === "error" && (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <AlertTriangle className="h-5 w-5 text-warn shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-warn-deep">
                  Couldn&apos;t process the certificate.
                </p>
                {errMsg && (
                  <p className="mt-0.5 text-xs text-ink-muted">{errMsg}</p>
                )}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={reset}>
              Try again
            </Button>
          </div>
        )}
      </section>

      {/* Active lines */}
      <section>
        <h2 className="text-base font-semibold text-ink mb-3">Active lines</h2>
        {linesQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading lines…
          </div>
        ) : active.length === 0 ? (
          <div className="bg-white border border-card-border rounded-lg p-6 text-sm text-ink-muted">
            No active off-blotter lines for this supplier yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {active.map((line) => (
              <ActiveLineCard
                key={line.id}
                line={line}
                onChanged={refresh}
              />
            ))}
          </ul>
        )}
      </section>

      {/* History */}
      {history.length > 0 && <HistorySection lines={history} />}
    </div>
  );
}

function ExtractionPreview({
  cp,
  extraction,
  pdfFilename,
  saving,
  onCancel,
  onSave,
}: {
  cp: CounterpartyDetail;
  extraction: OffBlotterExtractResponse;
  pdfFilename?: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (counterpartyId: number) => void;
}) {
  const f = extraction.extracted_fields;
  const candidates = extraction.match.candidates;
  // Pre-select: this counterparty if it's in candidates, otherwise the first candidate.
  const initial =
    candidates.find((c) => c.id === cp.id)?.id ??
    candidates[0]?.id ??
    cp.id;
  const [targetId, setTargetId] = useState<number>(initial);

  const supplierMatchesThis =
    !!candidates.find((c) => c.id === cp.id) ||
    (extraction.match.suggested_action === "create_new" && targetId === cp.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircle2 className="h-5 w-5 text-mint shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">
              {pdfFilename ?? "Certificate"}
            </p>
            <p className="text-xs text-ink-muted">
              Extracted — review the fields below before saving.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline"
        >
          Replace
        </button>
      </div>

      {/* Field grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <Field label="Certificate #" value={f.certificate_number} />
        <Field label="Certificate date" value={f.certificate_date} />
        <Field label="Inception date" value={f.inception_date ?? f.certificate_date} />
        <Field label="Insurer" value={f.insurer} />
        <Field label="Broker" value={f.broker} />
        <Field label="Type of insurance" value={f.type_of_insurance} />
        <Field label="Supplier (legal name)" value={f.supplier_legal_name} />
        <Field label="Buyer (reference)" value={f.buyer_legal_name} />
        <Field label="Commodity" value={f.commodity} />
        <Field label="Quantity" value={f.quantity} />
        <Field
          label="Insured value"
          value={
            f.insured_value_amount != null && f.insured_value_currency
              ? `${f.insured_value_currency} ${f.insured_value_amount.toLocaleString()}`
              : null
          }
        />
        <Field label="Vessel / carrier" value={f.vessel_or_carrier} />
        <Field label="Loading port" value={f.port_of_loading} />
        <Field label="Discharge port" value={f.port_of_discharge} />
        <Field label="Incoterm" value={f.incoterm} />
        <Field label="PO ref" value={f.po_reference} />
        <Field label="Linked supplier invoice" value={f.referenced_supplier_invoice} />
        <Field label="Loss payee" value={f.loss_payee} />
        <Field label="Additional insured" value={f.additional_insured} />
      </div>

      {/* Counterparty match */}
      <div className="rounded-md border border-card-border bg-neutral-bg/40 p-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted mb-2">
          Save under supplier
        </p>
        {candidates.length === 0 ? (
          <p className="text-sm text-ink">
            No supplier match found for &quot;{f.supplier_legal_name ?? "—"}&quot;.
            Saving against this counterparty (
            <span className="font-medium">{cp.short_name}</span>).
          </p>
        ) : candidates.length === 1 ? (
          <p className="text-sm text-ink">
            Match: <span className="font-medium">{candidates[0].short_name}</span>{" "}
            <span className="text-ink-muted">({candidates[0].name})</span>
          </p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm text-ink">
              Multiple supplier candidates — pick one:
            </p>
            {candidates.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 text-sm text-ink"
              >
                <input
                  type="radio"
                  name="ob-target"
                  checked={targetId === c.id}
                  onChange={() => setTargetId(c.id)}
                />
                <span className="font-medium">{c.short_name}</span>
                <span className="text-ink-muted">({c.name})</span>
              </label>
            ))}
          </div>
        )}
        {!supplierMatchesThis && candidates.length === 0 && (
          <p className="mt-2 text-xs text-warn-deep">
            The supplier on the cert may not match this counterparty
            (&quot;{cp.short_name}&quot;). Saving anyway will attribute this
            line to {cp.short_name}.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
        >
          Cancel
        </button>
        <Button
          type="button"
          loading={saving}
          disabled={saving}
          onClick={() => onSave(targetId)}
        >
          Save off-blotter line
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  const isPresent = value !== null && value !== undefined && value !== "";
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 items-baseline">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-ink-muted">
        {isPresent ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-mint" strokeWidth={2.5} />
        ) : (
          <span className="h-3.5 w-3.5 inline-flex items-center justify-center text-ink-muted">
            —
          </span>
        )}
        {label}
      </div>
      <div
        className={cn(
          "text-sm truncate",
          isPresent ? "text-ink" : "text-ink-muted"
        )}
      >
        {isPresent ? String(value) : "missing"}
      </div>
    </div>
  );
}

function ActiveLineCard({
  line,
  onChanged,
}: {
  line: OffBlotterLine;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFundedPicker, setShowFundedPicker] = useState(false);
  const [fundedAt, setFundedAt] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const fundedMutation = useMutation({
    mutationFn: () => api.markOffBlotterFunded(line.id, fundedAt),
    onSuccess: () => {
      toast("Marked as funded.");
      onChanged();
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Update failed."),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelOffBlotterLine(line.id),
    onSuccess: () => {
      toast("Off-blotter line cancelled.");
      onChanged();
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Cancel failed."),
  });

  return (
    <li className="bg-white border border-card-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FileText className="h-4 w-4 text-ink-muted" />
            <span className="truncate">
              {line.commodity ?? "Cargo"}
              {line.quantity_text ? ` — ${line.quantity_text}` : ""}
            </span>
            <StatusPill status={line.status} />
          </div>
          <div className="mt-0.5 text-xs text-ink-muted truncate">
            {line.certificate_number ? (
              <>Cert {line.certificate_number}</>
            ) : (
              <>No cert reference</>
            )}
            {line.buyer_reference && <> · Buyer: {line.buyer_reference}</>}
            {line.referenced_supplier_invoice && (
              <> · Linked invoice: {line.referenced_supplier_invoice}</>
            )}
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            className="text-ink-muted hover:text-ink p-1 rounded"
            onClick={() => setMenuOpen((s) => !s)}
            aria-label="Line actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 z-10 w-48 bg-white border border-card-border rounded-md shadow-md text-sm">
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-neutral-bg flex items-center gap-2"
                onClick={() => {
                  setMenuOpen(false);
                  setShowFundedPicker(true);
                }}
              >
                <Wallet className="h-4 w-4" />
                Mark as funded
              </button>
              {line.certificate_pdf_filename && (
                <a
                  href={`${apiBase}/api/off-blotter/lines/${line.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 hover:bg-neutral-bg flex items-center gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <ExternalLink className="h-4 w-4" />
                  View certificate
                </a>
              )}
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-neutral-bg flex items-center gap-2 text-danger"
                onClick={() => {
                  setMenuOpen(false);
                  if (
                    confirm(
                      "Cancel this off-blotter line? Future accruals will stop. Past accruals stay on the ledger."
                    )
                  )
                    cancelMutation.mutate();
                }}
              >
                <Ban className="h-4 w-4" />
                Cancel line
              </button>
            </div>
          )}
        </div>
      </div>

      {showFundedPicker && (
        <div className="mt-3 rounded-md border border-card-border bg-neutral-bg/40 p-3 flex items-center gap-3">
          <label className="text-xs text-ink-muted">Funded on</label>
          <input
            type="date"
            value={fundedAt}
            onChange={(e) => setFundedAt(e.target.value)}
            className="text-sm rounded border border-card-border px-2 py-1"
          />
          <Button
            size="sm"
            loading={fundedMutation.isPending}
            disabled={fundedMutation.isPending}
            onClick={() => {
              fundedMutation.mutate();
              setShowFundedPicker(false);
            }}
          >
            Confirm
          </Button>
          <button
            type="button"
            className="text-xs text-ink-muted hover:text-ink"
            onClick={() => setShowFundedPicker(false)}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <Stat
          label="Insured value"
          value={`${line.insured_value_currency} ${line.insured_value_amount.toLocaleString()}`}
        />
        <Stat
          label="Inception"
          value={formatShortDate(line.inception_date)}
        />
        <Stat
          label="Days remaining"
          value={`${line.days_remaining} / 60`}
          hint={`${line.days_used} used`}
        />
        <Stat
          label="This month's fee"
          value={`${line.insured_value_currency} ${line.current_month_fee.toFixed(2)}`}
        />
        <Stat
          label="Total accrued"
          value={`${line.insured_value_currency} ${line.total_accrued_to_date.toFixed(2)}`}
        />
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div className="text-sm font-medium text-ink mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-ink-muted mt-0.5">{hint}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: OffBlotterStatus }) {
  const cfg: Record<OffBlotterStatus, { label: string; cls: string }> = {
    active: {
      label: "Active",
      cls: "bg-mint-dim text-mint-deep border-mint",
    },
    funded: {
      label: "Funded",
      cls: "bg-mint-dim text-mint-deep border-mint",
    },
    expired: {
      label: "Expired",
      cls: "bg-neutral-bg text-ink-muted border-card-border",
    },
    cancelled: {
      label: "Cancelled",
      cls: "bg-neutral-bg text-ink-muted border-card-border",
    },
  };
  const { label, cls } = cfg[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-wide",
        cls
      )}
    >
      {label}
    </span>
  );
}

function HistorySection({ lines }: { lines: OffBlotterLine[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
      >
        {open ? "Hide" : "Show"} history ({lines.length})
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {lines.map((l) => (
            <li
              key={l.id}
              className="bg-white border border-card-border rounded-md p-3 text-sm flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-ink">
                  <span className="truncate">
                    {l.commodity ?? "Cargo"}
                    {l.quantity_text ? ` — ${l.quantity_text}` : ""}
                  </span>
                  <StatusPill status={l.status} />
                </div>
                <div className="text-xs text-ink-muted">
                  Inception {formatShortDate(l.inception_date)} ·{" "}
                  {l.insured_value_currency}{" "}
                  {l.insured_value_amount.toLocaleString()} · accrued{" "}
                  {l.insured_value_currency}{" "}
                  {l.total_accrued_to_date.toFixed(2)}
                </div>
              </div>
              {l.certificate_pdf_filename && (
                <a
                  href={`${apiBase}/api/off-blotter/lines/${l.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-mint-deep hover:underline shrink-0"
                >
                  Cert
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
