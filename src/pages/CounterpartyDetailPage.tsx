import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, CheckCircle2, FileText, Pencil, RotateCcw } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type {
  AuditEntry,
  CounterpartyDetail,
  CounterpartyPatch,
  KycChecks,
} from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Textarea } from "../components/ui/Textarea";
import { Checkbox } from "../components/ui/Checkbox";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/ui/Toaster";
import { formatDateTime, formatShortDate } from "../lib/format";
import { cn } from "../lib/cn";

type Tab = "overview" | "contracts" | "fees" | "history" | "kyc" | "audit";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "contracts", label: "Contracts" },
  { key: "fees", label: "Fee schedule" },
  { key: "history", label: "Invoicing history" },
  { key: "kyc", label: "KYC" },
  { key: "audit", label: "Audit" },
];

export function CounterpartyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const cpId = Number(id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [archiveModal, setArchiveModal] = useState<
    | null
    | { kind: "ask" }
    | { kind: "blocked"; ids: string[] }
    | { kind: "restore" }
  >(null);

  const cpQuery = useQuery({
    queryKey: ["counterparty", cpId],
    queryFn: () => api.getCounterparty(cpId),
    enabled: Number.isFinite(cpId),
  });

  if (!Number.isFinite(cpId)) {
    return <NotFound />;
  }

  const cp = cpQuery.data;
  const archived = Boolean(cp?.archived_at);

  return (
    <>
      <header
        className="border-b border-card-border"
        style={{
          background:
            "linear-gradient(to right, #E8F9F0 0%, #F4FBE8 55%, #FAFAFA 100%)",
        }}
      >
        <div className="px-10 pt-8 pb-0">
          <Link
            to="/counterparties"
            className="inline-flex items-center gap-1.5 mb-2 text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Counterparties
          </Link>
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-ink">
                  {cp?.short_name ?? "—"}
                </h1>
                {archived && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-bg text-neutral-deep">
                    Archived on {formatShortDate(cp?.archived_at)}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm text-ink-muted max-w-2xl">{cp?.name ?? ""}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {tab === "overview" && !editing && cp && !archived && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  Edit
                </Button>
              )}
              {cp && !archived && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-ink-muted hover:text-danger"
                  onClick={() => setArchiveModal({ kind: "ask" })}
                >
                  <Archive className="h-3.5 w-3.5" strokeWidth={2} />
                  Archive
                </Button>
              )}
              {cp && archived && (
                <Button
                  size="sm"
                  onClick={() => setArchiveModal({ kind: "restore" })}
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                  Restore
                </Button>
              )}
            </div>
          </div>

          <nav className="mt-6 flex items-center gap-6 -mb-px">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  if (t.key !== "overview") setEditing(false);
                }}
                className={cn(
                  "pb-3 text-sm border-b-2 transition-colors whitespace-nowrap",
                  tab === t.key
                    ? "border-ink text-ink font-medium"
                    : "border-transparent text-ink-muted hover:text-ink"
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="px-10 py-8">
        {cpQuery.isLoading && (
          <div className="flex justify-center py-16">
            <Spinner foreground={false} />
          </div>
        )}
        {cpQuery.isError && (
          <div className="bg-white border border-card-border rounded-lg p-6">
            <p className="text-sm text-danger">
              Couldn&apos;t load counterparty. {(cpQuery.error as Error).message}
            </p>
          </div>
        )}
        {cp && tab === "overview" && (
          editing ? (
            <OverviewEdit
              cp={cp}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                qc.invalidateQueries({ queryKey: ["counterparty", cpId] });
                qc.invalidateQueries({ queryKey: ["counterparties"] });
                toast("Counterparty updated");
              }}
            />
          ) : (
            <OverviewView cp={cp} />
          )
        )}
        {cp && tab === "contracts" && <ContractsTab cp={cp} />}
        {cp && tab === "fees" && <PlaceholderTab title="Fee schedule" />}
        {cp && tab === "history" && <PlaceholderTab title="Invoicing history" />}
        {cp && tab === "kyc" && <KycTab cp={cp} cpId={cpId} />}
        {cp && tab === "audit" && <AuditTab cpId={cpId} />}
      </div>

      {archiveModal?.kind === "ask" && cp && (
        <ArchiveModal
          shortName={cp.short_name}
          onCancel={() => setArchiveModal(null)}
          onConfirm={async () => {
            try {
              const res = await api.archiveCounterparty(cpId);
              if (res.error) {
                setArchiveModal({
                  kind: "blocked",
                  ids: res.blocking_invoice_ids ?? [],
                });
                return;
              }
              toast(`${cp.short_name} archived`);
              qc.invalidateQueries({ queryKey: ["counterparty", cpId] });
              qc.invalidateQueries({ queryKey: ["counterparties"] });
              setArchiveModal(null);
            } catch (e) {
              if (e instanceof ApiError && e.status === 409) {
                const body = e.body as { blocking_invoice_ids?: string[] };
                setArchiveModal({
                  kind: "blocked",
                  ids: body?.blocking_invoice_ids ?? [],
                });
              } else {
                toast(e instanceof Error ? e.message : "Archive failed", "error");
                setArchiveModal(null);
              }
            }
          }}
        />
      )}

      {archiveModal?.kind === "blocked" && cp && (
        <BlockedArchiveModal
          shortName={cp.short_name}
          ids={archiveModal.ids}
          onClose={() => setArchiveModal(null)}
        />
      )}

      {archiveModal?.kind === "restore" && cp && (
        <RestoreModal
          shortName={cp.short_name}
          onCancel={() => setArchiveModal(null)}
          onConfirm={async () => {
            try {
              await api.restoreCounterparty(cpId);
              toast(`${cp.short_name} restored`);
              qc.invalidateQueries({ queryKey: ["counterparty", cpId] });
              qc.invalidateQueries({ queryKey: ["counterparties"] });
              setArchiveModal(null);
            } catch (e) {
              toast(e instanceof Error ? e.message : "Restore failed", "error");
              setArchiveModal(null);
            }
          }}
        />
      )}
    </>
  );
}

function NotFound() {
  return (
    <div className="px-10 py-12">
      <p className="text-sm text-ink-muted">Counterparty not found.</p>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  funder: "Funder",
  supplier: "Supplier",
};

function ReadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-ink">
        {value && value.trim() !== "" ? value : <span className="text-ink-muted">—</span>}
      </div>
    </div>
  );
}

function OverviewView({ cp }: { cp: CounterpartyDetail }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white border border-card-border rounded-lg p-6 space-y-5">
        <h2 className="text-base font-semibold text-ink">Identity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ReadField label="Legal name" value={cp.name} />
          <ReadField label="Short name" value={cp.short_name} />
          <ReadField label="Customer type" value={cp.customer_type} />
          <ReadField label="Jurisdiction" value={cp.jurisdiction} />
          <ReadField label="Company number" value={cp.company_number} />
          <ReadField label="Currency" value={cp.currency} />
          <ReadField label="Roles" value={cp.roles.map((r) => ROLE_LABEL[r] ?? r).join(" · ")} />
          <ReadField label="Payment terms" value={`${cp.payment_terms_days} days`} />
          <ReadField label="Registered address" value={cp.registered_address} />
          <ReadField label="Billing address" value={cp.billing_address ?? cp.registered_address} />
          <ReadField label="Billing email" value={cp.billing_email} />
          <ReadField label="Xero contact ID" value={cp.xero_contact_id} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="bg-white border border-card-border rounded-lg p-6">
          <h2 className="text-base font-semibold text-ink">Primary contact</h2>
          <div className="mt-4 space-y-3">
            <ReadField label="Name" value={cp.primary_contact_name} />
            <ReadField label="Role" value={cp.primary_contact_role} />
            <ReadField label="Email" value={cp.primary_contact_email} />
            <ReadField label="Phone" value={cp.primary_contact_phone} />
          </div>
        </div>
        <div className="bg-white border border-card-border rounded-lg p-6">
          <h2 className="text-base font-semibold text-ink">Quick stats</h2>
          <div className="mt-4 space-y-3">
            <ReadField label="Status" value={cp.status} />
            <ReadField
              label="KYC status"
              value={
                cp.kyc_status === "attested"
                  ? "Attested"
                  : cp.kyc_status === "expiring"
                  ? "Expiring"
                  : cp.kyc_status === "expired"
                  ? "Expired"
                  : "Never attested"
              }
            />
            <ReadField label="Created" value={formatDateTime(cp.created_at)} />
            <ReadField label="Last updated" value={formatDateTime(cp.updated_at)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewEdit({
  cp,
  onCancel,
  onSaved,
}: {
  cp: CounterpartyDetail;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: cp.name,
    short_name: cp.short_name,
    customer_type: cp.customer_type ?? "",
    jurisdiction: cp.jurisdiction ?? "",
    company_number: cp.company_number ?? "",
    registered_address: cp.registered_address ?? "",
    billing_address: cp.billing_address ?? "",
    billing_email: cp.billing_email ?? "",
    primary_contact_name: cp.primary_contact_name ?? "",
    primary_contact_role: cp.primary_contact_role ?? "",
    primary_contact_email: cp.primary_contact_email ?? "",
    primary_contact_phone: cp.primary_contact_phone ?? "",
    xero_contact_id: cp.xero_contact_id ?? "",
    notes: cp.notes ?? "",
  });

  const setField = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // TODO(fee-schedule-tab): fee_schedule editing happens on the dedicated
  // Fee schedule tab. Identity + contact only here.

  const save = useMutation({
    mutationFn: () => {
      const patch: CounterpartyPatch = {};
      const fields: (keyof typeof form)[] = [
        "name", "short_name", "customer_type", "jurisdiction",
        "company_number", "registered_address", "billing_address",
        "billing_email", "primary_contact_name", "primary_contact_role",
        "primary_contact_email", "primary_contact_phone",
        "xero_contact_id", "notes",
      ];
      for (const f of fields) {
        const oldVal = (cp[f as keyof CounterpartyDetail] ?? "") as string;
        const newVal = form[f] ?? "";
        if (oldVal !== newVal) {
          (patch as Record<string, unknown>)[f] = newVal === "" ? null : newVal;
        }
      }
      return api.patchCounterparty(cp.id, patch);
    },
    onSuccess: () => onSaved(),
    onError: (e: Error) => toast(e.message, "error"),
  });

  return (
    <div className="bg-white border border-card-border rounded-lg p-6 space-y-5">
      <h2 className="text-base font-semibold text-ink">Edit identity & contact</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Legal name">
          <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
        </Field>
        <Field label="Short name">
          <Input value={form.short_name} onChange={(e) => setField("short_name", e.target.value)} />
        </Field>
        <Field label="Customer type">
          <Input value={form.customer_type} onChange={(e) => setField("customer_type", e.target.value)} />
        </Field>
        <Field label="Jurisdiction">
          <Input value={form.jurisdiction} onChange={(e) => setField("jurisdiction", e.target.value)} />
        </Field>
        <Field label="Company number">
          <Input value={form.company_number} onChange={(e) => setField("company_number", e.target.value)} />
        </Field>
        <Field label="Xero contact ID">
          <Input value={form.xero_contact_id} onChange={(e) => setField("xero_contact_id", e.target.value)} />
        </Field>
        <Field label="Registered address" wide>
          <Textarea value={form.registered_address} onChange={(e) => setField("registered_address", e.target.value)} />
        </Field>
        <Field label="Billing address" wide>
          <Textarea value={form.billing_address} onChange={(e) => setField("billing_address", e.target.value)} />
        </Field>
        <Field label="Billing email">
          <Input type="email" value={form.billing_email} onChange={(e) => setField("billing_email", e.target.value)} />
        </Field>
        <Field label="Primary contact name">
          <Input value={form.primary_contact_name} onChange={(e) => setField("primary_contact_name", e.target.value)} />
        </Field>
        <Field label="Primary contact role">
          <Input value={form.primary_contact_role} onChange={(e) => setField("primary_contact_role", e.target.value)} />
        </Field>
        <Field label="Primary contact email">
          <Input type="email" value={form.primary_contact_email} onChange={(e) => setField("primary_contact_email", e.target.value)} />
        </Field>
        <Field label="Primary contact phone">
          <Input value={form.primary_contact_phone} onChange={(e) => setField("primary_contact_phone", e.target.value)} />
        </Field>
        <Field label="Notes" wide>
          <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          Save
        </Button>
        <button
          type="button"
          className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ContractsTab({ cp }: { cp: CounterpartyDetail }) {
  const apiBase =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "https://salus-invoicing.onrender.com";

  return (
    <div className="bg-white border border-card-border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Contracts on file</h2>
        <Link to="/counterparties/new">
          <Button variant="secondary" size="sm">
            + Upload another contract
          </Button>
        </Link>
      </div>
      {cp.contracts.length === 0 ? (
        <p className="text-sm text-ink-muted">No contracts uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-card-border border border-card-border rounded-md overflow-hidden">
          {cp.contracts.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink truncate flex items-center gap-2">
                  <FileText className="h-4 w-4 text-ink-muted shrink-0" />
                  {c.title || c.pdf_filename || "Untitled"}
                </div>
                {c.pdf_filename && (
                  <div className="mt-0.5 text-xs text-ink-muted truncate">
                    {c.pdf_filename}
                  </div>
                )}
              </div>
              <div className="text-xs text-ink-muted">
                {c.effective_date ? formatShortDate(c.effective_date) : "—"}
              </div>
              <div className="text-xs text-ink-muted">
                {c.term_months ? `${c.term_months} months` : "—"}
              </div>
              <div className="text-right">
                {c.id ? (
                  <a
                    href={`${apiBase}/api/contracts/${c.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-mint-deep hover:underline"
                  >
                    Download PDF
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="bg-white border border-card-border rounded-lg p-10 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-muted">Coming soon.</p>
    </div>
  );
}

const KYC_LABELS: { key: keyof KycChecks; label: string; mandatory: boolean }[] = [
  { key: "identity", label: "Identity verified (passport / company registry)", mandatory: true },
  { key: "ubo", label: "Beneficial ownership confirmed (>25% UBOs identified)", mandatory: true },
  { key: "sanctions", label: "Sanctions screening cleared (OFAC, UK, EU, UN)", mandatory: true },
  { key: "pep", label: "PEP screening cleared", mandatory: true },
  { key: "adverse_media", label: "Adverse media screening cleared", mandatory: true },
  { key: "source_of_funds", label: "Source of funds confirmed (where required)", mandatory: false },
];

function KycTab({ cp, cpId }: { cp: CounterpartyDetail; cpId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const att = cp.kyc_attestation;
  const [reAttesting, setReAttesting] = useState(false);
  const showForm = !att || reAttesting;

  const [checks, setChecks] = useState<KycChecks>({
    identity: false,
    ubo: false,
    sanctions: false,
    pep: false,
    adverse_media: false,
    source_of_funds: false,
  });
  const [notes, setNotes] = useState("");

  const allMandatory = KYC_LABELS.filter((c) => c.mandatory).every(
    (c) => checks[c.key]
  );

  const attest = useMutation({
    mutationFn: () => api.attestKyc(cpId, checks, notes || null),
    onSuccess: () => {
      toast("KYC attested");
      qc.invalidateQueries({ queryKey: ["counterparty", cpId] });
      qc.invalidateQueries({ queryKey: ["counterparties"] });
      setReAttesting(false);
      setChecks({
        identity: false, ubo: false, sanctions: false,
        pep: false, adverse_media: false, source_of_funds: false,
      });
      setNotes("");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  return (
    <div className="bg-white border border-card-border rounded-lg p-6 max-w-3xl">
      <h2 className="text-base font-semibold text-ink">KYC attestation</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Manual attestation. The Salus team has performed checks externally; this
        records the result.
      </p>

      {att && !reAttesting ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-mint-dim border border-mint/30 rounded-md">
            <CheckCircle2 className="h-5 w-5 text-mint-deep shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-ink">
                Attested by {att.attested_by_email ?? "—"}
              </div>
              <div className="mt-0.5 text-xs text-ink-muted">
                On {formatDateTime(att.attested_at)} ·{" "}
                {att.status === "attested"
                  ? "Within 12-month window"
                  : att.status === "expiring"
                  ? "Expiring soon"
                  : "Expired"}
              </div>
              {att.notes && (
                <div className="mt-2 text-xs text-ink-dim italic">{att.notes}</div>
              )}
            </div>
          </div>
          <Button onClick={() => setReAttesting(true)}>
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            Re-attest
          </Button>
        </div>
      ) : null}

      {showForm && (
        <div className="mt-6 space-y-4">
          <div className="space-y-2.5">
            {KYC_LABELS.map((c) => (
              <div key={c.key} className="flex items-center gap-2.5">
                <Checkbox
                  id={`kyc-${c.key}`}
                  checked={checks[c.key]}
                  onChange={(e) =>
                    setChecks((p) => ({ ...p, [c.key]: e.target.checked }))
                  }
                  label={`${c.label}${c.mandatory ? "" : " (optional)"}`}
                />
              </div>
            ))}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: any context, reviewer name, or external case numbers."
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              disabled={!allMandatory || attest.isPending}
              loading={attest.isPending}
              onClick={() => attest.mutate()}
            >
              Attest
            </Button>
            {reAttesting && (
              <button
                type="button"
                className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
                onClick={() => setReAttesting(false)}
              >
                Cancel
              </button>
            )}
          </div>

          <p className="text-xs text-ink-muted">
            Attesting confirms manual KYC checks have been completed. Signed by{" "}
            <strong className="font-medium text-ink-dim">
              {user?.display_name ?? user?.username ?? "you"}
            </strong>{" "}
            at {new Date().toLocaleString("en-GB")}.
          </p>
        </div>
      )}
    </div>
  );
}

function AuditTab({ cpId }: { cpId: number }) {
  const auditQuery = useQuery({
    queryKey: ["counterparty-audit", cpId],
    queryFn: () => api.getCounterpartyAudit(cpId),
  });

  if (auditQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner foreground={false} />
      </div>
    );
  }
  if (auditQuery.isError) {
    return (
      <div className="bg-white border border-card-border rounded-lg p-6">
        <p className="text-sm text-danger">
          Couldn&apos;t load audit log. {(auditQuery.error as Error).message}
        </p>
      </div>
    );
  }
  const rows = auditQuery.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-card-border rounded-lg p-10 text-center">
        <p className="text-sm text-ink-muted">No audit entries yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-card-border rounded-lg overflow-hidden max-w-4xl">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-card-border bg-page text-[10px] font-medium uppercase tracking-wider text-ink-muted">
            <th className="px-4 py-2.5">When</th>
            <th className="px-4 py-2.5">Who</th>
            <th className="px-4 py-2.5">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {rows.map((r) => (
            <tr key={r.id} className="text-sm text-ink-dim">
              <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap tabular-nums">
                {formatDateTime(r.changed_at)}
              </td>
              <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                {r.changed_by_email ?? "system"}
              </td>
              <td className="px-4 py-3">
                <AuditAction entry={r} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditAction({ entry }: { entry: AuditEntry }) {
  if (entry.change_type === "create") return <span>Created</span>;
  if (entry.change_type === "archive") return <span>Archived</span>;
  if (entry.change_type === "restore") return <span>Restored</span>;
  if (entry.change_type === "kyc_attest") return <span>KYC attested</span>;
  if (entry.change_type === "update") {
    const fields = Object.keys(entry.field_changes);
    if (fields.length === 0) return <span>Updated</span>;
    return (
      <ul className="space-y-0.5">
        {fields.map((f) => {
          const ch = entry.field_changes[f];
          return (
            <li key={f} className="text-sm">
              Updated <strong className="font-medium text-ink">{f}</strong>:{" "}
              <code className="text-xs text-ink-muted">
                {fmtVal(ch.old)} → {fmtVal(ch.new)}
              </code>
            </li>
          );
        })}
      </ul>
    );
  }
  return <span>{entry.change_type}</span>;
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "''";
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function ArchiveModal({
  shortName,
  onCancel,
  onConfirm,
}: {
  shortName: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell title={`Archive ${shortName}?`} onClose={onCancel}>
      <p className="text-sm text-ink-dim">
        Archiving removes this counterparty from the active list. Historical
        invoices and ledger entries are preserved. You can restore later from
        the archived view.
      </p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <Button
          variant="danger"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          Archive
        </Button>
      </div>
    </ModalShell>
  );
}

function BlockedArchiveModal({
  shortName,
  ids,
  onClose,
}: {
  shortName: string;
  ids: string[];
  onClose: () => void;
}) {
  return (
    <ModalShell title={`Cannot archive ${shortName}`} onClose={onClose}>
      <p className="text-sm text-ink-dim">
        This counterparty has <strong>{ids.length}</strong> open invoice
        {ids.length === 1 ? "" : "s"}. Resolve those first.
      </p>
      <ul className="mt-3 max-h-48 overflow-auto text-xs text-ink-muted space-y-1">
        {ids.map((id) => (
          <li key={id} className="font-mono">
            {id}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </ModalShell>
  );
}

function RestoreModal({
  shortName,
  onCancel,
  onConfirm,
}: {
  shortName: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell title={`Restore ${shortName}?`} onClose={onCancel}>
      <p className="text-sm text-ink-dim">
        Restoring brings this counterparty back into the active list.
      </p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>
        <Button
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          Restore
        </Button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        className="bg-white border border-card-border rounded-lg p-6 w-full max-w-md mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
