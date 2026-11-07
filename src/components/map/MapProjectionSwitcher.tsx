import type { MapProjection } from "@/lib/map-query";
import { cn } from "@/lib/utils";

export function MapProjectionSwitcher({
  value,
  onChange,
}: {
  value: MapProjection;
  onChange: (next: MapProjection) => void;
}) {
  return (
    <div role="tablist" aria-label="Map projection" className="inline-flex rounded-full border border-border bg-card/95 p-1 shadow-sm">
      {(
        [
          { id: "flat", label: "Flat map" },
          { id: "3d", label: "3D map" },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "min-h-11 rounded-full px-3 text-xs font-semibold",
            value === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
