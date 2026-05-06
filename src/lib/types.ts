export interface AuthUser {
  username: string;
  email: string | null;
  display_name: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export type CounterpartyStatus =
  | "onboarding"
  | "kyc"
  | "tncs"
  | "active"
  | "suspended";

export type KycStatus = "attested" | "expiring" | "expired" | "never";

export interface CounterpartySummary {
  id: number;
  short_name: string;
  name: string;
  status: CounterpartyStatus;
  roles: string[];
  currency: string;
  created_at: string | null;
  archived_at: string | null;
  kyc_status: KycStatus;
  last_invoiced_at: string | null;
  last_invoiced_amount: number | null;
}

export type SignatureStatus =
  | "signed"
  | "partially_signed"
  | "unsigned_template"
  | "unknown";

export type ContractFamily = "bilateral" | "platform_gtc";

export interface Contract {
  id: number | null;
  title: string;
  pdf_filename: string | null;
  pdf_size_bytes: number | null;
  effective_date: string | null;
  term_months: number | null;
  notice_days: number | null;
  governing_law: string | null;
  status: string;
  signature_status: SignatureStatus;
  contract_family: ContractFamily | null;
  signed_by_us: string | null;
  signed_by_them: string | null;
  signed_date: string | null;
  created_at: string | null;
}

export interface FeeSchedule {
  id: number | null;
  fee_type: "transaction" | "insurance" | "subscription" | "late_payment_surcharge" | string;
  rate: number;
  base: string;
  conditions_json: string | null;
  active: boolean;
}

export interface FeeScheduleHistoryEntry {
  fee_type: string;
  rate: number;
  base: string;
  conditions_json: string | null;
  effective_from: string | null;
  effective_to: string | null;
  changed_by_email: string | null;
  changed_at: string | null;
}

export interface FeeScheduleUpdate {
  transaction?: {
    headline_pct?: number | null;
    discount_pct?: number | null;
    effective_pct: number;
    basis?: string;
  };
  insurance?: {
    opted_in: boolean;
    rate_pct?: number | null;
    max_coverage_days?: number | null;
  };
  late_payment_surcharge?: {
    rate_pct: number;
    basis?: string | null;
  };
  currency?: string;
}

export interface KycItem {
  item_key: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
  completed_by_email: string | null;
  notes: string | null;
}

export interface BeneficialOwner {
  id: number | null;
  full_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  residence_country: string | null;
  ownership_percentage: number | null;
  is_pep: boolean;
  sanctioned: boolean;
  notes: string | null;
}

export interface KycChecks {
  identity: boolean;
  ubo: boolean;
  sanctions: boolean;
  pep: boolean;
  adverse_media: boolean;
  source_of_funds: boolean;
}

export interface KycAttestation {
  counterparty_id: number;
  status: KycStatus;
  attested_at: string | null;
  attested_by_email: string | null;
  checks: KycChecks | null;
  notes: string | null;
}

export interface AuditEntry {
  id: number;
  counterparty_id: number;
  change_type: string;
  changed_by_email: string | null;
  changed_at: string;
  field_changes: Record<string, { old: unknown; new: unknown }>;
}

export interface DashboardResponse {
  gmv_this_month: { amount_usd: number; delta_pct_vs_last_month: number; batch_count: number };
  invoiced_this_month: { amount_usd: number; invoice_count: number };
  outstanding_to_invoice: { amount_usd: number; item_count: number };
  subscriptions_due_this_month: { amount_usd: number; subscription_count: number };
  gmv_last_six_months: { month: string; amount_usd: number }[];
  counterparties_summary: { total: number; by_role: Record<string, number> };
  monthly_run_status: {
    subscriptions_due_count: number;
    subscriptions_due_total_usd: number;
    transaction_fees_pending_for_prior_month: boolean;
  };
}

export type SubscriptionPeriodStatus =
  | "due"
  | "draft_created"
  | "pushed_to_xero"
  | "paid";

export interface SubscriptionPeriod {
  counterparty_id: number;
  counterparty_short_name: string;
  counterparty_legal_name: string;
  period_start: string;
  period_end: string;
  period_label: string;
  amount_usd: number;
  due_date: string;
  status: SubscriptionPeriodStatus;
  draft_invoice_id: string | null;
  xero_invoice_id: string | null;
}

export interface GenerateDraftResult {
  counterparty_id: number;
  period_start: string;
  status: "draft_created" | "pushed_to_xero" | "skipped" | "failed";
  invoice_number: string;
  amount_usd: number;
  xero_invoice_id: string | null;
  line_item_description: string;
  detail: string | null;
}

export interface GenerateAllDueResponse {
  results: GenerateDraftResult[];
  xero_configured: boolean;
}

export type ContractDisplayStatus =
  | "signed"
  | "unsigned"
  | "expiring"
  | "expired"
  | "none";

export interface LastInvoiceSummary {
  invoice_number: string;
  invoiced_at: string;
  amount: number;
}

export interface CommercialSummary {
  currency: string;
  last_invoice: LastInvoiceSummary | null;
  mtd_billed: number;
  ytd_billed: number;
  insurance_opted_in: boolean;
  insurance_rate_pct: number | null;
  transaction_rate_headline_pct: number | null;
  transaction_rate_discount_pct: number | null;
  transaction_rate_effective_pct: number | null;
  contract_status: ContractDisplayStatus;
}

export interface CounterpartyDetail {
  id: number;
  name: string;
  short_name: string;
  customer_type: string | null;
  jurisdiction: string | null;
  company_number: string | null;
  registered_address: string | null;
  billing_address: string | null;
  billing_email: string | null;
  primary_contact_name: string | null;
  primary_contact_role: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  roles: string[];
  status: CounterpartyStatus;
  currency: string;
  payment_terms_days: number;
  xero_contact_id: string | null;
  auto_send_invoices: boolean;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  contracts: Contract[];
  fee_schedules: FeeSchedule[];
  kyc: KycItem[];
  beneficial_owners: BeneficialOwner[];
  archived_at: string | null;
  archived_by_email: string | null;
  kyc_status: KycStatus;
  kyc_attestation: KycAttestation | null;
  commercial_summary: CommercialSummary | null;
  fee_schedule_history: FeeScheduleHistoryEntry[];
}

export interface CounterpartyCreate {
  name: string;
  short_name: string;
  customer_type?: string | null;
  jurisdiction?: string | null;
  company_number?: string | null;
  registered_address?: string | null;
  billing_address?: string | null;
  billing_email?: string | null;
  primary_contact_name?: string | null;
  primary_contact_role?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  roles: string[];
  status: CounterpartyStatus;
  currency: string;
  payment_terms_days: number;
  xero_contact_id?: string | null;
  auto_send_invoices?: boolean;
  notes?: string | null;
}

export type CounterpartyPatch = Partial<CounterpartyCreate>;

export interface ArchiveBlocked {
  error: string;
  blocking_invoice_ids: string[];
}

export interface ContractExtractedFields {
  identity: {
    legal_name: string | null;
    trading_name: string | null;
    short_name: string | null;
    jurisdiction: string | null;
    company_number: string | null;
    registered_address: string | null;
    billing_email: string | null;
    roles: string[] | null;
    currency: string | null;
    primary_contact_name: string | null;
    primary_contact_role: string | null;
  };
  contract: {
    title: string | null;
    effective_date: string | null;
    term_months: number | null;
    notice_days: number | null;
    governing_law: string | null;
    signed_by_us: string | null;
    signed_by_them: string | null;
    signed_date: string | null;
  };
  fee_schedule: {
    subscription_monthly: number | null;
    subscription_billing_cadence: string | null;
    subscription_start_date: string | null;
    transaction_rate_pct: number | null;
    insurance_rate_pct: number | null;
  };
  signature_status: SignatureStatus;
  contract_family: ContractFamily | null;
  extraction_confidence: "high" | "medium" | "low" | null;
  extraction_notes: string | null;
}

export interface ContractExtractResponse {
  extracted_fields: ContractExtractedFields;
  extraction_available: boolean;
  extracted: boolean;
  error?: string;
}

export interface Batch {
  salus_id: string;
  product: string;
  into_store: string;
  product_value: number | null;
  left_store: string | null;
  is_off_blotter: boolean;
  net_weight_kg: number | null;
  powerx_id: string | null;
}

export interface ParseResponse {
  batches: Batch[];
  off_blotter_template: Record<string, unknown>;
}

export interface FeeLine {
  salus_id: string;
  description: string;
  fee_type: "transaction" | "insurance" | string;
  amount: number;
}

export interface XeroLineItem {
  description: string;
  quantity: number;
  unit_amount: number;
  account_code: string;
  line_amount: number;
  tax_type: string;
}

export interface SubscriptionDraft {
  counterparty_key: string;
  contact_id: string;
  contact_name: string;
  period_start: string;
  period_end: string;
  amount: number;
  currency: string;
  line_items: XeroLineItem[];
}

export interface CounterpartyMini {
  key: string;
  name: string;
  xero_contact_id: string;
  currency: string;
  payment_terms_days: number;
}

export interface InvoiceDraft {
  counterparty: CounterpartyMini;
  fee_lines: FeeLine[];
  subscription: SubscriptionDraft | null;
  period_str: string;
  invoice_number: string;
  total: number;
}

export interface ManualAdjustment {
  label: string;
  amount: number;
  section: "transaction" | "insurance" | "note";
}

export interface PushResult {
  invoice_number: string;
  counterparty: string;
  amount: number;
  xero_id: string | null;
  status: "created" | "skipped" | "failed" | "stub";
  detail: string | null;
}

export interface PushResponse {
  results: PushResult[];
  xero_configured: boolean;
}

export interface LedgerEntry {
  salus_id: string;
  fee_type: string;
  invoice_number: string;
  xero_invoice_id: string;
  amount: number;
  invoiced_at: string;
  invoiced_by_email: string | null;
}

export interface HealthResponse {
  status: string;
  db_ok: boolean;
  xero_configured: boolean;
}

export interface XeroHealthResponse {
  ok: boolean;
  tenant_id: string | null;
  last_token_refresh_at: string | null;
}

export type InvoiceStatus =
  | "drafted"
  | "pushed_to_xero"
  | "paid"
  | "disputed";

export interface CounterpartyInvoice {
  invoice_number: string;
  invoiced_at: string;
  period: string | null;
  salus_fee: number;
  insurance_fee: number;
  subscription_fee: number;
  other_fees: number;
  total: number;
  xero_invoice_id: string | null;
  status: InvoiceStatus;
}

export type HistoricalInvoiceFeeType =
  | "transaction_fee"
  | "insurance_admin"
  | "subscription"
  | "other";

export interface HistoricalInvoice {
  id: number;
  counterparty_id: number;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  currency: string;
  fee_type: HistoricalInvoiceFeeType;
  note: string | null;
  file_filename: string;
  file_size_bytes: number;
  file_content_type: string | null;
  uploaded_at: string | null;
  uploaded_by_email: string | null;
}

export interface HistoricalInvoiceCreate {
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  currency: string;
  fee_type: HistoricalInvoiceFeeType;
  note: string | null;
  file: File;
}

// ---------------- Off-blotter / insurance certificates ----------------

export interface InsuranceCertExtraction {
  certificate_number: string | null;
  certificate_date: string | null;
  inception_date: string | null;
  supplier_legal_name: string | null;
  supplier_address: string | null;
  buyer_legal_name: string | null;
  buyer_address: string | null;
  commodity: string | null;
  quantity: string | null;
  insured_value_amount: number | null;
  insured_value_currency: string | null;
  vessel_or_carrier: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  incoterm: string | null;
  po_reference: string | null;
  type_of_insurance: string | null;
  insurer: string | null;
  broker: string | null;
  referenced_supplier_invoice: string | null;
  loss_payee: string | null;
  additional_insured: string | null;
  extraction_confidence: "high" | "medium" | "low" | null;
  extraction_notes: string | null;
}

export interface OffBlotterCounterpartyMatch {
  id: number;
  short_name: string;
  name: string;
}

export interface OffBlotterMatch {
  candidates: OffBlotterCounterpartyMatch[];
  suggested_action: "use_existing" | "pick_one" | "create_new";
}

export interface OffBlotterExtractResponse {
  extracted_fields: InsuranceCertExtraction;
  extraction_available: boolean;
  extracted: boolean;
  error?: string;
  match: OffBlotterMatch;
}

export interface OffBlotterAccrual {
  accrual_period: string;
  days_on_risk_this_period: number;
  cumulative_days_to_period_end: number;
  fee_amount: number;
  fee_currency: string;
  invoiced: boolean;
}

export interface OffBlotterPrefillRow {
  // BatchModel-shaped — the wizard can pass these straight back through
  // ComputeIn.off_blotter without further mapping.
  salus_id: string;
  product: string;
  into_store: string;
  product_value: number;
  left_store: string | null;
  is_off_blotter: boolean;
  net_weight_kg: number | null;
  powerx_id: string | null;
  // Cert-side metadata for rendering the prefilled row.
  off_blotter_line_id: number;
  certificate_number: string | null;
  insured_value_currency: string;
  accrual_period: string;
  days_on_risk_this_period: number;
  fee_amount: number;
  fee_currency: string;
}

export interface OffBlotterPrefillResponse {
  helper_text: string;
  declarations: OffBlotterPrefillRow[];
}

export type OffBlotterStatus = "active" | "funded" | "expired" | "cancelled";

export interface OffBlotterLine {
  id: number;
  counterparty_id: number;
  certificate_number: string | null;
  certificate_pdf_filename: string | null;
  certificate_pdf_size_bytes: number | null;
  inception_date: string;
  buyer_reference: string | null;
  commodity: string | null;
  quantity_text: string | null;
  insured_value_amount: number;
  insured_value_currency: string;
  po_reference: string | null;
  referenced_supplier_invoice: string | null;
  status: OffBlotterStatus;
  funded_at: string | null;
  expires_at: string;
  days_remaining: number;
  days_used: number;
  current_month_fee: number;
  total_accrued_to_date: number;
  accruals: OffBlotterAccrual[];
  created_at: string | null;
}
