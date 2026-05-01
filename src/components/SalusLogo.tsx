import { cn } from "../lib/cn";

export function SalusLogo({
  className,
  monochrome = true,
}: {
  className?: string;
  monochrome?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex h-5 w-5 items-center justify-center">
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={cn(monochrome ? "text-ink" : "text-mint")}
        >
          <path
            d="M3 4l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M11 4l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.45"
          />
        </svg>
      </span>
      <span className="text-base font-semibold tracking-tight text-ink">
        salus
      </span>
    </div>
  );
}
