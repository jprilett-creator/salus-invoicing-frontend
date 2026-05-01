import { cn } from "../../lib/cn";
import type { CounterpartyStatus } from "../../lib/types";

const STATUS_LABEL: Record<CounterpartyStatus, string> = {
  onboarding: "Onboarding",
  kyc: "KYC",
  tncs: "T&Cs pending",
  active: "Active",
  suspended: "Suspended",
};

const STATUS_STYLES: Record<CounterpartyStatus, string> = {
  active: "bg-mint-dim text-mint-deep",
  onboarding: "bg-warn-bg text-warn-deep",
  kyc: "bg-warn-bg text-warn-deep",
  tncs: "bg-warn-bg text-warn-deep",
  suspended: "bg-danger-bg text-danger-deep",
};

export function StatusBadge({
  status,
  className,
}: {
  status: CounterpartyStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "active" ? "bg-mint" : status === "suspended" ? "bg-danger" : "bg-warn"
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function NeutralBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-bg text-neutral-deep",
        className
      )}
    >
      {children}
    </span>
  );
}
