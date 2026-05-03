import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, FileText, Plus } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type {
  ContractExtractedFields,
  CounterpartyCreate,
  CounterpartyStatus,
} from "../lib/types";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Select } from "../components/ui/Select";
import { Label } from "../components/ui/Label";
import { Checkbox } from "../components/ui/Checkbox";
import { DropZone } from "../components/DropZone";
import { ExtractedField } from "../components/ExtractedField";
import { Spinner } from "../components/ui/Spinner";
import { useToast } from "../components/ui/Toaster";
import { PageHeader } from "../components/PageHeader";

// Persistence note: the FastAPI backend currently exposes /api/counterparties
// (JSON) but no endpoint for attaching the contract PDF or upserting fee
// schedules from the wizard. We send the counterparty fields and capture the
// contract + fees in form state for now; round-tripping those needs a backend
// follow-up. The wizard UX is fully built so the frontend doesn't change when
// the endpoints land.

interface IdentityFields {
  name: string;
  short_name: string;
  customer_type: string;
  jurisdiction: string;
  company_number: string;
  registered_address: string;
  billing_address: string;
  billing_email: string;
  primary_contact_name: string;
  primary_contact_role: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  roles: string[];
  status: CounterpartyStatus;
  currency: string;
  payment_terms_days: number;
  xero_contact_id: string;
  auto_send_invoices: boolean;
  notes: string;
}

const EMPTY_IDENTITY: IdentityFields = {
  name: "",
  short_name: "",
  customer_type: "corporate",
  jurisdiction: "",
  company_number: "",
  registered_address: "",
  billing_address: "",
  billing_email: "",
  primary_contact_name: "",
  primary_contact_role: "",
  primary_contact_email: "",
  primary_contact_phone: "",
  roles: [],
  status: "onboarding",
  currency: "USD",
  payment_terms_days: 7,
  xero_contact_id: "",
  auto_send_invoices: false,
  notes: "",
};

interface ContractFields {
  title: string;
  effective_date: string;
  term_months: string;
  notice_days: string;
  governing_law: string;
  signed_by_us: string;
  signed_by_them: string;
  signed_date: string;
}

const EMPTY_CONTRACT: ContractFields = {
  title: "",
  effective_date: "",
  term_months: "",
  notice_days: "",
  governing_law: "",
  signed_by_us: "",
  signed_by_them: "",
  signed_date: "",
};

interface FeesFields {
  transaction_pct: string; // "0.2" means 0.2%
  insurance_pct: string;
  subscription_usd: string; // monthly in USD
  subscription_start: string; // YYYY-MM-DD
}

const EMPTY_FEES: FeesFields = {
  transaction_pct: "",
  insurance_pct: "",
  subscription_usd: "",
  subscription_start: "",
};

type ExtractStage = "idle" | "extracting" | "done" | "error";

export function NewCounterpartyPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // PDF + extraction state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [extractStage, setExtractStage] = useState<ExtractStage>("idle");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractionAvailable, setExtractionAvailable] = useState<boolean>(true);

  // Form state
  const [identity, setIdentity] = useState<IdentityFields>(EMPTY_IDENTITY);
  const [contract, setContract] = useState<ContractFields>(EMPTY_CONTRACT);
  const [fees, setFees] = useState<FeesFields>(EMPTY_FEES);

  // Which keys arrived from extraction and haven't been edited.
  const [extractedKeys, setExtractedKeys] = useState<Set<string>>(new Set());
  // Which optional fee fields the user has manually opened.
  const [showFee, setShowFee] = useState<{
    transaction_pct: boolean;
    insurance_pct: boolean;
    subscription_usd: boolean;
  }>({ transaction_pct: false, insurance_pct: false, subscription_usd: false });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const markEdited = (key: string) => {
    setExtractedKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const setIdentityField = <K extends keyof IdentityFields>(
    key: K,
    value: IdentityFields[K]
  ) => {
    setIdentity((s) => ({ ...s, [key]: value }));
    markEdited(`identity.${key as string}`);
  };

  const setContractField = <K extends keyof ContractFields>(
    key: K,
    value: ContractFields[K]
  ) => {
    setContract((s) => ({ ...s, [key]: value }));
    markEdited(`contract.${key as string}`);
  };

  const setFeesField = <K extends keyof FeesFields>(
    key: K,
    value: FeesFields[K]
  ) => {
    setFees((s) => ({ ...s, [key]: value }));
    markEdited(`fees.${key as string}`);
  };

  const handlePdf = async (file: File) => {
    setPdfFile(file);
    setExtractStage("extracting");
    setExtractError(null);
    try {
      const res = await api.extractContract(file);
      setExtractionAvailable(res.extraction_available);
      if (res.extracted) {
        applyExtraction(res.extracted_fields);
        setExtractStage("done");
      } else {
        // Either no key, or extraction failed gracefully
        setExtractStage("done");
      }
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Extraction failed");
      setExtractStage("error");
    }
  };

  const applyExtraction = (fields: ContractExtractedFields) => {
    const newKeys = new Set<string>();

    const id = fields.identity;
    if (id) {
      setIdentity((prev) => {
        const next = { ...prev };
        if (id.legal_name) {
          next.name = id.legal_name;
          newKeys.add("identity.name");
        }
        if (id.short_name) {
          next.short_name = id.short_name;
          newKeys.add("identity.short_name");
        }
        if (id.jurisdiction) {
          next.jurisdiction = id.jurisdiction;
          newKeys.add("identity.jurisdiction");
        }
        if (id.company_number) {
          next.company_number = id.company_number;
          newKeys.add("identity.company_number");
        }
        if (id.registered_address) {
          next.registered_address = id.registered_address;
          newKeys.add("identity.registered_address");
        }
        if (id.billing_email) {
          next.billing_email = id.billing_email;
          newKeys.add("identity.billing_email");
        }
        if (id.currency) {
          next.currency = id.currency;
          newKeys.add("identity.currency");
        }
        if (id.primary_contact_name) {
          next.primary_contact_name = id.primary_contact_name;
          newKeys.add("identity.primary_contact_name");
        }
        if (id.primary_contact_role) {
          next.primary_contact_role = id.primary_contact_role;
          newKeys.add("identity.primary_contact_role");
        }
        if (id.roles && id.roles.length > 0) {
          next.roles = id.roles;
          newKeys.add("identity.roles");
        }
        return next;
      });
    }

    const c = fields.contract;
    setContract((prev) => {
      const next = { ...prev };
      if (c.title) {
        next.title = c.title;
        newKeys.add("contract.title");
      }
      if (c.effective_date) {
        next.effective_date = c.effective_date;
        newKeys.add("contract.effective_date");
      }
      if (c.term_months !== null && c.term_months !== undefined) {
        next.term_months = String(c.term_months);
        newKeys.add("contract.term_months");
      }
      if (c.notice_days !== null && c.notice_days !== undefined) {
        next.notice_days = String(c.notice_days);
        newKeys.add("contract.notice_days");
      }
      if (c.governing_law) {
        next.governing_law = c.governing_law;
        newKeys.add("contract.governing_law");
      }
      if (c.signed_by_us) {
        next.signed_by_us = c.signed_by_us;
        newKeys.add("contract.signed_by_us");
      }
      if (c.signed_by_them) {
        next.signed_by_them = c.signed_by_them;
        newKeys.add("contract.signed_by_them");
      }
      if (c.signed_date) {
        next.signed_date = c.signed_date;
        newKeys.add("contract.signed_date");
      }
      return next;
    });

    const fs = fields.fee_schedule;
    if (fs) {
      setFees((prev) => {
        const next = { ...prev };
        if (fs.transaction_rate_pct !== null && fs.transaction_rate_pct !== undefined) {
          next.transaction_pct = String(fs.transaction_rate_pct);
          newKeys.add("fees.transaction_pct");
        }
        if (fs.insurance_rate_pct !== null && fs.insurance_rate_pct !== undefined) {
          next.insurance_pct = String(fs.insurance_rate_pct);
          newKeys.add("fees.insurance_pct");
        }
        if (fs.subscription_monthly !== null && fs.subscription_monthly !== undefined) {
          next.subscription_usd = String(fs.subscription_monthly);
          newKeys.add("fees.subscription_usd");
        }
        if (fs.subscription_start_date) {
          next.subscription_start = fs.subscription_start_date;
          newKeys.add("fees.subscription_start");
        }
        return next;
      });
      setShowFee((prev) => ({
        transaction_pct:
          prev.transaction_pct ||
          (fs.transaction_rate_pct !== null && fs.transaction_rate_pct !== undefined),
        insurance_pct:
          prev.insurance_pct ||
          (fs.insurance_rate_pct !== null && fs.insurance_rate_pct !== undefined),
        subscription_usd:
          prev.subscription_usd ||
          (fs.subscription_monthly !== null && fs.subscription_monthly !== undefined),
      }));
    }

    setExtractedKeys((prev) => {
      const merged = new Set(prev);
      for (const k of newKeys) merged.add(k);
      return merged;
    });
  };

  const isExtracted = (key: string) => extractedKeys.has(key);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!identity.name.trim() || !identity.short_name.trim()) {
      setFormError("Legal name and short name are required.");
      return;
    }

    setSubmitting(true);
    const body: CounterpartyCreate = {
      name: identity.name.trim(),
      short_name: identity.short_name.trim(),
      customer_type: identity.customer_type || null,
      jurisdiction: nullIfBlank(identity.jurisdiction),
      company_number: nullIfBlank(identity.company_number),
      registered_address: nullIfBlank(identity.registered_address),
      billing_address: nullIfBlank(identity.billing_address),
      billing_email: nullIfBlank(identity.billing_email),
      primary_contact_name: nullIfBlank(identity.primary_contact_name),
      primary_contact_role: nullIfBlank(identity.primary_contact_role),
      primary_contact_email: nullIfBlank(identity.primary_contact_email),
      primary_contact_phone: nullIfBlank(identity.primary_contact_phone),
      roles: identity.roles,
      status: identity.status,
      currency: identity.currency,
      payment_terms_days: identity.payment_terms_days,
      xero_contact_id: nullIfBlank(identity.xero_contact_id),
      auto_send_invoices: identity.auto_send_invoices,
      notes: nullIfBlank(identity.notes),
    };

    try {
      const created = await api.createCounterparty(body);
      const tail =
        pdfFile || hasContractFields(contract) || hasFeesFields(fees)
          ? " Contract & fees attachment is coming in a follow-up."
          : "";
      toast(`Counterparty "${created.short_name}" saved.${tail}`);
      navigate("/counterparties");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Couldn't save counterparty.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const replacePdf = () => {
    setPdfFile(null);
    setExtractStage("idle");
    setExtractError(null);
    setExtractedKeys(new Set());
    setIdentity(EMPTY_IDENTITY);
    setContract(EMPTY_CONTRACT);
    setFees(EMPTY_FEES);
    setShowFee({ transaction_pct: false, insurance_pct: false, subscription_usd: false });
  };

  return (
    <>
      <PageHeader
        title="New counterparty"
        subtitle="Drop a signed contract PDF and Salus will pre-fill the form for you. Review every value before saving."
        backTo={{ to: "/counterparties", label: "Back to Counterparties" }}
      />

      <div className="px-10 py-8 max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* PDF block */}
        <section className="bg-white border border-card-border rounded-lg p-6">
          {extractStage === "idle" && (
            <DropZone
              accept="application/pdf"
              onFile={handlePdf}
              primaryText="Drop the signed contract PDF, or click to browse"
              secondaryText="Salus will read it and pre-fill what it can."
            />
          )}

          {extractStage === "extracting" && (
            <div className="flex items-center gap-3 py-6">
              <Spinner />
              <span className="text-sm text-ink-dim">
                Reading contract<span className="text-ink-muted">…</span>
              </span>
            </div>
          )}

          {extractStage === "done" && pdfFile && (
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2
                  className="h-5 w-5 text-mint shrink-0"
                  strokeWidth={2}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {pdfFile.name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {extractionAvailable
                      ? extractedKeys.size > 0
                        ? `${extractedKeys.size} field${
                            extractedKeys.size === 1 ? "" : "s"
                          } pre-filled`
                        : "No fields could be extracted; fill manually."
                      : "Extraction unavailable; fill manually."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={replacePdf}
                className="text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline shrink-0"
              >
                Replace
              </button>
            </div>
          )}

          {extractStage === "error" && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-danger shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-danger truncate">
                    Couldn&apos;t read the contract.
                  </p>
                  {extractError && (
                    <p className="text-xs text-ink-muted">{extractError}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={replacePdf}
                className="text-xs text-ink-muted hover:text-ink underline-offset-4 hover:underline shrink-0"
              >
                Try again
              </button>
            </div>
          )}
        </section>

        {/* Identity */}
        <section className="bg-white border border-card-border rounded-lg p-6">
          <SectionHeader title="Identity" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ExtractedField
              label="Legal name"
              required
              showIndicator={isExtracted("identity.name")}
              htmlFor="f-name"
            >
              <Input
                id="f-name"
                value={identity.name}
                onChange={(e) => setIdentityField("name", e.target.value)}
                required
              />
            </ExtractedField>
            <ExtractedField
              label="Short name"
              required
              showIndicator={isExtracted("identity.short_name")}
              htmlFor="f-short"
            >
              <Input
                id="f-short"
                value={identity.short_name}
                onChange={(e) =>
                  setIdentityField("short_name", e.target.value)
                }
                required
              />
            </ExtractedField>

            <div>
              <Label htmlFor="f-type">Customer type</Label>
              <Select
                id="f-type"
                value={identity.customer_type}
                onChange={(e) =>
                  setIdentityField("customer_type", e.target.value)
                }
              >
                <option value="corporate">Corporate</option>
                <option value="fund">Fund</option>
                <option value="sole_trader">Sole trader</option>
                <option value="individual">Individual</option>
              </Select>
            </div>
            <ExtractedField
              label="Jurisdiction"
              showIndicator={isExtracted("identity.jurisdiction")}
              htmlFor="f-jurisdiction"
            >
              <Input
                id="f-jurisdiction"
                value={identity.jurisdiction}
                onChange={(e) =>
                  setIdentityField("jurisdiction", e.target.value)
                }
              />
            </ExtractedField>

            <ExtractedField
              label="Company number"
              showIndicator={isExtracted("identity.company_number")}
              htmlFor="f-company"
            >
              <Input
                id="f-company"
                value={identity.company_number}
                onChange={(e) =>
                  setIdentityField("company_number", e.target.value)
                }
              />
            </ExtractedField>
            <ExtractedField
              label="Invoicing currency"
              showIndicator={isExtracted("identity.currency")}
              htmlFor="f-currency"
            >
              <Select
                id="f-currency"
                value={identity.currency}
                onChange={(e) => setIdentityField("currency", e.target.value)}
              >
                {["USD", "EUR", "GBP", "SGD", "AED"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </ExtractedField>

            <ExtractedField
              label="Registered address"
              showIndicator={isExtracted("identity.registered_address")}
              htmlFor="f-reg-addr"
              className="md:col-span-2"
            >
              <Textarea
                id="f-reg-addr"
                value={identity.registered_address}
                onChange={(e) =>
                  setIdentityField("registered_address", e.target.value)
                }
              />
            </ExtractedField>

            <ExtractedField
              label="Billing email"
              showIndicator={isExtracted("identity.billing_email")}
              htmlFor="f-bill-email"
            >
              <Input
                id="f-bill-email"
                type="email"
                value={identity.billing_email}
                onChange={(e) =>
                  setIdentityField("billing_email", e.target.value)
                }
              />
            </ExtractedField>
            <ExtractedField
              label="Roles"
              showIndicator={isExtracted("identity.roles")}
            >
              <div className="flex items-center gap-5 pt-1.5">
                <Checkbox
                  id="role-supplier"
                  checked={identity.roles.includes("supplier")}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...identity.roles, "supplier"]
                      : identity.roles.filter((r) => r !== "supplier");
                    setIdentityField("roles", next);
                  }}
                  label="Supplier"
                />
                <Checkbox
                  id="role-funder"
                  checked={identity.roles.includes("funder")}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...identity.roles, "funder"]
                      : identity.roles.filter((r) => r !== "funder");
                    setIdentityField("roles", next);
                  }}
                  label="Funder"
                />
              </div>
            </ExtractedField>

            <ExtractedField
              label="Primary contact name"
              showIndicator={isExtracted("identity.primary_contact_name")}
              htmlFor="f-pc-name"
            >
              <Input
                id="f-pc-name"
                value={identity.primary_contact_name}
                onChange={(e) =>
                  setIdentityField("primary_contact_name", e.target.value)
                }
              />
            </ExtractedField>
            <ExtractedField
              label="Primary contact role"
              showIndicator={isExtracted("identity.primary_contact_role")}
              htmlFor="f-pc-role"
            >
              <Input
                id="f-pc-role"
                value={identity.primary_contact_role}
                onChange={(e) =>
                  setIdentityField("primary_contact_role", e.target.value)
                }
              />
            </ExtractedField>
            <div>
              <Label htmlFor="f-pc-email">Primary contact email</Label>
              <Input
                id="f-pc-email"
                type="email"
                value={identity.primary_contact_email}
                onChange={(e) =>
                  setIdentityField("primary_contact_email", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="f-pc-phone">Primary contact phone</Label>
              <Input
                id="f-pc-phone"
                value={identity.primary_contact_phone}
                onChange={(e) =>
                  setIdentityField("primary_contact_phone", e.target.value)
                }
              />
            </div>
          </div>
        </section>

        {/* Contract terms */}
        <section className="bg-white border border-card-border rounded-lg p-6">
          <SectionHeader title="Contract terms" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ExtractedField
              label="Title"
              showIndicator={isExtracted("contract.title")}
              htmlFor="c-title"
              className="md:col-span-2"
            >
              <Input
                id="c-title"
                value={contract.title}
                onChange={(e) => setContractField("title", e.target.value)}
              />
            </ExtractedField>
            <ExtractedField
              label="Effective date"
              showIndicator={isExtracted("contract.effective_date")}
              htmlFor="c-effective"
            >
              <Input
                id="c-effective"
                type="date"
                value={contract.effective_date}
                onChange={(e) =>
                  setContractField("effective_date", e.target.value)
                }
              />
            </ExtractedField>
            <ExtractedField
              label="Signed date"
              showIndicator={isExtracted("contract.signed_date")}
              htmlFor="c-signed-date"
            >
              <Input
                id="c-signed-date"
                type="date"
                value={contract.signed_date}
                onChange={(e) =>
                  setContractField("signed_date", e.target.value)
                }
              />
            </ExtractedField>
            <ExtractedField
              label="Term (months)"
              showIndicator={isExtracted("contract.term_months")}
              htmlFor="c-term"
            >
              <Input
                id="c-term"
                type="number"
                min={0}
                value={contract.term_months}
                onChange={(e) =>
                  setContractField("term_months", e.target.value)
                }
              />
            </ExtractedField>
            <ExtractedField
              label="Notice period (days)"
              showIndicator={isExtracted("contract.notice_days")}
              htmlFor="c-notice"
            >
              <Input
                id="c-notice"
                type="number"
                min={0}
                value={contract.notice_days}
                onChange={(e) =>
                  setContractField("notice_days", e.target.value)
                }
              />
            </ExtractedField>
            <ExtractedField
              label="Governing law"
              showIndicator={isExtracted("contract.governing_law")}
              htmlFor="c-law"
            >
              <Input
                id="c-law"
                value={contract.governing_law}
                onChange={(e) =>
                  setContractField("governing_law", e.target.value)
                }
              />
            </ExtractedField>
            <ExtractedField
              label="Signed by us"
              showIndicator={isExtracted("contract.signed_by_us")}
              htmlFor="c-signed-us"
            >
              <Input
                id="c-signed-us"
                value={contract.signed_by_us}
                onChange={(e) =>
                  setContractField("signed_by_us", e.target.value)
                }
              />
            </ExtractedField>
            <ExtractedField
              label="Signed by them"
              showIndicator={isExtracted("contract.signed_by_them")}
              htmlFor="c-signed-them"
            >
              <Input
                id="c-signed-them"
                value={contract.signed_by_them}
                onChange={(e) =>
                  setContractField("signed_by_them", e.target.value)
                }
              />
            </ExtractedField>
          </div>
        </section>

        {/* Fees */}
        <section className="bg-white border border-card-border rounded-lg p-6">
          <SectionHeader title="Fee schedule" />
          <p className="-mt-1 mb-5 text-xs text-ink-muted">
            Only fees you opt in are saved. Use the link below to add the ones
            extraction didn&apos;t find.
          </p>
          <div className="space-y-5">
            {showFee.transaction_pct ||
            isExtracted("fees.transaction_pct") ||
            fees.transaction_pct ? (
              <ExtractedField
                label="Transaction fee"
                showIndicator={isExtracted("fees.transaction_pct")}
                htmlFor="f-tx"
                hint="As a percentage of product value, on tokenisation."
              >
                <div className="flex items-center gap-2">
                  <Input
                    id="f-tx"
                    type="number"
                    step="0.01"
                    min={0}
                    value={fees.transaction_pct}
                    onChange={(e) =>
                      setFeesField("transaction_pct", e.target.value)
                    }
                    className="max-w-[10rem]"
                  />
                  <span className="text-sm text-ink-muted">% of value</span>
                </div>
              </ExtractedField>
            ) : null}

            {showFee.insurance_pct ||
            isExtracted("fees.insurance_pct") ||
            fees.insurance_pct ? (
              <ExtractedField
                label="Insurance admin fee"
                showIndicator={isExtracted("fees.insurance_pct")}
                htmlFor="f-ins"
                hint="As a percentage of value (30-day floor + prorated)."
              >
                <div className="flex items-center gap-2">
                  <Input
                    id="f-ins"
                    type="number"
                    step="0.01"
                    min={0}
                    value={fees.insurance_pct}
                    onChange={(e) =>
                      setFeesField("insurance_pct", e.target.value)
                    }
                    className="max-w-[10rem]"
                  />
                  <span className="text-sm text-ink-muted">% of value</span>
                </div>
              </ExtractedField>
            ) : null}

            {showFee.subscription_usd ||
            isExtracted("fees.subscription_usd") ||
            fees.subscription_usd ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ExtractedField
                  label="Monthly subscription"
                  showIndicator={isExtracted("fees.subscription_usd")}
                  htmlFor="f-sub"
                  hint="Billed quarterly in advance."
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-muted">USD</span>
                    <Input
                      id="f-sub"
                      type="number"
                      step="100"
                      min={0}
                      value={fees.subscription_usd}
                      onChange={(e) =>
                        setFeesField("subscription_usd", e.target.value)
                      }
                    />
                  </div>
                </ExtractedField>
                <ExtractedField
                  label="Subscription start"
                  showIndicator={isExtracted("fees.subscription_start")}
                  htmlFor="f-sub-start"
                >
                  <Input
                    id="f-sub-start"
                    type="date"
                    value={fees.subscription_start}
                    onChange={(e) =>
                      setFeesField("subscription_start", e.target.value)
                    }
                  />
                </ExtractedField>
              </div>
            ) : null}

            <AddFeeMenu
              show={showFee}
              setShow={setShowFee}
            />
          </div>
        </section>

        {/* Bottom actions */}
        {formError && (
          <p className="text-sm text-danger" role="alert">
            {formError}
          </p>
        )}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Link
            to="/counterparties"
            className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            loading={submitting}
            disabled={submitting}
            className="min-w-[14rem]"
          >
            Save counterparty
          </Button>
        </div>
      </form>
      </div>
    </>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-base font-semibold text-ink mb-5 uppercase tracking-wide">
      {title}
    </h2>
  );
}

function AddFeeMenu({
  show,
  setShow,
}: {
  show: { transaction_pct: boolean; insurance_pct: boolean; subscription_usd: boolean };
  setShow: React.Dispatch<
    React.SetStateAction<{
      transaction_pct: boolean;
      insurance_pct: boolean;
      subscription_usd: boolean;
    }>
  >;
}) {
  const all = [
    { key: "transaction_pct", label: "Transaction fee" },
    { key: "insurance_pct", label: "Insurance admin fee" },
    { key: "subscription_usd", label: "Monthly subscription" },
  ] as const;
  const items = all.filter((i) => !show[i.key]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
      <span className="text-xs text-ink-muted">+ Add a fee:</span>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setShow((s) => ({ ...s, [item.key]: true }))}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-mint-deep underline-offset-4 hover:underline transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

function nullIfBlank(s: string): string | null {
  return s.trim() ? s.trim() : null;
}

function hasContractFields(c: ContractFields): boolean {
  return Object.values(c).some((v) => v && v.toString().trim());
}

function hasFeesFields(f: FeesFields): boolean {
  return Object.values(f).some((v) => v && v.toString().trim());
}
