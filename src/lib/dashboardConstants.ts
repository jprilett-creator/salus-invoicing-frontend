// Hardcoded dashboard figures for the May 2025 - May 2026 window.
// Frontend-only, until the backend dashboard pipeline catches up.

export interface MonthlyPlatformVolumePoint {
  month: string;
  gmv_usd: number;
  parcels: number;
}

export interface MonthlySubscriptionPoint {
  month: string;
  subs_usd: number;
}

export interface MonthlyFeesPoint {
  month: string;
  transaction_usd: number;
  insurance_admin_usd: number;
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

// Transaction fees billed per month. 0.2% × financing GMV for that month.
// April 2026 includes 0.2% × $326,728 ($653) on financed deals plus
// 0.2% × $287,065 ($574) on the Hartree off-blotter pair = $1,227.
export const TRANSACTION_FEES: Record<string, number> = {
  "2025-05": 141,
  "2025-06": 70,
  "2025-07": 157,
  "2025-08": 142,
  "2025-09": 206,
  "2025-10": 132,
  "2025-11": 60,
  "2025-12": 65,
  "2026-01": 131,
  "2026-02": 81,
  "2026-03": 295,
  "2026-04": 1227,
  "2026-05": 0,
};

// Insurance admin fees billed per month. 0.4% × off-blotter insured value.
// Only the April 2026 Hartree pair has insurance admin: 0.4% × $287,065.
export const INSURANCE_ADMIN_FEES: Record<string, number> = {
  "2025-05": 0,
  "2025-06": 0,
  "2025-07": 0,
  "2025-08": 0,
  "2025-09": 0,
  "2025-10": 0,
  "2025-11": 0,
  "2025-12": 0,
  "2026-01": 0,
  "2026-02": 0,
  "2026-03": 0,
  "2026-04": 1148,
  "2026-05": 0,
};

// Combined platform volume per month: GMV (financing + insurance) plus the
// number of parcels declared. April 2026 GMV combines $326,728 financing and
// $287,065 insurance; April parcels combine 2 financing + 2 insurance
// declarations.
export const MONTHLY_VOLUME: Record<string, { gmv: number; parcels: number }> = {
  "2025-05": { gmv: 70511, parcels: 7 },
  "2025-06": { gmv: 34930, parcels: 5 },
  "2025-07": { gmv: 78402, parcels: 8 },
  "2025-08": { gmv: 71162, parcels: 7 },
  "2025-09": { gmv: 102887, parcels: 8 },
  "2025-10": { gmv: 66143, parcels: 9 },
  "2025-11": { gmv: 30068, parcels: 4 },
  "2025-12": { gmv: 32569, parcels: 3 },
  "2026-01": { gmv: 65518, parcels: 3 },
  "2026-02": { gmv: 40373, parcels: 4 },
  "2026-03": { gmv: 57693, parcels: 4 },
  "2026-04": { gmv: 613793, parcels: 4 },
  "2026-05": { gmv: 0, parcels: 0 },
};

export const SUBSCRIPTIONS_BY_MONTH: MonthlySubscriptionPoint[] =
  WINDOW_MONTHS.map((month) => ({
    month,
    subs_usd: SUBSCRIPTION_REVENUE[month] ?? 0,
  }));

export const FEES_BY_MONTH: MonthlyFeesPoint[] = WINDOW_MONTHS.map(
  (month) => ({
    month,
    transaction_usd: TRANSACTION_FEES[month] ?? 0,
    insurance_admin_usd: INSURANCE_ADMIN_FEES[month] ?? 0,
  })
);

export const PLATFORM_VOLUME_BY_MONTH: MonthlyPlatformVolumePoint[] =
  WINDOW_MONTHS.map((month) => ({
    month,
    gmv_usd: MONTHLY_VOLUME[month]?.gmv ?? 0,
    parcels: MONTHLY_VOLUME[month]?.parcels ?? 0,
  }));

export const TOTAL_SUBSCRIPTIONS_USD = 240_000;
export const TOTAL_FEES_USD = 3_855;
export const TOTAL_REVENUE_USD = 243_855;
export const TOTAL_PLATFORM_VOLUME_USD = 1_264_049;
export const TOTAL_PLATFORM_PARCELS = Object.values(MONTHLY_VOLUME).reduce(
  (acc, m) => acc + m.parcels,
  0
);

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
