import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const base =
  "w-full bg-white border border-card-border rounded-md px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-muted/70 transition-colors duration-150 " +
  "focus:border-mint focus:ring-1 focus:ring-mint focus:outline-none " +
  "disabled:bg-page disabled:text-ink-muted disabled:cursor-not-allowed";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        base,
        invalid && "border-danger focus:border-danger focus:ring-danger",
        className
      )}
      {...rest}
    />
  );
});
