import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: ReactNode;
}

export function Label({ className, required, children, ...rest }: LabelProps) {
  return (
    <label
      className={cn(
        "text-xs font-medium text-ink-dim mb-1.5 block",
        className
      )}
      {...rest}
    >
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  );
}
