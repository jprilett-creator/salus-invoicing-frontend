import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Pencil,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import type {
  Batch,
  InvoiceDraft,
  OffBlotterPrefillResponse,
  OffBlotterPrefillRow,
  PushResult,
} from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Checkbox } from "../components/ui/Checkbox";
import { Spinner } from "../components/ui/Spinner";
import { DropZone } from "../components/DropZone";
import { InvoiceDraftCard } from "../components/InvoiceDraftCard";
import { useToast } from "../components/ui/Toaster";
import { PageHeader } from "../components/PageHeader";
import { XeroStatusIndicator } from "../components/XeroStatusIndicator";
import { cn } from "../lib/cn";

type Stage = "setup" | "review" | "pushing" | "done";

interface OffBlotterDraft {
  salus_id: string;
  product: string;
  net_weight_kg: string;
  product_value: string;
  into_store: string;
  left_store: string;
}

const EMPTY_OB: OffBlotterDraft = {
  salus_id: "",
  product: "",
  net_weight_kg: "",
  product_value: "",
  into_store: "",
  left_store: "",
};

const FALLBACK_HELPER =
  "Insurance certs registered for active suppliers this period. " +
  "Edit or add ad-hoc declarations below if needed.";

function defaultPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prefillRowToBatch(r: OffBlotterPrefillRow): Batch {
  return {
    salus_id: r.salus_id,
    product: r.product,
    into_store: r.into_store,
    product_value: r.product_value,
    left_store: r.left_store,
    is_off_blotter: r.is_off_blotter,
    net_weight_kg: r.net_weight_kg,
    powerx_id: r.powerx_id,
  };
}

export function RunInvoicingPage() {
  const { toast } = useToast();

  const [stage, setStage] = useState<Stage>("setup");

  // Step 1: xlsx + parsed batches
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Step 2: off-blotter
  const [obOpen, setObOpen] = useState(false);
  const [offBlotter, setOffBlotter] = useState<Batch[]>([]);
  const [obDraft, setObDraft] = useState<OffBlotterDraft>(EMPTY_OB);

  // Step 2: prefilled rows from WS2 certs (per supplier × period).
  // Keyed by salus_id (OFF-BLOTTER:{line_id}:{period}). Local edits overwrite
  // BatchModel fields; metadata (cert#, fee_amount, ...) stays for display.
  const [prefillEdits, setPrefillEdits] = useState<Record<string, Batch>>({});
  const [prefillRemoved, setPrefillRemoved] = useState<Set<string>>(new Set());
  const [editingPrefillId, setEditingPrefillId] = useState<string | null>(null);

  // Step 3: period
  const [periodStr, setPeriodStr] = useState<string>(defaultPeriod());

  // Review state
  const [drafts, setDrafts] = useState<InvoiceDraft[]>([]);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [pushAsDraft, setPushAsDraft] = useState(true);
  const [pushResults, setPushResults] = useState<PushResult[]>([]);

  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
    refetchOnMount: true,
  });
  const xeroPending = health.data ? !health.data.xero_configured : false;

  // Suppliers — used to fan out prefill calls per supplier × period.
  const suppliersQuery = useQuery({
    queryKey: ["counterparties", "suppliers-for-prefill"],
    queryFn: () => api.listCounterparties(false),
    select: (cps) =>
      cps.filter(
        (c) =>
          c.roles.includes("supplier") &&
          c.status !== "suspended" &&
          c.archived_at === null
      ),
  });

  const supplierIds = suppliersQuery.data?.map((c) => c.id) ?? [];

  const prefillResults = useQueries({
    queries: supplierIds.map((cpId) => ({
      queryKey: ["off-blotter-prefill", cpId, periodStr],
      queryFn: () => api.offBlotterPrefill(cpId, periodStr),
      enabled: Boolean(periodStr),
      staleTime: 60_000,
    })),
  });

  const prefillLoading = prefillResults.some((q) => q.isLoading);
  const prefillData: OffBlotterPrefillResponse[] = prefillResults
    .map((q) => q.data)
    .filter((d): d is OffBlotterPrefillResponse => Boolean(d));
  const helperText = prefillData[0]?.helper_text ?? FALLBACK_HELPER;
  const prefillRows: OffBlotterPrefillRow[] = useMemo(
    () => prefillData.flatMap((r) => r.declarations),
    [prefillData]
  );

  // Auto-expand Step 2 when there are prefilled rows.
  useEffect(() => {
    if (prefillRows.length > 0) setObOpen(true);
  }, [prefillRows.length]);

  // When period changes, clear edits/removals on rows that no longer exist
  // (the backend returns a different set of certs for a different period).
  useEffect(() => {
    const known = new Set(prefillRows.map((r) => r.salus_id));
    setPrefillEdits((cur) => {
      const next: Record<string, Batch> = {};
      for (const [k, v] of Object.entries(cur)) if (known.has(k)) next[k] = v;
      return next;
    });
    setPrefillRemoved((cur) => {
      const next = new Set<string>();
      for (const k of cur) if (known.has(k)) next.add(k);
      return next;
    });
  }, [prefillRows]);

  const visiblePrefillRows = prefillRows.filter(
    (r) => !prefillRemoved.has(r.salus_id)
  );

  const effectivePrefillBatches: Batch[] = visiblePrefillRows.map((r) =>
    prefillEdits[r.salus_id] ?? prefillRowToBatch(r)
  );

  const combinedOffBlotter: Batch[] = useMemo(
    () => [...effectivePrefillBatches, ...offBlotter],
    [effectivePrefillBatches, offBlotter]
  );

  const parseMut = useMutation({
    mutationFn: async (file: File) => api.parseInvoicing(file),
    onSuccess: (res) => {
      setBatches(res.batches);
      setParseError(null);
    },
    onError: (err) => {
      setParseError(err instanceof Error ? err.message : "Parse failed");
      setBatches([]);
    },
  });

  const computeMut = useMutation({
    mutationFn: () =>
      api.computeInvoicing({
        batches,
        off_blotter: combinedOffBlotter,
        period_str: periodStr,
      }),
    onSuccess: (res) => {
      setDrafts(res.drafts);
      setApproved(new Set());
      setStage("review");
    },
  });

  const pushMut = useMutation({
    mutationFn: () => {
      const approvedDrafts = drafts.filter((d) =>
        approved.has(d.invoice_number)
      );
      return api.pushInvoicing({
        drafts: approvedDrafts,
        as_draft: pushAsDraft,
        batches,
        off_blotter: combinedOffBlotter,
        period_str: periodStr,
      });
    },
    onMutate: () => setStage("pushing"),
    onSuccess: (res) => {
      setPushResults(res.results);
      setStage("done");
      const created = res.results.filter((r) => r.status === "created").length;
      const stub = res.results.filter((r) => r.status === "stub").length;
      if (stub > 0) {
        toast(`${stub} invoice${stub === 1 ? "" : "s"} ready (Xero pending).`);
      } else if (created > 0) {
        toast(
          `${created} invoice${created === 1 ? "" : "s"} pushed to Xero as ${
            pushAsDraft ? "DRAFT" : "AUTHORISED"
          }.`
        );
      }
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : "Push failed", "error");
      setStage("review");
    },
  });

  const reset = () => {
    setStage("setup");
    setXlsxFile(null);
    setBatches([]);
    setParseError(null);
    setObOpen(false);
    setOffBlotter([]);
    setObDraft(EMPTY_OB);
    setPrefillEdits({});
    setPrefillRemoved(new Set());
    setEditingPrefillId(null);
    setPeriodStr(defaultPeriod());
    setDrafts([]);
    setApproved(new Set());
    setPushResults([]);
  };

  const computeReady =
    batches.length > 0 || combinedOffBlotter.length > 0;

  const handleAddOb = (e: FormEvent) => {
    e.preventDefault();
    if (!obDraft.salus_id.trim() || !obDraft.product_value || !obDraft.into_store) {
      return;
    }
    const value = Number.parseFloat(obDraft.product_value);
    if (!(value > 0)) return;
    const weight = obDraft.net_weight_kg
      ? Number.parseFloat(obDraft.net_weight_kg)
      : null;
    setOffBlotter((current) => [
      ...current,
      {
        salus_id: obDraft.salus_id.trim(),
        product: obDraft.product.trim() || "Off-blotter",
        into_store: obDraft.into_store,
        product_value: value,
        left_store: obDraft.left_store || null,
        is_off_blotter: true,
        net_weight_kg: weight && !Number.isNaN(weight) ? weight : null,
        powerx_id: null,
      },
    ]);
    setObDraft(EMPTY_OB);
  };

  const totals = useMemo(() => {
    let tx = 0,
      ins = 0,
      sub = 0;
    for (const d of drafts) {
      for (const f of d.fee_lines) {
        if (f.fee_type === "transaction") tx += f.amount;
        else if (f.fee_type === "insurance") ins += f.amount;
      }
      if (d.subscription) sub += d.subscription.amount;
    }
    return { tx, ins, sub, total: tx + ins + sub };
  }, [drafts]);

  const stageTab: "upload" | "review" | "confirm" =
    stage === "setup"
      ? "upload"
      : stage === "done"
        ? "confirm"
        : "review";

  return (
    <>
      <PageHeader
        title="Run invoicing"
        subtitle="Parse a Nexus export, review proposed invoices per counterparty, push to Xero."
        tabs={[
          { label: "Upload", active: stageTab === "upload" },
          { label: "Review", active: stageTab === "review" },
          { label: "Confirm", active: stageTab === "confirm" },
        ]}
        right={<XeroStatusIndicator />}
      />

      <div className="px-10 py-8 space-y-8">
      {xeroPending && (
        <div className="bg-white border border-card-border rounded-lg px-5 py-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-ink-muted shrink-0 mt-0.5" strokeWidth={1.75} />
          <div>
            <p className="text-sm text-ink-dim">
              Xero credentials are pending.
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              You can still review drafts; pushing will record the invoice in
              the local ledger only.
            </p>
          </div>
        </div>
      )}

      {stage === "setup" && (
        <SetupView
          xlsxFile={xlsxFile}
          setXlsxFile={(f) => {
            setXlsxFile(f);
            parseMut.mutate(f);
          }}
          parsing={parseMut.isPending}
          parseError={parseError}
          batches={batches}
          obOpen={obOpen}
          setObOpen={setObOpen}
          offBlotter={offBlotter}
          obDraft={obDraft}
          setObDraft={setObDraft}
          handleAddOb={handleAddOb}
          removeOb={(idx) =>
            setOffBlotter((current) =>
              current.filter((_, i) => i !== idx)
            )
          }
          periodStr={periodStr}
          setPeriodStr={setPeriodStr}
          computeReady={computeReady}
          computing={computeMut.isPending}
          computeError={
            computeMut.isError
              ? (computeMut.error as Error).message
              : null
          }
          onCompute={() => computeMut.mutate()}
          helperText={helperText}
          prefillRows={visiblePrefillRows}
          prefillLoading={prefillLoading}
          prefillEdits={prefillEdits}
          editingPrefillId={editingPrefillId}
          setEditingPrefillId={setEditingPrefillId}
          savePrefillEdit={(salus_id, edited) => {
            setPrefillEdits((cur) => ({ ...cur, [salus_id]: edited }));
            setEditingPrefillId(null);
          }}
          removePrefill={(salus_id) =>
            setPrefillRemoved((cur) => {
              const next = new Set(cur);
              next.add(salus_id);
              return next;
            })
          }
        />
      )}

      {stage === "review" && (
        <ReviewView
          drafts={drafts}
          approved={approved}
          setApproved={setApproved}
          pushAsDraft={pushAsDraft}
          setPushAsDraft={setPushAsDraft}
          totals={totals}
          xeroPending={xeroPending}
          batches={batches}
          offBlotter={combinedOffBlotter}
          periodStr={periodStr}
          onPush={() => pushMut.mutate()}
          onBack={() => setStage("setup")}
        />
      )}

      {stage === "pushing" && (
        <div className="bg-white border border-card-border rounded-lg p-10 flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-sm text-ink-dim">
            Pushing invoices…
          </p>
        </div>
      )}

      {stage === "done" && (
        <DoneView
          results={pushResults}
          pushAsDraft={pushAsDraft}
          onReset={reset}
        />
      )}
      </div>
    </>
  );
}

function SetupView(props: {
  xlsxFile: File | null;
  setXlsxFile: (f: File) => void;
  parsing: boolean;
  parseError: string | null;
  batches: Batch[];
  obOpen: boolean;
  setObOpen: (b: boolean) => void;
  offBlotter: Batch[];
  obDraft: OffBlotterDraft;
  setObDraft: (d: OffBlotterDraft) => void;
  handleAddOb: (e: FormEvent) => void;
  removeOb: (idx: number) => void;
  periodStr: string;
  setPeriodStr: (s: string) => void;
  computeReady: boolean;
  computing: boolean;
  computeError: string | null;
  onCompute: () => void;
  helperText: string;
  prefillRows: OffBlotterPrefillRow[];
  prefillLoading: boolean;
  prefillEdits: Record<string, Batch>;
  editingPrefillId: string | null;
  setEditingPrefillId: (id: string | null) => void;
  savePrefillEdit: (salus_id: string, edited: Batch) => void;
  removePrefill: (salus_id: string) => void;
}) {
  const {
    xlsxFile,
    setXlsxFile,
    parsing,
    parseError,
    batches,
    obOpen,
    setObOpen,
    offBlotter,
    obDraft,
    setObDraft,
    handleAddOb,
    removeOb,
    periodStr,
    setPeriodStr,
    computeReady,
    computing,
    computeError,
    onCompute,
    helperText,
    prefillRows,
    prefillLoading,
    prefillEdits,
    editingPrefillId,
    setEditingPrefillId,
    savePrefillEdit,
    removePrefill,
  } = props;

  const obStepCount = prefillRows.length + offBlotter.length;

  return (
    <div className="space-y-6">
      {/* Step 1 */}
      <section className="bg-white border border-card-border rounded-lg p-6">
        <StepHeader index={1} title="Upload the Nexus export" />
        {!xlsxFile && !parsing && (
          <DropZone
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onFile={setXlsxFile}
            primaryText="Drop the Material Batches xlsx, or click to browse"
            secondaryText="The 'Material Batches' sheet must be present."
            icon={<FileSpreadsheet className="h-8 w-8" strokeWidth={1.5} />}
          />
        )}
        {parsing && (
          <div className="flex items-center gap-3 py-6">
            <Spinner />
            <span className="text-sm text-ink-dim">Reading the export…</span>
          </div>
        )}
        {!parsing && xlsxFile && parseError && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-danger">Couldn&apos;t read the export.</p>
              <p className="mt-0.5 text-xs text-ink-muted">{parseError}</p>
            </div>
            <button
              type="button"
              onClick={() => setXlsxFile(xlsxFile)}
              className="text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
        {!parsing && xlsxFile && !parseError && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2
                className="h-5 w-5 text-mint shrink-0"
                strokeWidth={2}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {xlsxFile.name}
                </p>
                <p className="text-xs text-ink-muted">
                  {batches.length} batch{batches.length === 1 ? "" : "es"} parsed
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Step 2 */}
      <section className="bg-white border border-card-border rounded-lg">
        <button
          type="button"
          onClick={() => setObOpen(!obOpen)}
          className="w-full flex items-center justify-between p-6 group"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted">
              {obOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            <StepHeader
              index={2}
              title="Off-blotter declarations"
              subtitle={
                obStepCount > 0
                  ? `${obStepCount} ${obStepCount === 1 ? "declaration" : "declarations"}` +
                    (prefillRows.length > 0
                      ? ` · ${prefillRows.length} from Insurance register`
                      : "")
                  : prefillLoading
                    ? "Checking insurance register…"
                    : "Optional"
              }
              inline
            />
          </div>
        </button>
        {obOpen && (
          <div className="px-6 pb-6 -mt-2 space-y-5">
            <p className="text-xs text-ink-muted">{helperText}</p>

            {prefillLoading && prefillRows.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <Spinner />
                Checking insurance register…
              </div>
            )}

            {prefillRows.length > 0 && (
              <ul className="space-y-2">
                {prefillRows.map((r) => (
                  <PrefillRowItem
                    key={r.salus_id}
                    row={r}
                    edited={prefillEdits[r.salus_id]}
                    isEditing={editingPrefillId === r.salus_id}
                    onStartEdit={() => setEditingPrefillId(r.salus_id)}
                    onCancelEdit={() => setEditingPrefillId(null)}
                    onSaveEdit={(b) => savePrefillEdit(r.salus_id, b)}
                    onRemove={() => removePrefill(r.salus_id)}
                  />
                ))}
              </ul>
            )}

            {offBlotter.length > 0 && (
              <ul className="space-y-2">
                {offBlotter.map((b, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-4 bg-page border border-card-border rounded-md px-3 py-2"
                  >
                    <span className="text-sm text-ink-dim truncate">
                      <span className="font-medium text-ink">{b.salus_id}</span>{" "}
                      · {b.product} · ${b.product_value?.toLocaleString()} ·
                      into risk {b.into_store}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOb(idx)}
                      className="text-xs text-ink-muted hover:text-danger transition-colors shrink-0"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={handleAddOb}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <Label htmlFor="ob-ref">Reference</Label>
                <Input
                  id="ob-ref"
                  value={obDraft.salus_id}
                  onChange={(e) =>
                    setObDraft({ ...obDraft, salus_id: e.target.value })
                  }
                  placeholder="AJG-Cert-Ta2O5-14-Apr"
                />
              </div>
              <div>
                <Label htmlFor="ob-product">Commodity</Label>
                <Input
                  id="ob-product"
                  value={obDraft.product}
                  onChange={(e) =>
                    setObDraft({ ...obDraft, product: e.target.value })
                  }
                  placeholder="Tantalum Pentoxide"
                />
              </div>
              <div>
                <Label htmlFor="ob-value">Insured value (USD)</Label>
                <Input
                  id="ob-value"
                  type="number"
                  min={0}
                  step="100"
                  value={obDraft.product_value}
                  onChange={(e) =>
                    setObDraft({ ...obDraft, product_value: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="ob-weight">Net weight (kg, optional)</Label>
                <Input
                  id="ob-weight"
                  type="number"
                  min={0}
                  step="0.1"
                  value={obDraft.net_weight_kg}
                  onChange={(e) =>
                    setObDraft({ ...obDraft, net_weight_kg: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="ob-into">Into-risk date</Label>
                <Input
                  id="ob-into"
                  type="date"
                  value={obDraft.into_store}
                  onChange={(e) =>
                    setObDraft({ ...obDraft, into_store: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="ob-left">Left-risk date (optional)</Label>
                <Input
                  id="ob-left"
                  type="date"
                  value={obDraft.left_store}
                  onChange={(e) =>
                    setObDraft({ ...obDraft, left_store: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" variant="secondary" size="sm">
                  Add declaration
                </Button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Step 3 */}
      <section className="bg-white border border-card-border rounded-lg p-6">
        <StepHeader index={3} title="Period" />
        <div className="max-w-xs">
          <Label htmlFor="period">Invoicing month</Label>
          <Input
            id="period"
            type="month"
            value={periodStr}
            onChange={(e) => setPeriodStr(e.target.value)}
          />
        </div>
      </section>

      {/* Action */}
      {computeError && (
        <p className="text-sm text-danger">{computeError}</p>
      )}
      <div className="flex items-center justify-end">
        <Button
          onClick={onCompute}
          disabled={!computeReady || computing}
          loading={computing}
        >
          Compute fees
        </Button>
      </div>
    </div>
  );
}

function PrefillRowItem({
  row,
  edited,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: {
  row: OffBlotterPrefillRow;
  edited: Batch | undefined;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (b: Batch) => void;
  onRemove: () => void;
}) {
  const display: Batch = edited ?? prefillRowToBatch(row);
  const isEdited = Boolean(edited);

  if (isEditing) {
    return (
      <li className="bg-mint-dim/30 border border-mint/40 rounded-md px-3 py-3">
        <PrefillEditForm
          initial={display}
          onCancel={onCancelEdit}
          onSave={onSaveEdit}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 bg-mint-dim/30 border border-mint/40 rounded-md px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-mint-dim text-mint-deep text-[10px] font-medium uppercase tracking-wide border border-mint/40">
            From Insurance register
          </span>
          {isEdited && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-warn-bg text-warn-deep text-[10px] font-medium uppercase tracking-wide border border-warn/40">
              Edited
            </span>
          )}
          <span className="text-xs text-ink-muted">
            {row.certificate_number ? `Cert ${row.certificate_number}` : "No cert #"}
          </span>
        </div>
        <div className="mt-1 text-sm text-ink-dim truncate">
          <span className="font-medium text-ink">{display.product}</span>
          {" · "}
          {row.insured_value_currency}{" "}
          {(display.product_value ?? 0).toLocaleString()}
          {" · into risk "}
          {display.into_store}
          {" · "}
          {row.days_on_risk_this_period}d on risk
          {" · fee "}
          {row.fee_currency} {row.fee_amount.toFixed(2)}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onStartEdit}
          className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-danger transition-colors"
        >
          <X className="h-3 w-3" />
          Remove
        </button>
      </div>
    </li>
  );
}

function PrefillEditForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: Batch;
  onCancel: () => void;
  onSave: (b: Batch) => void;
}) {
  const [product, setProduct] = useState(initial.product);
  const [productValue, setProductValue] = useState(
    initial.product_value != null ? String(initial.product_value) : ""
  );
  const [intoStore, setIntoStore] = useState(initial.into_store);
  const [leftStore, setLeftStore] = useState(initial.left_store ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = Number.parseFloat(productValue);
    if (!(value > 0) || !intoStore) return;
    onSave({
      ...initial,
      product: product.trim() || initial.product,
      product_value: value,
      into_store: intoStore,
      left_store: leftStore || null,
    });
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="md:col-span-2">
        <Label htmlFor="pe-product">Commodity</Label>
        <Input
          id="pe-product"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="pe-value">Insured value</Label>
        <Input
          id="pe-value"
          type="number"
          min={0}
          step="100"
          value={productValue}
          onChange={(e) => setProductValue(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="pe-into">Into risk</Label>
        <Input
          id="pe-into"
          type="date"
          value={intoStore}
          onChange={(e) => setIntoStore(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="pe-left">Left risk (optional)</Label>
        <Input
          id="pe-left"
          type="date"
          value={leftStore}
          onChange={(e) => setLeftStore(e.target.value)}
        />
      </div>
      <div className="md:col-span-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline"
        >
          Cancel
        </button>
        <Button type="submit" variant="secondary" size="sm">
          Save row
        </Button>
      </div>
    </form>
  );
}

function ReviewView(props: {
  drafts: InvoiceDraft[];
  approved: Set<string>;
  setApproved: (s: Set<string>) => void;
  pushAsDraft: boolean;
  setPushAsDraft: (b: boolean) => void;
  totals: { tx: number; ins: number; sub: number; total: number };
  xeroPending: boolean;
  batches: Batch[];
  offBlotter: Batch[];
  periodStr: string;
  onPush: () => void;
  onBack: () => void;
}) {
  const {
    drafts,
    approved,
    setApproved,
    pushAsDraft,
    setPushAsDraft,
    totals,
    xeroPending,
    batches,
    offBlotter,
    periodStr,
    onPush,
    onBack,
  } = props;

  if (drafts.length === 0) {
    return (
      <div className="bg-white border border-card-border rounded-lg p-10 text-center">
        <p className="text-base text-ink">
          Nothing to invoice — everything looks already billed.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          You can run again with a different period or a fresh export.
        </p>
        <div className="mt-6">
          <Button variant="secondary" onClick={onBack}>
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  const toggle = (invoiceNumber: string, on: boolean) => {
    const next = new Set(approved);
    if (on) next.add(invoiceNumber);
    else next.delete(invoiceNumber);
    setApproved(next);
  };

  const approvedAll = drafts.every((d) => approved.has(d.invoice_number));
  const handleApproveAll = () => {
    if (approvedAll) {
      setApproved(new Set());
    } else {
      const next = new Set<string>();
      drafts.forEach((d) => next.add(d.invoice_number));
      setApproved(next);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
        >
          ← Edit inputs
        </button>
        <button
          type="button"
          onClick={handleApproveAll}
          className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
        >
          {approvedAll ? "Unapprove all" : "Approve all"}
        </button>
      </div>

      {/* Totals strip */}
      <div className="bg-white border border-card-border rounded-lg p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <Metric label="Transaction" value={totals.tx} />
        <Metric label="Insurance" value={totals.ins} />
        <Metric label="Subscription" value={totals.sub} />
        <Metric label="Grand total" value={totals.total} prominent />
      </div>

      <ul className="space-y-4">
        {drafts.map((d) => (
          <li key={d.invoice_number}>
            <InvoiceDraftCard
              draft={d}
              approved={approved.has(d.invoice_number)}
              onToggle={(on) => toggle(d.invoice_number, on)}
              batches={batches}
              offBlotter={offBlotter}
              periodStr={periodStr}
            />
          </li>
        ))}
      </ul>

      <div className="bg-white border border-card-border rounded-lg p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5">
          <Checkbox
            id="as-draft"
            checked={pushAsDraft}
            onChange={(e) => setPushAsDraft(e.target.checked)}
            label="Push as DRAFT (recommended)"
          />
          <span className="text-xs text-ink-muted">
            {approved.size} of {drafts.length} approved
          </span>
        </div>
        <Button
          onClick={onPush}
          disabled={approved.size === 0}
          className="min-w-[18rem]"
        >
          {xeroPending
            ? `Record ${approved.size} invoice${approved.size === 1 ? "" : "s"} (Xero pending)`
            : `Push ${approved.size} invoice${approved.size === 1 ? "" : "s"} to Xero as ${pushAsDraft ? "DRAFT" : "AUTHORISED"}`}
        </Button>
      </div>
    </div>
  );
}

function DoneView({
  results,
  pushAsDraft,
  onReset,
}: {
  results: PushResult[];
  pushAsDraft: boolean;
  onReset: () => void;
}) {
  const created = results.filter((r) => r.status === "created");
  const stub = results.filter((r) => r.status === "stub");
  const skipped = results.filter((r) => r.status === "skipped");
  const failed = results.filter((r) => r.status === "failed");

  return (
    <div className="space-y-6">
      <div className="bg-white border border-card-border rounded-lg p-8">
        <h2 className="text-lg font-medium text-ink">
          {created.length > 0 && `${created.length} pushed to Xero as ${pushAsDraft ? "DRAFT" : "AUTHORISED"}.`}
          {created.length === 0 && stub.length > 0 && `${stub.length} ready (Xero pending).`}
          {created.length === 0 && stub.length === 0 && "Nothing was pushed."}
        </h2>
        <div className="mt-5">
          <ul className="divide-y divide-card-border">
            {results.map((r) => (
              <li
                key={r.invoice_number}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {r.invoice_number}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {r.counterparty}
                    {r.detail ? ` · ${r.detail}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-ink-dim tabular-nums">
                    ${r.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <ResultBadge status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        {(skipped.length > 0 || failed.length > 0) && (
          <p className="mt-5 text-xs text-ink-muted">
            {skipped.length > 0 && `${skipped.length} skipped (already in Xero). `}
            {failed.length > 0 && `${failed.length} failed.`}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-4">
        <Button variant="secondary" onClick={onReset}>
          Run again
        </Button>
      </div>
    </div>
  );
}

function ResultBadge({ status }: { status: PushResult["status"] }) {
  const map: Record<PushResult["status"], { className: string; label: string }> = {
    created: { className: "bg-mint-dim text-mint-deep", label: "Created" },
    stub: { className: "bg-warn-bg text-warn-deep", label: "Pending Xero" },
    skipped: { className: "bg-neutral-bg text-neutral-deep", label: "Skipped" },
    failed: { className: "bg-danger-bg text-danger-deep", label: "Failed" },
  };
  const m = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        m.className
      )}
    >
      {m.label}
    </span>
  );
}

function StepHeader({
  index,
  title,
  subtitle,
  inline = false,
}: {
  index: number;
  title: string;
  subtitle?: string;
  inline?: boolean;
}) {
  return (
    <div className={cn(!inline && "mb-5")}>
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          Step {index}
        </span>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      {subtitle && (
        <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  prominent,
}: {
  label: string;
  value: number;
  prominent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 tabular-nums",
          prominent
            ? "text-xl font-semibold text-ink"
            : "text-base font-medium text-ink-dim"
        )}
      >
        ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
