import { cn } from "@/lib/utils";
import type { VenueLayer } from "@/lib/types";

const LAYERS: { id: VenueLayer; label: string; short: string }[] = [
  { id: "schematic", label: "Schematic", short: "Schematic" },
  { id: "official", label: "Official PDF", short: "PDF" },
];

export function VenueLayerSwitcher({
  value,
  onChange,
}: {
  value: VenueLayer;
  onChange: (next: VenueLayer) => void;
}) {
  return (
    <div role="tablist" aria-label="Venue layer" className="inline-flex rounded-full border border-border bg-card/95 p-1 shadow-sm">
      {LAYERS.map((layer) => (
        <button
          key={layer.id}
          type="button"
          role="tab"
          aria-selected={value === layer.id}
          aria-label={layer.label}
          onClick={() => onChange(layer.id)}
          className={cn(
            "min-h-10 rounded-full px-2.5 text-[11px] font-semibold sm:min-h-11 sm:px-3 sm:text-xs",
            value === layer.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
          )}
        >
          <span className="sm:hidden">{layer.short}</span>
          <span className="hidden sm:inline">{layer.label}</span>
        </button>
      ))}
    </div>
  );
}
