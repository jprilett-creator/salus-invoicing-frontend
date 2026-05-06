// Frontend-only storage for off-blotter lines entered by hand. Backend
// persistence will replace this once the manual-entry API lands.

import { useEffect, useState } from "react";

export interface ManualOffBlotterLine {
  id: string;
  counterparty_id: number;
  inception_date: string;
  insured_value_amount: number;
  insured_value_currency: string;
  certificate_number: string | null;
  buyer_reference: string | null;
  commodity: string | null;
  quantity_text: string | null;
  po_reference: string | null;
  referenced_supplier_invoice: string | null;
  notes: string | null;
  created_at: string;
}

export type NewManualOffBlotterLine = Omit<
  ManualOffBlotterLine,
  "id" | "created_at"
>;

const STORAGE_KEY = "salus.offBlotter.manual.v1";
const CHANGE_EVENT = "salus.offBlotter.manual.changed";

function readAll(): ManualOffBlotterLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ManualOffBlotterLine[];
  } catch {
    return [];
  }
}

function writeAll(lines: ManualOffBlotterLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useManualOffBlotterLines(counterpartyId: number) {
  const [lines, setLines] = useState<ManualOffBlotterLine[]>(() =>
    readAll().filter((l) => l.counterparty_id === counterpartyId)
  );

  useEffect(() => {
    const refresh = () => {
      setLines(readAll().filter((l) => l.counterparty_id === counterpartyId));
    };
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [counterpartyId]);

  const add = (input: NewManualOffBlotterLine) => {
    const all = readAll();
    const next: ManualOffBlotterLine = {
      ...input,
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    };
    writeAll([next, ...all]);
  };

  const remove = (id: string) => {
    writeAll(readAll().filter((l) => l.id !== id));
  };

  return { lines, add, remove };
}

export interface ManualLineDerived {
  days_used: number;
  days_remaining: number;
  expires_at: string;
  status: "active" | "expired";
  estimated_total_accrued: number;
}

export function deriveManualLine(
  line: ManualOffBlotterLine,
  insuranceRatePct: number | null,
  maxCoverageDays = 60,
  now: Date = new Date()
): ManualLineDerived {
  const inception = new Date(line.inception_date + "T00:00:00Z");
  const expires = new Date(inception.getTime());
  expires.setUTCDate(expires.getUTCDate() + maxCoverageDays);
  const elapsed = Math.floor(
    (now.getTime() - inception.getTime()) / (1000 * 60 * 60 * 24)
  );
  const days_used = Math.max(0, Math.min(elapsed, maxCoverageDays));
  const days_remaining = Math.max(0, maxCoverageDays - days_used);
  const status = days_remaining > 0 ? "active" : "expired";

  const ratePerDay =
    insuranceRatePct != null
      ? (line.insured_value_amount * insuranceRatePct) / 100 / maxCoverageDays
      : 0;
  const estimated_total_accrued = ratePerDay * days_used;

  return {
    days_used,
    days_remaining,
    expires_at: expires.toISOString().slice(0, 10),
    status,
    estimated_total_accrued,
  };
}
