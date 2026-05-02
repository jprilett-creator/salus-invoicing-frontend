import { useState } from "react";
import { cn } from "../lib/cn";

interface Props {
  className?: string;
  onDark?: boolean;
  height?: number;
}

export function SalusLogo({ className, onDark = false, height = 28 }: Props) {
  const src = onDark ? "/logo-on-dark.svg" : "/logo.svg";
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <TextPlaceholder className={className} onDark={onDark} height={height} />;
  }

  return (
    <img
      src={src}
      alt="Salus"
      style={{ height }}
      className={cn("block w-auto select-none", className)}
      draggable={false}
      onError={() => {
        // eslint-disable-next-line no-console
        console.warn(
          `[SalusLogo] ${src} not found — drop the file into /public to replace the placeholder.`
        );
        setFailed(true);
      }}
    />
  );
}

function TextPlaceholder({
  className,
  onDark,
  height,
}: {
  className?: string;
  onDark?: boolean;
  height: number;
}) {
  const stroke = onDark ? "#ffffff" : "#0a0e0c";
  const text = onDark ? "text-white" : "text-ink";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      style={{ height }}
    >
      <svg
        width={height * 0.7}
        height={height * 0.7}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M4 5l8 7-8 7"
          stroke={stroke}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M13 5l8 7-8 7"
          stroke={stroke}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.4"
        />
      </svg>
      <span
        className={cn("font-bold tracking-tight", text)}
        style={{ fontSize: height * 0.65 }}
      >
        Salus
      </span>
    </span>
  );
}
