import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type {
  OffBlotterExtractResponse,
  OffBlotterLine,
} from "../lib/types";
import { DropZone } from "./DropZone";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { Spinner } from "./ui/Spinner";
import { cn } from "../lib/cn";

type Stage = "idle" | "extracting" | "preview" | "error";

export interface CertCaptureCounterparty {
  id: number;
  short_name: string;
  name: string;
}

interface Props {
  /**
   * Default supplier when the extract endpoint returns no candidates and the
   * page already has a counterparty in scope (e.g. the OffBlotterTab).
   */
  defaultCounterparty?: CertCaptureCounterparty | null;
  /**
   * Full supplier list to pick from when the extract endpoint returns no
   * candidates and there's no default counterparty (e.g. the wizard).
   */
  supplierOptions?: CertCaptureCounterparty[];
  onSaved: (line: OffBlotterLine) => void;
  primaryText?: string;
  secondaryText?: string;
}

export function OffBlotterCertCapture({
  defaultCounterparty = null,
  supplierOptions = [],
  onSaved,
  primaryText = "Drop insurance certificate here",
  secondaryText,
}: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extraction, setExtraction] =
    useState<OffBlotterExtractResponse | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleDrop = async (file: File) => {
    setPdfFile(file);
    setStage("extracting");
    setErrMsg(null);
    try {
      const res = await api.extractOffBlotterCert(file);
      setExtraction(res);
      if (res.extracted) {
        setStage("preview");
      } else {
        setStage("error");
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
    onSuccess: (line) => {
      reset();
      onSaved(line);
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Save failed.";
      setErrMsg(msg);
      setStage("error");
    },
  });

  if (stage === "idle") {
    return (
      <DropZone
        accept="application/pdf"
        onFile={handleDrop}
        primaryText={primaryText}
        secondaryText={secondaryText}
        icon={<FileText className="h-7 w-7" strokeWidth={1.5} />}
      />
    );
  }

  if (stage === "extracting") {
    return (
      <div className="flex items-center gap-3 py-6">
        <Spinner />
        <span className="text-sm text-ink-dim">
          Reading certificate<span className="text-ink-muted">…</span>
        </span>
      </div>
    );
  }

  if (stage === "error") {
    return (
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
    );
  }

  // stage === "preview"
  if (!extraction) return null;
  return (
    <ExtractionPreview
      extraction={extraction}
      pdfFilename={pdfFile?.name}
      defaultCounterparty={defaultCounterparty}
      supplierOptions={supplierOptions}
      saving={saveLine.isPending}
      onCancel={reset}
      onSave={(targetCpId) => saveLine.mutate(targetCpId)}
    />
  );
}

function ExtractionPreview({
  extraction,
  pdfFilename,
  defaultCounterparty,
  supplierOptions,
  saving,
  onCancel,
  onSave,
}: {
  extraction: OffBlotterExtractResponse;
  pdfFilename?: string;
  defaultCounterparty: CertCaptureCounterparty | null;
  supplierOptions: CertCaptureCounterparty[];
  saving: boolean;
  onCancel: () => void;
  onSave: (counterpartyId: number) => void;
}) {
  const f = extraction.extracted_fields;
  const candidates = extraction.match.candidates;

  // Pre-select: a candidate matching defaultCounterparty if any, else first
  // candidate, else defaultCounterparty itself, else nothing (forces a pick).
  const initial = useMemo(() => {
    if (defaultCounterparty) {
      const inCands = candidates.find((c) => c.id === defaultCounterparty.id);
      if (inCands) return inCands.id;
    }
    if (candidates[0]) return candidates[0].id;
    if (defaultCounterparty) return defaultCounterparty.id;
    return null;
  }, [candidates, defaultCounterparty]);

  const [targetId, setTargetId] = useState<number | null>(initial);

  // When defaultCounterparty is null and no candidates, the user must pick
  // from supplierOptions. Save is disabled until they do.
  const needsManualPick =
    candidates.length === 0 && !defaultCounterparty;

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

      <div className="rounded-md border border-card-border bg-neutral-bg/40 p-4">
        <p className="text-xs uppercase tracking-wide text-ink-muted mb-2">
          Save under supplier
        </p>
        {candidates.length === 0 && defaultCounterparty ? (
          <p className="text-sm text-ink">
            No supplier match found for &quot;{f.supplier_legal_name ?? "—"}&quot;.
            Saving against this counterparty (
            <span className="font-medium">{defaultCounterparty.short_name}</span>).
          </p>
        ) : candidates.length === 0 ? (
          <div>
            <p className="text-sm text-ink mb-2">
              No supplier match found for &quot;{f.supplier_legal_name ?? "—"}&quot;.
              Pick a supplier:
            </p>
            <Select
              value={targetId == null ? "" : String(targetId)}
              onChange={(e) => {
                const v = e.target.value;
                setTargetId(v === "" ? null : Number(v));
              }}
            >
              <option value="">— Select supplier —</option>
              {supplierOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.short_name} ({c.name})
                </option>
              ))}
            </Select>
          </div>
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
          disabled={saving || (needsManualPick && targetId == null)}
          onClick={() => {
            if (targetId != null) onSave(targetId);
          }}
        >
          Save off-blotter line
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
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
