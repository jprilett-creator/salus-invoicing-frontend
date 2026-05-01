import type { ReactNode } from "react";
import { cn } from "../lib/cn";

interface ExtractedFieldProps {
  /** Field-level label text. */
  label: string;
  /** Render the small mint dot + "extracted" tag. */
  showIndicator: boolean;
  htmlFor?: string;
  required?: boolean;
  className?: string;
  hint?: string;
  children: ReactNode;
}

export function ExtractedField({
  label,
  showIndicator,
  htmlFor,
  required,
  hint,
  className,
  children,
}: ExtractedFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-xs font-medium text-ink-dim mb-1.5"
      >
        {showIndicator && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-mint shrink-0"
            aria-hidden
          />
        )}
        <span>{label}</span>
        {required && <span className="text-danger">*</span>}
        {showIndicator && (
          <span
            className={cn(
              "text-[10px] font-normal text-ink-muted uppercase tracking-wide"
            )}
          >
            extracted
          </span>
        )}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
