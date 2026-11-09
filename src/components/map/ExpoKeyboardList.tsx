import type { MapPin } from "@/components/map/ImageFloorMap";
import { cn } from "@/lib/utils";

export function ExpoKeyboardList({
  pins,
  selectedId,
  onSelect,
}: {
  pins: MapPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const placed = pins.filter((pin) => pin.booth);
  if (!placed.length) return null;
  return (
    <details className="fg-chrome pointer-events-auto max-w-[min(100vw-1.5rem,28rem)] p-2">
      <summary className="min-h-11 cursor-pointer px-1 text-xs font-semibold">
        Booths on this floorplan (keyboard list)
      </summary>
      <p className="mt-1 px-1 text-[11px] text-muted-foreground">
        Enter or Space on a row selects that pin. The floorplan is not verified step-free navigation.
      </p>
      <ul className="mt-2 max-h-40 overflow-y-auto" aria-label="Exhibitor pins">
        {placed.map((pin) => {
          const booth = pin.booth!;
          const selected = selectedId === pin.id;
          return (
            <li key={pin.id}>
              <button
                type="button"
                onClick={() => onSelect(pin.id)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-sm",
                  selected ? "bg-[color:var(--fg-coral-bg)] text-[color:var(--fg-ink)]" : "hover:bg-[color:var(--fg-sunk)]",
                )}
              >
                <span className="truncate font-semibold">{booth.sponsor.replace(/,.*/, "")}</span>
                <span className="font-mono text-[11px] text-muted-foreground">#{booth.boothNumber}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
