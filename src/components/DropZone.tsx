import { useCallback, useRef, useState, type DragEvent, type ReactNode } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "../lib/cn";

interface DropZoneProps {
  accept: string; // e.g. "application/pdf" or ".xlsx"
  onFile: (file: File) => void;
  disabled?: boolean;
  primaryText?: string;
  secondaryText?: string;
  icon?: ReactNode;
  className?: string;
}

export function DropZone({
  accept,
  onFile,
  disabled = false,
  primaryText = "Drop file here, or click to browse",
  secondaryText,
  icon,
  className,
}: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={open}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          open();
        }
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      aria-disabled={disabled}
      className={cn(
        "border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        dragOver
          ? "border-mint bg-mint-dim"
          : "border-card-border bg-page hover:border-mint",
        disabled && "opacity-60 cursor-not-allowed",
        !disabled && "cursor-pointer",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3">
        <div className="text-ink-muted" aria-hidden>
          {icon ?? <UploadCloud className="h-8 w-8" strokeWidth={1.5} />}
        </div>
        <p className="text-base text-ink-dim">{primaryText}</p>
        {secondaryText && (
          <p className="text-xs text-ink-muted">{secondaryText}</p>
        )}
      </div>
    </div>
  );
}
