import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, label, id, ...rest }, ref) {
    return (
      <label
        htmlFor={id}
        className="inline-flex items-center gap-2.5 cursor-pointer select-none group"
      >
        <span className="relative flex h-4 w-4 shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className="peer absolute inset-0 opacity-0 cursor-pointer"
            {...rest}
          />
          <span
            className={cn(
              "h-4 w-4 rounded border border-card-border bg-white transition-colors",
              "peer-checked:border-mint peer-checked:bg-mint",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-mint peer-focus-visible:ring-offset-2",
              "group-hover:border-ink-muted peer-checked:group-hover:border-mint-hover",
              className
            )}
          />
          <Check
            className="pointer-events-none absolute left-0 top-0 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
            strokeWidth={3}
          />
        </span>
        {label && <span className="text-sm text-ink-dim">{label}</span>}
      </label>
    );
  }
);
