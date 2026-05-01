import type {
  Batch,
  ContractExtractResponse,
  CounterpartyCreate,
  CounterpartyDetail,
  CounterpartySummary,
  HealthResponse,
  InvoiceDraft,
  LedgerEntry,
  LoginResponse,
  ParseResponse,
  PushResponse,
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

  ledgerRecent: (limit = 50) =>
    request<LedgerEntry[]>("/api/ledger/recent", { query: { limit } }),
};
