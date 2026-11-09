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
    <div role="tablist" aria-label="Venue layer" className="fg-seg">
      {LAYERS.map((layer) => (
        <button
          key={layer.id}
          type="button"
          role="tab"
          aria-selected={value === layer.id}
          aria-label={layer.label}
          onClick={() => onChange(layer.id)}
          className={cn(
            "px-2.5 text-[11px] sm:px-3 sm:text-xs",
            value === layer.id && "is-on",
          )}
        >
          <span className="sm:hidden">{layer.short}</span>
          <span className="hidden sm:inline">{layer.label}</span>
        </button>
      ))}
    </div>
  );
}
