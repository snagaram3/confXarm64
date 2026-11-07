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
          { id: "3d", label: "3D" },
          { id: "flat", label: "Flat" },
        ] as const
      ).map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "min-h-10 rounded-full px-2.5 text-[11px] font-semibold sm:min-h-11 sm:px-3 sm:text-xs",
            value === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
