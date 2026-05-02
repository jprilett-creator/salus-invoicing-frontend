import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, Plus, Search } from "lucide-react";
import { api } from "../lib/api";
import type { CounterpartySummary } from "../lib/types";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { NeutralBadge, StatusBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/PageHeader";

const ROLE_LABEL: Record<string, string> = {
  funder: "Funder",
  supplier: "Supplier",
};

type TabKey = "all" | "active" | "onboarding" | "suspended";

const TAB_DEFS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "onboarding", label: "Onboarding" },
  { key: "suspended", label: "Suspended" },
];

function matchesTab(cp: CounterpartySummary, tab: TabKey): boolean {
  if (tab === "all") return true;
  if (tab === "active") return cp.status === "active";
  if (tab === "suspended") return cp.status === "suspended";
  // onboarding: any in-progress state
  return cp.status === "onboarding" || cp.status === "kyc" || cp.status === "tncs";
}

export function CounterpartiesPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  const cpQuery = useQuery({
    queryKey: ["counterparties"],
    queryFn: () => api.listCounterparties(),
  });

  const ledgerQuery = useQuery({
    queryKey: ["ledger-recent", 200],
    queryFn: () => api.ledgerRecent(200),
  });

  const lastInvoicedFor = (shortName: string): string | null => {
    if (!ledgerQuery.data) return null;
    const upper = shortName.replace(/\s/g, "").toUpperCase();
    for (const entry of ledgerQuery.data) {
      const num = entry.invoice_number.toUpperCase();
      if (
        num.includes(upper) ||
        (shortName === "PowerX" && num.includes("PWR")) ||
        (shortName === "CEMP USD" && num.includes("CEMP-USD")) ||
        (shortName === "CEMP EUR" && num.includes("CEMP-EUR"))
      ) {
        return entry.invoiced_at;
      }
    }
    return null;
  };

  const counts = useMemo(() => {
    const data = cpQuery.data ?? [];
    const all = data.length;
    const active = data.filter((c) => c.status === "active").length;
    const onboarding = data.filter(
      (c) => c.status === "onboarding" || c.status === "kyc" || c.status === "tncs"
    ).length;
    const suspended = data.filter((c) => c.status === "suspended").length;
    return { all, active, onboarding, suspended } as Record<TabKey, number>;
  }, [cpQuery.data]);

  const filtered = useMemo(() => {
    const data = cpQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return data
      .filter((c) => matchesTab(c, tab))
      .filter((c) =>
        q
          ? c.short_name.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q)
          : true
      );
  }, [cpQuery.data, tab, search]);

  return (
    <>
      <PageHeader
        title="Counterparties"
        tabs={TAB_DEFS.map((t) => ({
          label: t.label,
          active: t.key === tab,
          count: counts[t.key],
          onClick: () => setTab(t.key),
        }))}
      />

      <div className="px-10 py-8 space-y-6">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-ink">All counterparties</h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              Suppliers and funders billed by Salus.
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
          <CounterpartyList
            rows={filtered}
            lastInvoicedFor={lastInvoicedFor}
          />
        ) : cpQuery.data && cpQuery.data.length === 0 ? (
          <div className="bg-white border border-card-border rounded-lg">
            <EmptyState
              icon={
                <Building2
                  className="h-10 w-10"
                  strokeWidth={1.25}
                  aria-hidden
                />
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

function CounterpartyList({
  rows,
  lastInvoicedFor,
}: {
  rows: CounterpartySummary[];
  lastInvoicedFor: (shortName: string) => string | null;
}) {
  return (
    <div className="bg-white border border-card-border rounded-lg overflow-hidden">
      <div className="hidden md:grid grid-cols-[2fr_1.4fr_1fr_1fr_24px] gap-4 px-5 py-3 border-b border-card-border bg-page text-[10px] font-medium uppercase tracking-wider text-ink-muted">
        <span>Counterparty</span>
        <span>Roles</span>
        <span>Status</span>
        <span>Last invoiced</span>
        <span />
      </div>
      <ul className="divide-y divide-card-border">
        {rows.map((cp) => (
          <li key={cp.id}>
            <Link
              to={`/counterparties/${cp.id}`}
              className="grid grid-cols-1 md:grid-cols-[2fr_1.4fr_1fr_1fr_24px] gap-4 items-center px-5 py-4 hover:bg-page transition-colors group"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink truncate">
                  {cp.short_name}
                </div>
                <div className="mt-0.5 text-xs text-ink-muted truncate">
                  {cp.name} · {cp.currency}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {cp.roles.length === 0 ? (
                  <span className="text-xs text-ink-muted">—</span>
                ) : (
                  cp.roles.map((r) => (
                    <NeutralBadge key={r}>{ROLE_LABEL[r] ?? r}</NeutralBadge>
                  ))
                )}
              </div>
              <div>
                <StatusBadge status={cp.status} />
              </div>
              <div className="text-xs text-ink-muted truncate">
                {formatLastInvoiced(lastInvoicedFor(cp.short_name))}
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

function formatLastInvoiced(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}
