import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

const base =
  "w-full appearance-none bg-white border border-card-border rounded-md pl-3 pr-9 py-2 text-sm text-ink " +
  "transition-colors duration-150 cursor-pointer " +
  "focus:border-mint focus:ring-1 focus:ring-mint focus:outline-none";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...rest },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          base,
          invalid && "border-danger focus:border-danger focus:ring-danger",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
    </div>
  );
});
