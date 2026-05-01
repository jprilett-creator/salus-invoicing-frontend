import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

export function Spinner({
  className,
  foreground = true,
}: {
  className?: string;
  foreground?: boolean;
}) {
  return (
    <Loader2
      className={cn(
        "h-4 w-4 animate-spin",
        foreground ? "text-mint" : "text-ink-muted",
        className
      )}
    />
  );
}
