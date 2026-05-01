import type { ReactNode } from "react";
import { cn } from "../lib/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center py-16 px-6",
        className
      )}
    >
      {icon && (
        <div className="text-ink-muted mb-5" aria-hidden>
          {icon}
        </div>
      )}
      <h2 className="text-lg font-medium text-ink mb-2">{title}</h2>
      {description && (
        <p className="text-sm text-ink-muted max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
