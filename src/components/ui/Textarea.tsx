import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

const base =
  "w-full bg-white border border-card-border rounded-md px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-muted/70 transition-colors duration-150 resize-y min-h-[80px] " +
  "focus:border-mint focus:ring-1 focus:ring-mint focus:outline-none";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          base,
          invalid && "border-danger focus:border-danger focus:ring-danger",
          className
        )}
        {...rest}
      />
    );
  }
);
