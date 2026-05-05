import type {
  AuditEntry,
  Batch,
  Contract,
  ContractExtractResponse,
  ContractFamily,
  CounterpartyCreate,
  CounterpartyDetail,
  CounterpartySummary,
  DashboardResponse,
  GenerateAllDueResponse,
  GenerateDraftResult,
  HealthResponse,
  InvoiceDraft,
  KycAttestation,
  KycChecks,
  LedgerEntry,
  LoginResponse,
  ManualAdjustment,
  OffBlotterExtractResponse,
  OffBlotterLine,
  ParseResponse,
  PushResponse,
  SignatureStatus,
  SubscriptionPeriod,
} from "./types";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://salus-invoicing.onrender.com";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const TOKEN_KEY = "salus.token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

interface RequestOpts {
  method?: string;
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  authenticated?: boolean;
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const url = new URL(API_BASE_URL + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const authenticated = opts.authenticated !== false;
  if (authenticated) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method: opts.method ?? (opts.body || opts.formData ? "POST" : "GET"),
    headers,
    signal: opts.signal,
  };
  if (opts.formData) init.body = opts.formData;
  else if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  let res: Response;
  try {
    res = await fetch(url.toString(), init);
  } catch (e) {
    throw new ApiError(
      e instanceof Error ? e.message : "Network error",
      0,
      null
    );
  }

  if (res.status === 401 && authenticated && onUnauthorized) {
    onUnauthorized();
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) ??
      (typeof data === "string" ? data : null) ??
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

export const api = {
  baseUrl: API_BASE_URL,

  health: () => request<HealthResponse>("/api/health", { authenticated: false }),

  login: (username: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: { username, password },
      authenticated: false,
    }),

  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  me: () =>
    request<{ username: string; email: string | null; display_name: string | null }>(
      "/api/me"
    ),

  listCounterparties: (includeArchived = false) =>
    request<CounterpartySummary[]>("/api/counterparties", {
      query: { include_archived: includeArchived ? "true" : undefined },
    }),

  getCounterparty: (id: number) =>
    request<CounterpartyDetail>(`/api/counterparties/${id}`),

  createCounterparty: (body: CounterpartyCreate) =>
    request<CounterpartyDetail>("/api/counterparties", {
      method: "POST",
      body,
    }),

  extractContract: (pdf: File) => {
    const fd = new FormData();
    fd.append("pdf", pdf);
    return request<ContractExtractResponse>("/api/contracts/extract", {
      method: "POST",
      formData: fd,
    });
  },

  uploadCounterpartyContract: (
    counterpartyId: number,
    input: {
      title: string;
      pdf?: File | null;
      effective_date?: string | null;
      term_months?: number | null;
      notice_days?: number | null;
      governing_law?: string | null;
      signed_by_us?: string | null;
      signed_by_them?: string | null;
      signed_date?: string | null;
      signature_status: SignatureStatus;
      contract_family?: ContractFamily | null;
      extracted_summary?: string | null;
    }
  ) => {
    const fd = new FormData();
    if (input.pdf) fd.append("pdf", input.pdf);
    fd.append("title", input.title);
    if (input.effective_date) fd.append("effective_date", input.effective_date);
    if (input.term_months !== null && input.term_months !== undefined)
      fd.append("term_months", String(input.term_months));
    if (input.notice_days !== null && input.notice_days !== undefined)
      fd.append("notice_days", String(input.notice_days));
    if (input.governing_law) fd.append("governing_law", input.governing_law);
    if (input.signed_by_us) fd.append("signed_by_us", input.signed_by_us);
    if (input.signed_by_them) fd.append("signed_by_them", input.signed_by_them);
    if (input.signed_date) fd.append("signed_date", input.signed_date);
    fd.append("signature_status", input.signature_status);
    if (input.contract_family) fd.append("contract_family", input.contract_family);
    if (input.extracted_summary)
      fd.append("extracted_summary", input.extracted_summary);
    return request<Contract>(`/api/counterparties/${counterpartyId}/contracts`, {
      method: "POST",
      formData: fd,
    });
  },

  parseInvoicing: (xlsx: File) => {
    const fd = new FormData();
    fd.append("xlsx", xlsx);
    return request<ParseResponse>("/api/invoicing/parse", {
      method: "POST",
      formData: fd,
    });
  },

  computeInvoicing: (input: {
    batches: Batch[];
    off_blotter: Batch[];
    period_str: string;
  }) =>
    request<{ drafts: InvoiceDraft[] }>("/api/invoicing/compute", {
      method: "POST",
      body: input,
    }),

  pushInvoicing: (input: {
    drafts: InvoiceDraft[];
    as_draft: boolean;
    batches?: Batch[];
    off_blotter?: Batch[];
    period_str?: string;
  }) =>
    request<PushResponse>("/api/invoicing/push", {
      method: "POST",
      body: input,
    }),

  previewInvoicingPdf: async (input: {
    draft: InvoiceDraft;
    batches: Batch[];
    off_blotter: Batch[];
    period_str: string;
    manual_adjustments: ManualAdjustment[];
  }): Promise<Blob> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/api/invoicing/preview-pdf`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      });
    } catch (e) {
      throw new ApiError(
        e instanceof Error ? e.message : "Network error",
        0,
        null
      );
    }

    if (res.status === 401 && onUnauthorized) onUnauthorized();

    if (!res.ok) {
      const text = await res.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
      const msg =
        (data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : null) ??
        (typeof data === "string" ? data : null) ??
        `Request failed (${res.status})`;
      throw new ApiError(msg, res.status, data);
    }

    return res.blob();
  },

  ledgerRecent: (limit = 50) =>
    request<LedgerEntry[]>("/api/ledger/recent", { query: { limit } }),

  dashboard: () => request<DashboardResponse>("/api/dashboard"),

  subscriptionsDue: () =>
    request<SubscriptionPeriod[]>("/api/subscriptions/due"),

  generateSubscriptionDraft: (counterparty_id: number, period_start: string) =>
    request<GenerateDraftResult>("/api/subscriptions/generate-draft", {
      method: "POST",
      body: { counterparty_id, period_start },
    }),

  generateAllDueSubscriptions: (
    items: { counterparty_id: number; period_start: string }[]
  ) =>
    request<GenerateAllDueResponse>("/api/subscriptions/generate-all-due", {
      method: "POST",
      body: { subscription_ids: items },
    }),

  patchCounterparty: (id: number, body: Partial<CounterpartyCreate>) =>
    request<CounterpartyDetail>(`/api/counterparties/${id}`, {
      method: "PATCH",
      body,
    }),

  archiveCounterparty: (id: number) => {
    // Returns either {ok:true} on success or {error, blocking_invoice_ids} on 409.
    return request<{ ok?: boolean; error?: string; blocking_invoice_ids?: string[] }>(
      `/api/counterparties/${id}`,
      { method: "DELETE" }
    );
  },

  restoreCounterparty: (id: number) =>
    request<CounterpartyDetail>(`/api/counterparties/${id}/restore`, {
      method: "POST",
      body: {},
    }),

  getCounterpartyAudit: (id: number) =>
    request<AuditEntry[]>(`/api/counterparties/${id}/audit`),

  getKyc: (id: number) =>
    request<KycAttestation>(`/api/counterparties/${id}/kyc`),

  attestKyc: (id: number, checks: KycChecks, notes: string | null) =>
    request<KycAttestation>(`/api/counterparties/${id}/kyc/attest`, {
      method: "POST",
      body: { checks, notes },
    }),

  listCounterpartiesArchived: () =>
    request<CounterpartySummary[]>("/api/counterparties", {
      query: { include_archived: "true" },
    }),

  // ---- Off-blotter (insurance certificates) ----

  extractOffBlotterCert: (pdf: File) => {
    const fd = new FormData();
    fd.append("pdf", pdf);
    return request<OffBlotterExtractResponse>("/api/off-blotter/extract", {
      method: "POST",
      formData: fd,
    });
  },

  createOffBlotterLine: (input: {
    counterparty_id: number;
    inception_date: string;
    insured_value_amount: number | string;
    insured_value_currency: string;
    certificate_number?: string | null;
    buyer_reference?: string | null;
    commodity?: string | null;
    quantity_text?: string | null;
    po_reference?: string | null;
    referenced_supplier_invoice?: string | null;
    cert_extraction_json?: string | null;
    pdf?: File | null;
  }) => {
    const fd = new FormData();
    fd.append("counterparty_id", String(input.counterparty_id));
    fd.append("inception_date", input.inception_date);
    fd.append("insured_value_amount", String(input.insured_value_amount));
    fd.append("insured_value_currency", input.insured_value_currency);
    if (input.certificate_number) fd.append("certificate_number", input.certificate_number);
    if (input.buyer_reference) fd.append("buyer_reference", input.buyer_reference);
    if (input.commodity) fd.append("commodity", input.commodity);
    if (input.quantity_text) fd.append("quantity_text", input.quantity_text);
    if (input.po_reference) fd.append("po_reference", input.po_reference);
    if (input.referenced_supplier_invoice)
      fd.append("referenced_supplier_invoice", input.referenced_supplier_invoice);
    if (input.cert_extraction_json)
      fd.append("cert_extraction_json", input.cert_extraction_json);
    if (input.pdf) fd.append("pdf", input.pdf);
    return request<OffBlotterLine>("/api/off-blotter/lines", {
      method: "POST",
      formData: fd,
    });
  },

  listOffBlotterLines: (counterpartyId: number) =>
    request<OffBlotterLine[]>(
      `/api/counterparties/${counterpartyId}/off-blotter`
    ),

  markOffBlotterFunded: (lineId: number, fundedAt: string) =>
    request<OffBlotterLine>(`/api/off-blotter/lines/${lineId}/funded`, {
      method: "POST",
      body: { funded_at: fundedAt },
    }),

  cancelOffBlotterLine: (lineId: number) =>
    request<OffBlotterLine>(`/api/off-blotter/lines/${lineId}/cancel`, {
      method: "POST",
      body: {},
    }),
};
