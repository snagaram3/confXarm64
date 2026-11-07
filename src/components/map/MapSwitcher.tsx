import type { MapSurface } from "@/lib/types";
import { cn } from "@/lib/utils";

const SURFACES: { id: MapSurface; label: string }[] = [
  { id: "venue", label: "Venue" },
  { id: "expo", label: "Expo floor" },
  { id: "sample", label: "Sample schematic" },
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
          onClick={() => onChange(s.id)}
          className={cn(
            "min-h-11 rounded-full px-3 text-xs font-semibold",
            value === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
