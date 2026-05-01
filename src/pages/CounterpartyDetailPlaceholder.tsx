import { Link, useParams } from "react-router-dom";

export function CounterpartyDetailPlaceholder() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="max-w-3xl mx-auto py-12">
      <Link
        to="/counterparties"
        className="text-sm text-ink-muted hover:text-ink underline-offset-4 hover:underline"
      >
        ← Counterparties
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">
        Counterparty #{id}
      </h1>
      <p className="mt-3 text-sm text-ink-muted">
        Editing the full counterparty record (identity, KYC, contracts,
        commercials) is coming soon.
      </p>
    </div>
  );
}
