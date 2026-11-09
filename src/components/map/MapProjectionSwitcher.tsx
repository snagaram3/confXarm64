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
    <div role="tablist" aria-label="Map projection" className="fg-seg">
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
            "px-2.5 text-[11px] sm:px-3 sm:text-xs",
            value === item.id && "is-on",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
