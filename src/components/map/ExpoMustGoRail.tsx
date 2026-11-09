import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { Button } from "@/components/ui/button";
import { catalog } from "@/lib/catalog";
import { mustGoBooths } from "@/lib/expo-pins";
import type { Rank } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function ExpoMustGoRail({
  prefs,
  selectedId,
  mustOnly,
  onMustOnly,
  onOpen,
}: {
  prefs: Record<string, Rank>;
  selectedId: string | null;
  mustOnly: boolean;
  onMustOnly: (value: boolean) => void;
  onOpen: (id: string) => void;
}) {
  const items = mustGoBooths(catalog.booths, prefs);

  return (
    <div className="fg-chrome pointer-events-auto w-fit max-w-full p-1.5 sm:p-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="fg-eyebrow">
          <Star className="mr-1 inline size-3 fill-[color:var(--fg-coral)] text-[color:var(--fg-coral)]" aria-hidden="true" />
          Your Must go
        </p>
        <Button
          type="button"
          size="sm"
          variant={mustOnly ? "guide" : "guideGhost"}
          className="shrink-0 px-2 text-[11px]"
          aria-pressed={mustOnly}
          onClick={() => onMustOnly(!mustOnly)}
        >
          {mustOnly ? "Showing Must go" : "Must go only"}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="max-w-[16rem] px-1 py-1.5 text-xs text-muted-foreground" role="status">
          None yet. Mark Must go on a recommendation or pin — stored in this browser, not a shared exhibitor list.
        </p>
      ) : (
        <ul className="mt-1 flex max-w-[min(100vw-1.5rem,28rem)] gap-1.5 overflow-x-auto pb-0.5" aria-label="Must go booths">
          {items.map((booth) => {
            const selected = selectedId === booth.id;
            return (
              <li key={booth.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onOpen(booth.id)}
                  aria-current={selected ? "true" : undefined}
                  aria-label={`${booth.sponsor}, booth ${booth.boothNumber}${booth.pinAvailable ? "" : ", unplaced on expo.pdf"}`}
                  className={cn(
                    "flex min-h-10 min-w-[7.5rem] items-center gap-2 rounded-xl border px-2 py-1 text-left",
                    selected
                      ? "border-[color:var(--fg-coral)] bg-[color:var(--fg-coral-bg)]"
                      : "border-[color:var(--fg-line)] bg-[color:var(--fg-paper)] hover:bg-[color:var(--fg-sunk)]",
                  )}
                >
                  <SponsorLogo booth={booth} className="size-7" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold leading-tight">{booth.sponsor.replace(/,.*/, "")}</span>
                    <span className="block font-mono text-[10px] text-muted-foreground">
                      {booth.pinAvailable ? `#${booth.boothNumber}` : "Unplaced"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
