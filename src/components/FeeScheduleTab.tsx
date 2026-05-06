import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Pencil } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type {
  CounterpartyDetail,
  FeeSchedule,
  FeeScheduleHistoryEntry,
  FeeScheduleUpdate,
} from "../lib/types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Checkbox } from "./ui/Checkbox";
import { Select } from "./ui/Select";
import { useToast } from "./ui/Toaster";
import { formatShortDate, formatUsdPrecise } from "../lib/format";
import { getOutstandingFees } from "../lib/dashboardConstants";

const DEFAULT_LATE_RATE = 1.5; // % per Annex A

export function FeeScheduleTab({ cp }: { cp: CounterpartyDetail }) {
  const [editing, setEditing] = useState(false);
  const outstanding = getOutstandingFees(cp.short_name);
  return (
    <div className="space-y-6">
      <div className="bg-white border border-card-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-ink">Fee schedule</h2>
          {!editing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Edit
            </Button>
          )}
        </div>
        {editing ? (
          <FeeScheduleForm
            cp={cp}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        ) : (
          <FeeScheduleView cp={cp} />
        )}
      </div>
      {outstanding.length > 0 && <OutstandingFeesPanel lines={outstanding} />}
      {cp.fee_schedule_history.length > 0 && (
        <div className="bg-white border border-card-border rounded-lg p-6">
          <h3 className="text-sm font-semibold text-ink mb-3">Change history</h3>
          <HistoryTable entries={cp.fee_schedule_history} />
        </div>
      )}
    </div>
  );
}

function OutstandingFeesPanel({
  lines,
}: {
  lines: ReturnType<typeof getOutstandingFees>;
}) {
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return (
    <div className="bg-white border border-card-border rounded-lg p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warn" strokeWidth={2} />
            Outstanding line items
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Accrued fees not yet on a Xero invoice.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">
            Total outstanding
          </div>
          <div className="text-base font-semibold text-ink tabular-nums">
            {formatUsdPrecise(total)}
          </div>
        </div>
      </div>
      <ul className="divide-y divide-card-border border border-card-border rounded-md overflow-hidden">
        {lines.map((l, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <div className="text-ink truncate">{l.description}</div>
              {l.notes && (
                <div className="mt-0.5 text-xs text-ink-muted">{l.notes}</div>
              )}
            </div>
            <div className="text-right tabular-nums shrink-0">
              <div className="text-ink font-medium">
                {formatUsdPrecise(l.amount)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                {l.fee_type === "insurance"
                  ? "Insurance admin"
                  : l.fee_type === "transaction"
                  ? "Transaction"
                  : l.fee_type}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function pickFee(cp: CounterpartyDetail, type: string): FeeSchedule | undefined {
  return cp.fee_schedules.find((f) => f.fee_type === type);
}

function parseConditions(c: string | null | undefined): Record<string, unknown> {
  if (!c) return {};
  try {
    return JSON.parse(c) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function FeeScheduleView({ cp }: { cp: CounterpartyDetail }) {
  const tx = pickFee(cp, "transaction");
  const txCond = parseConditions(tx?.conditions_json);
  const headline = (txCond.headline_pct as number | undefined) ?? null;
  const discount = (txCond.discount_pct as number | undefined) ?? null;
  const basis = (txCond.basis as string | undefined) ?? "% of GMV per cycle";

  const ins = pickFee(cp, "insurance");
  const insCond = parseConditions(ins?.conditions_json);
  const maxDays = (insCond.max_coverage_days as number | undefined) ?? 60;

  const lps = pickFee(cp, "late_payment_surcharge");
  const lpsRate = lps?.rate ?? DEFAULT_LATE_RATE;

  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
      <Row
        label="Salus transaction fee"
        value={
          tx ? (
            <div>
              {headline != null && (
                <div className="text-xs text-ink-muted">
                  Headline {headline.toFixed(2).replace(/\.?0+$/, "")}%
                </div>
              )}
              {discount != null && discount !== 0 && (
                <div className="text-xs text-warn-deep">
                  −{Math.abs(discount).toFixed(2).replace(/\.?0+$/, "")}%
                </div>
              )}
              <div className="text-base font-semibold text-ink">
                {tx.rate.toFixed(2).replace(/\.?0+$/, "")}%
                <span className="ml-1 text-[10px] text-ink-muted uppercase tracking-wide">
                  effective
                </span>
              </div>
              <div className="text-xs text-ink-muted mt-0.5">{basis}</div>
            </div>
          ) : (
            <span className="text-ink-muted">Not set</span>
          )
        }
      />

      <Row
        label="Insurance admin fee"
        value={
          ins ? (
            <div>
              <div className="text-base font-semibold text-mint-deep">
                Opted in — {ins.rate.toFixed(2).replace(/\.?0+$/, "")}%
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                Max coverage {maxDays} days; prorated per Annex B.
              </div>
            </div>
          ) : (
            <span className="text-ink-muted">Not opted in</span>
          )
        }
      />

      <Row
        label="Late payment surcharge"
        value={
          <div>
            <div className="text-base font-semibold text-ink">
              {lpsRate.toFixed(2).replace(/\.?0+$/, "")}%
            </div>
            <div className="text-xs text-ink-muted mt-0.5">
              Default {DEFAULT_LATE_RATE}% per Annex A.
            </div>
          </div>
        }
      />

      <Row
        label="Currency of fees"
        value={<span className="text-base font-semibold text-ink">{cp.currency}</span>}
      />
    </dl>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

function FeeScheduleForm({
  cp,
  onCancel,
  onSaved,
}: {
  cp: CounterpartyDetail;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const tx = pickFee(cp, "transaction");
  const txCond = parseConditions(tx?.conditions_json);
  const ins = pickFee(cp, "insurance");
  const insCond = parseConditions(ins?.conditions_json);
  const lps = pickFee(cp, "late_payment_surcharge");

  const [txEffective, setTxEffective] = useState<string>(
    tx ? String(tx.rate) : ""
  );
  const [txHeadline, setTxHeadline] = useState<string>(
    txCond.headline_pct != null ? String(txCond.headline_pct) : ""
  );
  const [txDiscount, setTxDiscount] = useState<string>(
    txCond.discount_pct != null ? String(txCond.discount_pct) : ""
  );

  const [insOptedIn, setInsOptedIn] = useState<boolean>(!!ins);
  const [insRate, setInsRate] = useState<string>(ins ? String(ins.rate) : "0.20");
  const [insMaxDays, setInsMaxDays] = useState<string>(
    insCond.max_coverage_days != null ? String(insCond.max_coverage_days) : "60"
  );

  const [lpsRate, setLpsRate] = useState<string>(
    lps ? String(lps.rate) : String(DEFAULT_LATE_RATE)
  );

  const [currency, setCurrency] = useState<string>(cp.currency);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const body: FeeScheduleUpdate = {};
      if (txEffective.trim()) {
        const eff = Number(txEffective);
        if (!Number.isFinite(eff)) throw new Error("Invalid transaction effective rate");
        body.transaction = {
          effective_pct: eff,
          headline_pct: txHeadline.trim() ? Number(txHeadline) : null,
          discount_pct: txDiscount.trim() ? Number(txDiscount) : null,
          basis: "% of GMV per cycle",
        };
      }
      body.insurance = insOptedIn
        ? {
            opted_in: true,
            rate_pct: Number(insRate),
            max_coverage_days: insMaxDays.trim() ? Number(insMaxDays) : 60,
          }
        : { opted_in: false };
      if (lpsRate.trim()) {
        body.late_payment_surcharge = { rate_pct: Number(lpsRate) };
      }
      if (currency && currency !== cp.currency) body.currency = currency;
      return api.updateFeeSchedules(cp.id, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["counterparty", cp.id] });
      toast("Fee schedule updated.");
      onSaved();
    },
    onError: (e) => {
      setError(
        e instanceof ApiError ? e.message :
        e instanceof Error ? e.message : "Save failed."
      );
    },
  });

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        save.mutate();
      }}
    >
      <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="tx-headline">Headline transaction %</Label>
          <Input
            id="tx-headline"
            type="number"
            step="0.01"
            min={0}
            value={txHeadline}
            onChange={(e) => setTxHeadline(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="tx-discount">Discount % (negative)</Label>
          <Input
            id="tx-discount"
            type="number"
            step="0.01"
            value={txDiscount}
            onChange={(e) => setTxDiscount(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="tx-effective">Effective transaction %</Label>
          <Input
            id="tx-effective"
            type="number"
            step="0.01"
            min={0}
            required
            value={txEffective}
            onChange={(e) => setTxEffective(e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset>
        <Checkbox
          id="ins-opt"
          checked={insOptedIn}
          onChange={(e) => setInsOptedIn(e.target.checked)}
          label="Opted in to insurance admin fee"
        />
        {insOptedIn && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <Label htmlFor="ins-rate">Insurance rate %</Label>
              <Input
                id="ins-rate"
                type="number"
                step="0.01"
                min={0}
                value={insRate}
                onChange={(e) => setInsRate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ins-days">Max coverage (days)</Label>
              <Input
                id="ins-days"
                type="number"
                min={0}
                value={insMaxDays}
                onChange={(e) => setInsMaxDays(e.target.value)}
              />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lps-rate">Late payment surcharge %</Label>
          <Input
            id="lps-rate"
            type="number"
            step="0.01"
            min={0}
            value={lpsRate}
            onChange={(e) => setLpsRate(e.target.value)}
          />
          <p className="text-xs text-ink-muted mt-1">
            Default {DEFAULT_LATE_RATE}% per Annex A.
          </p>
        </div>
        <div>
          <Label htmlFor="cp-currency">Currency</Label>
          <Select
            id="cp-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {["USD", "EUR", "GBP", "SGD", "AED"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
        >
          Cancel
        </button>
        <Button type="submit" loading={save.isPending} disabled={save.isPending}>
          Save fee schedule
        </Button>
      </div>
    </form>
  );
}

function HistoryTable({ entries }: { entries: FeeScheduleHistoryEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-ink-muted">
            <th className="py-2 pr-4 font-medium">When</th>
            <th className="py-2 pr-4 font-medium">Fee type</th>
            <th className="py-2 pr-4 font-medium">Old rate</th>
            <th className="py-2 pr-4 font-medium">Effective from</th>
            <th className="py-2 pr-4 font-medium">Effective to</th>
            <th className="py-2 pr-4 font-medium">Changed by</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className="border-t border-card-border">
              <td className="py-2 pr-4 text-ink-muted whitespace-nowrap">
                {e.changed_at ? formatShortDate(e.changed_at) : "—"}
              </td>
              <td className="py-2 pr-4">{labelForType(e.fee_type)}</td>
              <td className="py-2 pr-4">
                {e.rate.toFixed(2).replace(/\.?0+$/, "")}%
              </td>
              <td className="py-2 pr-4 text-ink-muted">
                {e.effective_from ? formatShortDate(e.effective_from) : "—"}
              </td>
              <td className="py-2 pr-4 text-ink-muted">
                {e.effective_to ? formatShortDate(e.effective_to) : "—"}
              </td>
              <td className="py-2 pr-4 text-ink-muted truncate">
                {e.changed_by_email ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function labelForType(t: string): string {
  return (
    {
      transaction: "Transaction",
      insurance: "Insurance",
      subscription: "Subscription",
      late_payment_surcharge: "Late surcharge",
    } as Record<string, string>
  )[t] ?? t;
}
