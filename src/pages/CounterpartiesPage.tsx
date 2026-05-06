import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, ChevronRight, Plus, Search } from "lucide-react";
import { api } from "../lib/api";
import type { CounterpartySummary, KycStatus } from "../lib/types";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { NeutralBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/PageHeader";
import { RevenueChart, RevenueChartLegend } from "../components/RevenueChart";
import { formatShortDate, formatUsd, previousMonthLabel } from "../lib/format";
import {
  REVENUE_BY_MONTH,
  TOTAL_FEES_USD,
  TOTAL_PLATFORM_VOLUME_USD,
  TOTAL_REVENUE_USD,
  TOTAL_SUBSCRIPTIONS_USD,
} from "../lib/dashboardConstants";
import { cn } from "../lib/cn";

const ROLE_LABEL: Record<string, string> = {
  funder: "Funder",
  supplier: "Supplier",
};

export function CounterpartiesPage() {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const cpQuery = useQuery({
    queryKey: ["counterparties", showArchived ? "with-archived" : "active"],
    queryFn: () =>
      showArchived ? api.listCounterpartiesArchived() : api.listCounterparties(),
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard(),
  });

  const filtered = useMemo(() => {
    const data = cpQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return data.filter((c) =>
      q
        ? c.short_name.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q)
        : true
    );
  }, [cpQuery.data, search]);

  const dashboard = dashboardQuery.data;
  const monthly = dashboard?.monthly_run_status;
  const showSubscriptionBanner = (monthly?.subscriptions_due_count ?? 0) > 0;
  const showInvoicingBanner =
    !showSubscriptionBanner && monthly?.transaction_fees_pending_for_prior_month;

  return (
    <>
      <PageHeader
        title="Counterparties"
        subtitle="Suppliers and funders billed by Salus."
      />

      <div className="px-10 py-8 space-y-6">
        {showSubscriptionBanner && (
          <Banner
            text={
              <>
                <strong className="font-semibold">
                  {monthly!.subscriptions_due_count}
                </strong>{" "}
                subscription{monthly!.subscriptions_due_count === 1 ? "" : "s"}{" "}
                due this month totalling{" "}
                <strong className="font-semibold">
                  {formatUsd(monthly!.subscriptions_due_total_usd)}
                </strong>
                .
              </>
            }
            cta={{ label: "Generate", to: "/subscriptions" }}
          />
        )}
        {showInvoicingBanner && (
          <Banner
            text={
              <>
                Time to run monthly invoicing for{" "}
                <strong className="font-semibold">{previousMonthLabel()}</strong>.
              </>
            }
            cta={{ label: "Run invoicing", to: "/run-invoicing" }}
          />
        )}

        {/* Dashboard panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total revenue"
            value={formatUsd(TOTAL_REVENUE_USD)}
            supporting="Subscriptions + fees, May 2025 to date"
          />
          <MetricCard
            label="Subscriptions to date"
            value={formatUsd(TOTAL_SUBSCRIPTIONS_USD)}
            supporting="2 invoices issued"
            href="/subscriptions"
          />
          <MetricCard
            label="Fees to date"
            value={formatUsd(TOTAL_FEES_USD)}
            supporting="Transaction + insurance admin"
          />
          <MetricCard
            label="Platform volume"
            value={formatUsd(TOTAL_PLATFORM_VOLUME_USD)}
            supporting="Financing + insurance GMV"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
          <div className="bg-white border border-card-border rounded-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                  Revenue by month
                </div>
                <div className="mt-1 text-xs text-ink-muted">
                  May 2025 – May 2026
                </div>
              </div>
              <RevenueChartLegend />
            </div>
            <div className="mt-3">
              <RevenueChart data={REVENUE_BY_MONTH} />
            </div>
          </div>
          <div className="bg-white border border-card-border rounded-lg p-6">
            <div className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
              Active counterparties
            </div>
            {dashboard ? (
              <>
                <div className="mt-3 text-3xl font-semibold text-ink tabular-nums">
                  {dashboard.counterparties_summary.total}
                </div>
                <div className="mt-2 text-xs text-ink-muted">
                  {Object.entries(dashboard.counterparties_summary.by_role)
                    .map(([k, v]) => `${v} ${ROLE_LABEL[k] ?? k}${v === 1 ? "" : "s"}`)
                    .join(" · ") || "—"}
                </div>
              </>
            ) : (
              <div className="mt-3 text-sm text-ink-muted">—</div>
            )}
          </div>
        </div>

        {/* Counterparty list */}
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-ink">All counterparties</h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              Identity, KYC, and billing relationships.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
                strokeWidth={1.75}
              />
              <input
                type="search"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 pl-8 pr-3 py-2 text-sm bg-white border border-card-border rounded-md text-ink placeholder:text-ink-muted/70 focus:border-mint focus:ring-1 focus:ring-mint focus:outline-none"
              />
            </div>
            <Link to="/counterparties/new">
              <Button size="md" className="whitespace-nowrap">
                <Plus className="h-4 w-4" strokeWidth={2.25} />
                New counterparty
              </Button>
            </Link>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-ink-muted -mt-3">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-card-border text-mint focus:ring-mint"
          />
          Show archived
        </label>

        {cpQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner foreground={false} />
          </div>
        ) : cpQuery.isError ? (
          <div className="bg-white border border-card-border rounded-lg p-6">
            <p className="text-sm text-danger">
              Couldn&apos;t load counterparties.{" "}
              {(cpQuery.error as Error).message}
            </p>
          </div>
        ) : filtered.length > 0 ? (
          <CounterpartyTable rows={filtered} />
        ) : cpQuery.data && cpQuery.data.length === 0 ? (
          <div className="bg-white border border-card-border rounded-lg">
            <EmptyState
              icon={
                <Building2 className="h-10 w-10" strokeWidth={1.25} aria-hidden />
              }
              title="No counterparties yet"
              description="Add the first one. Drop in a signed contract PDF and Salus will pre-fill the form for you."
              action={
                <Link to="/counterparties/new">
                  <Button>
                    <Plus className="h-4 w-4" strokeWidth={2.25} />
                    New counterparty
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="bg-white border border-card-border rounded-lg p-10 text-center">
            <p className="text-sm text-ink-muted">No matches in this view.</p>
          </div>
        )}
      </div>
    </>
  );
}

function Banner({
  text,
  cta,
}: {
  text: React.ReactNode;
  cta: { label: string; to: string };
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-mint-dim border border-mint/40 rounded-lg px-5 py-3">
      <div className="text-sm text-ink">{text}</div>
      <Link
        to={cta.to}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-mint-deep hover:underline whitespace-nowrap"
      >
        {cta.label}
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </div>
  );
}

function MetricCard({
  label,
  value,
  supporting,
  href,
}: {
  label: string;
  value: string;
  supporting?: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="bg-white border border-card-border rounded-lg p-5 h-full">
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-ink tabular-nums">
        {value}
      </div>
      <div className="mt-1.5 text-xs text-ink-muted">{supporting ?? " "}</div>
    </div>
  );
  if (href) {
    return (
      <Link
        to={href}
        className="block transition-colors hover:[&>div]:border-mint"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

function CounterpartyTable({ rows }: { rows: CounterpartySummary[] }) {
  return (
    <div className="bg-white border border-card-border rounded-lg overflow-hidden">
      <div className="hidden md:grid grid-cols-[1.4fr_2fr_1.2fr_0.7fr_1.4fr_1.1fr_24px] gap-4 px-5 py-3 border-b border-card-border bg-page text-[10px] font-medium uppercase tracking-wider text-ink-muted">
        <span>Short name</span>
        <span>Legal name</span>
        <span>Roles</span>
        <span>Currency</span>
        <span>Last invoice</span>
        <span>Status</span>
        <span />
      </div>
      <ul className="divide-y divide-card-border">
        {rows.map((cp) => (
          <li key={cp.id}>
            <Link
              to={`/counterparties/${cp.id}`}
              className="grid grid-cols-1 md:grid-cols-[1.4fr_2fr_1.2fr_0.7fr_1.4fr_1.1fr_24px] gap-4 items-center px-5 py-3.5 hover:bg-page transition-colors group"
            >
              <div className="text-sm font-semibold text-ink truncate">
                {cp.short_name}
              </div>
              <div className="text-xs text-ink-muted truncate">{cp.name}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {cp.roles.length === 0 ? (
                  <span className="text-xs text-ink-muted">—</span>
                ) : (
                  cp.roles.map((r) => (
                    <NeutralBadge key={r}>{ROLE_LABEL[r] ?? r}</NeutralBadge>
                  ))
                )}
              </div>
              <div className="text-xs text-ink-muted">{cp.currency}</div>
              <div className="text-xs text-ink-muted truncate tabular-nums">
                {cp.last_invoiced_at
                  ? `${formatShortDate(cp.last_invoiced_at)} · ${formatUsd(
                      cp.last_invoiced_amount
                    )}`
                  : "—"}
              </div>
              <div>
                <ListStatusBadge
                  archived={Boolean(cp.archived_at)}
                  kyc={cp.kyc_status}
                />
              </div>
              <div className="hidden md:flex justify-end">
                <ChevronRight className="h-4 w-4 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListStatusBadge({
  archived,
  kyc,
}: {
  archived: boolean;
  kyc: KycStatus;
}) {
  let label = "";
  let style = "";
  if (archived) {
    label = "Archived";
    style = "bg-neutral-bg text-neutral-deep";
  } else if (kyc === "attested") {
    label = "Active";
    style = "bg-mint-dim text-mint-deep";
  } else if (kyc === "expiring") {
    label = "KYC expiring";
    style = "bg-warn-bg text-warn-deep";
  } else if (kyc === "expired") {
    label = "KYC expired";
    style = "bg-danger-bg text-danger-deep";
  } else {
    label = "KYC pending";
    style = "bg-warn-bg text-warn-deep";
  }
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        style
      )}
    >
      {label}
    </span>
  );
}
