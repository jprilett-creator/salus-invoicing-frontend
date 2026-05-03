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

export interface CounterpartySummary {
  id: number;
  short_name: string;
  name: string;
  status: CounterpartyStatus;
  roles: string[];
  currency: string;
  created_at: string | null;
}

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
  signed_by_us: string | null;
  signed_by_them: string | null;
  signed_date: string | null;
  created_at: string | null;
}

export interface FeeSchedule {
  id: number | null;
  fee_type: "transaction" | "insurance" | "subscription" | string;
  rate: number;
  base: string;
  conditions_json: string | null;
  active: boolean;
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

export interface ContractExtractedFields {
  identity: {
    legal_name: string | null;
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
