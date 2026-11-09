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
    <div role="tablist" aria-label="Map surface" className="fg-seg">
      {SURFACES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={value === s.id}
          aria-label={s.label}
          onClick={() => onChange(s.id)}
          className={cn(
            "px-2.5 text-[11px] sm:px-3 sm:text-xs",
            value === s.id && "is-on",
          )}
        >
          <span className="sm:hidden">{s.short}</span>
          <span className="hidden sm:inline">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
