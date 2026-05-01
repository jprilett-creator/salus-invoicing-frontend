import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { CounterpartyCard } from "../components/CounterpartyCard";
import { EmptyState } from "../components/EmptyState";
import { Spinner } from "../components/ui/Spinner";

export function CounterpartiesPage() {
  const cpQuery = useQuery({
    queryKey: ["counterparties"],
    queryFn: () => api.listCounterparties(),
  });

  // Best-effort last-invoiced lookup. Mirrors the prior Streamlit page's
  // prefix-match heuristic; the API doesn't expose this per-CP yet so we
  // derive it from /ledger/recent.
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

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            Counterparties
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Suppliers, funders, and other parties on the Salus platform.
          </p>
        </div>
        <Link to="/counterparties/new">
          <Button size="md" className="whitespace-nowrap">
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            New counterparty
          </Button>
        </Link>
      </header>

      {cpQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner foreground={false} />
        </div>
      ) : cpQuery.isError ? (
        <div className="bg-white border border-card-border rounded-lg p-6">
          <p className="text-sm text-danger">
            Couldn&apos;t load counterparties. {(cpQuery.error as Error).message}
          </p>
        </div>
      ) : cpQuery.data && cpQuery.data.length > 0 ? (
        <ul className="space-y-3">
          {cpQuery.data.map((cp) => (
            <li key={cp.id}>
              <CounterpartyCard
                cp={cp}
                lastInvoicedAt={lastInvoicedFor(cp.short_name)}
              />
            </li>
          ))}
        </ul>
      ) : (
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
      )}
    </div>
  );
}
