import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function BotIcon({
  className,
  label = "Floorwise suggestion",
  style,
}: {
  className?: string;
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm",
        className,
      )}
        style={
          {
            "--bot-delay": style?.animationDelay ?? "0ms",
            ...style,
          } as CSSProperties
        }
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 32 32" className="size-[22px]" aria-hidden="true">
        <circle cx="16" cy="7" r="2" fill="var(--primary-foreground)" />
        <rect x="15.25" y="8.2" width="1.5" height="2.4" fill="var(--primary-foreground)" />
        <rect x="7" y="10.5" width="18" height="14" rx="7" fill="var(--primary-foreground)" />
        <circle cx="12.5" cy="16.4" r="1.7" fill="currentColor" />
        <circle cx="19.5" cy="16.4" r="1.7" fill="currentColor" />
        <rect x="13.2" y="20.4" width="5.6" height="1.5" rx="0.75" fill="currentColor" />
      </svg>
    </span>
  );
}
