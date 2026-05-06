import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { cn } from "../lib/cn";

export function XeroStatusIndicator() {
  const q = useQuery({
    queryKey: ["xero-health"],
    queryFn: () => api.xeroHealth(),
    retry: false,
    staleTime: 60_000,
  });

  if (q.isLoading) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-ink-muted">
        <span className="h-2 w-2 rounded-full bg-ink-muted/40 animate-pulse" />
        Checking Xero…
      </div>
    );
  }

  const connected = q.isSuccess && q.data.ok;
  const apiError = q.error instanceof ApiError ? q.error : null;
  const reachable500 = apiError?.status === 500;
  const offline = !connected && !reachable500 && !!q.error;

  const label = connected
    ? "Xero connected"
    : offline
      ? "Xero status unavailable"
      : "Xero not connected, contact admin";

  const dotCls = connected
    ? "bg-mint-deep"
    : offline
      ? "bg-ink-muted"
      : "bg-danger";

  const textCls = connected ? "text-mint-deep" : "text-ink-dim";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium",
        textCls
      )}
      title={
        connected
          ? `Tenant ${q.data?.tenant_id ?? "—"}${
              q.data?.last_token_refresh_at
                ? ` · last refresh ${q.data.last_token_refresh_at}`
                : ""
            }`
          : (apiError?.message ?? "")
      }
    >
      <span className={cn("h-2 w-2 rounded-full", dotCls)} />
      {label}
    </div>
  );
}
