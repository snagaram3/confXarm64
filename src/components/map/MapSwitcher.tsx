import type { MapSurface } from "@/lib/types";
import { cn } from "@/lib/utils";

const SURFACES: { id: MapSurface; label: string; short: string }[] = [
  { id: "venue", label: "Venue", short: "Venue" },
  { id: "expo", label: "Expo floor", short: "Expo" },
  { id: "sample", label: "Sample schematic", short: "Sample" },
];

export function MapSwitcher({
  value,
  onChange,
}: {
  value: MapSurface;
  onChange: (next: MapSurface) => void;
}) {
  return (
    <div role="tablist" aria-label="Map surface" className="inline-flex rounded-full border border-border bg-card/95 p-1 shadow-sm">
      {SURFACES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={value === s.id}
          aria-label={s.label}
          onClick={() => onChange(s.id)}
          className={cn(
            "min-h-10 rounded-full px-2.5 text-[11px] font-semibold sm:min-h-11 sm:px-3 sm:text-xs",
            value === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
          )}
        >
          <span className="sm:hidden">{s.short}</span>
          <span className="hidden sm:inline">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
