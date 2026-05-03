/**
 * Number/date formatting helpers used across pages.
 *
 * formatUsd: "$60,000" — no fractional cents unless under $10. Tabular numerals
 *   in the consuming element ensure columns line up.
 * formatShortDate: "2 May 2026" — readable, locale-stable in en-GB.
 * formatIsoToShortDate / formatMonthShort etc. handle the various API date
 *   shapes (ISO datetimes, "YYYY-MM-DD", "YYYY-MM").
 */

const _USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const _USD_PRECISE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  if (Math.abs(amount) > 0 && Math.abs(amount) < 10) {
    return _USD_PRECISE.format(amount);
  }
  return _USD.format(amount);
}

export function formatUsdPrecise(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return _USD_PRECISE.format(amount);
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // Try parsing "YYYY-MM-DD" plain
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const dd = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      return dd.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    }
    return iso;
  }
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMonthShort(monthIso: string): string {
  // "2026-02" → "Feb"
  const m = monthIso.match(/^(\d{4})-(\d{2})/);
  if (!m) return monthIso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[Number(m[2]) - 1] ?? monthIso;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function previousMonthLabel(today: Date = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
