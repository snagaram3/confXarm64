import { venue } from "@/lib/catalog";
import type { Floor } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FloorSwitcher({
  floor,
  onChange,
}: {
  floor: Floor;
  onChange: (floor: Floor) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Floor"
      className="inline-flex rounded-lg border border-border bg-card/90 p-1 shadow-lg backdrop-blur"
    >
      {venue.floors.map((f) => {
        const active = f.id === floor;
        return (
          <button
            key={f.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(f.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors sm:px-4",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {f.short}
            <span className="ml-1 hidden sm:inline font-normal opacity-80">
              {f.id === 1 ? "Exhibit" : f.id === 2 ? "Mezz" : "Upper"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
