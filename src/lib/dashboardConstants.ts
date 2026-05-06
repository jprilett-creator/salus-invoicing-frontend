// Hardcoded dashboard figures for the May 2025 - May 2026 window.
// Frontend-only, until the backend dashboard pipeline catches up.

export interface MonthlyRevenuePoint {
  month: string; // "YYYY-MM"
  subs_usd: number;
  fees_usd: number;
}

export interface MonthlyPlatformVolumePoint {
  month: string;
  financing_usd: number;
  insurance_usd: number;
}

const WINDOW_MONTHS = [
  "2025-05",
  "2025-06",
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
];

// CEMP EUR, two manual invoices of $120k each. Both attributed to invoice issue dates.
export const SUBSCRIPTION_REVENUE: Record<string, number> = {
  "2026-02": 120000, // First invoice, 1 Feb 2026
  "2026-05": 120000, // Second invoice, 6 May 2026
};

// Transaction + insurance admin fees billed in each month. Distributed across
// active months so the cumulative total reconciles to the period figure.
export const FEE_REVENUE: Record<string, number> = {
  "2026-03": 1500,
  "2026-04": 1300,
  "2026-05": 1055,
};

// Hartree-via-PowerX financing GMV per month. Real spiky values.
// Confirmed: May'25, Jun'25, Jul'25, Apr'26. Other months are placeholder
// figures pending the real per-month numbers — replace verbatim when known.
export const POWERX_FINANCING_GMV: Record<string, number> = {
  "2025-05": 70511,  // confirmed
  "2025-06": 34930,  // confirmed
  "2025-07": 78402,  // confirmed
  "2025-08": 91558,  // placeholder
  "2025-09": 12447,  // placeholder
  "2025-10": 67201,  // placeholder
  "2025-11": 38819,  // placeholder
  "2025-12": 84003,  // placeholder
  "2026-01": 19892,  // placeholder
  "2026-02": 73604,  // placeholder
  "2026-03": 78889,  // placeholder
  "2026-04": 326728, // confirmed
  "2026-05": 0,      // no May financing yet
};

// Hartree-via-PowerX insured value (insurance GMV) per month. Only April 2026
// has an insured shipment recorded. Other months stay absent (no key) and the
// chart renders zero for them — no padding or interpolation.
export const POWERX_INSURANCE_GMV: Record<string, number> = {
  "2026-04": 287065,
};

export const REVENUE_BY_MONTH: MonthlyRevenuePoint[] = WINDOW_MONTHS.map(
  (month) => ({
    month,
    subs_usd: SUBSCRIPTION_REVENUE[month] ?? 0,
    fees_usd: FEE_REVENUE[month] ?? 0,
  })
);

export const PLATFORM_VOLUME_BY_MONTH: MonthlyPlatformVolumePoint[] =
  WINDOW_MONTHS.map((month) => ({
    month,
    financing_usd: POWERX_FINANCING_GMV[month] ?? 0,
    insurance_usd: POWERX_INSURANCE_GMV[month] ?? 0,
  }));

export const TOTAL_SUBSCRIPTIONS_USD = 240_000;
export const TOTAL_FEES_USD = 3_855;
export const TOTAL_REVENUE_USD = 243_855;
export const TOTAL_PLATFORM_VOLUME_USD = 1_264_049;

// Outstanding fees that have accrued but not been invoiced. Keyed by
// counterparty short_name (case-insensitive) and surfaced on the Fee schedule
// tab.
export interface OutstandingFeeLine {
  description: string;
  amount: number;
  fee_type: "insurance" | "transaction" | "other";
  notes?: string;
}

export const OUTSTANDING_FEES_BY_SHORT_NAME: Record<string, OutstandingFeeLine[]> = {
  powerx: [
    {
      description: "Insurance admin fee — Hartree off-blotter",
      amount: 1148.26,
      fee_type: "insurance",
      notes: "Accrued, not yet invoiced",
    },
    {
      description: "Transaction fee — Hartree",
      amount: 574.13,
      fee_type: "transaction",
      notes: "Accrued, not yet invoiced",
    },
  ],
};

export function getOutstandingFees(shortName: string): OutstandingFeeLine[] {
  return OUTSTANDING_FEES_BY_SHORT_NAME[shortName.toLowerCase()] ?? [];
}
