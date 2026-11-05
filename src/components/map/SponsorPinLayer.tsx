import { PrefBot } from "@/components/sponsor/PrefBot";
import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { catalog } from "@/lib/catalog";
import { prefLabel } from "@/lib/sponsor-prefs";
import type { Rank } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SponsorPinLayer({
  selectedId,
  prefs,
  onSelect,
}: {
  selectedId: string | null;
  prefs: Record<string, Rank>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-14 z-10 sm:bottom-16">
      <div className="pointer-events-auto rounded-2xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur-sm">
        <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Official exhibitors · booth # from expo map · pin not geocoded
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {catalog.booths.map((booth, i) => {
            const pref = prefs[booth.id];
            const selected = selectedId === booth.id;
            return (
              <button
                key={booth.id}
                type="button"
                onClick={() => onSelect(booth.id)}
                aria-pressed={selected}
                aria-label={`${booth.sponsor}, booth ${booth.boothNumber}, ${prefLabel(pref)}`}
                className={cn(
                  "flex min-h-11 min-w-[9.5rem] shrink-0 items-center gap-2 rounded-xl border px-2 py-1.5 text-left",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-accent",
                )}
              >
                <span className="relative">
                  <SponsorLogo booth={booth} className="size-9" />
                  <span className="absolute -right-1.5 -top-1.5">
                    <PrefBot pref={pref} delayMs={i * 70} size="sm" showLabel={false} />
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold leading-tight">
                    {booth.sponsor}
                  </span>
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    Booth {booth.boothNumber} · {prefLabel(pref)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
