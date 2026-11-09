import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { Button } from "@/components/ui/button";
import { catalog } from "@/lib/catalog";
import type { Booth, Rank, Ranked } from "@/lib/types";
import { Star, X } from "lucide-react";

export function ExpoBoothSheet({
  boothId,
  prefs,
  rankedBooths,
  onClose,
  onSetPref,
  onOpen,
}: {
  boothId: string | null;
  prefs: Record<string, Rank>;
  rankedBooths: Ranked<Booth>[];
  onClose: () => void;
  onSetPref: (id: string, pref: Rank | undefined) => void;
  onOpen: (id: string) => void;
}) {
  const booth = catalog.booths.find((item) => item.id === boothId) ?? null;
  if (!booth) return null;
  const must = prefs[booth.id] === "must";
  const ranked = rankedBooths.find((row) => row.item.id === booth.id);

  return (
    <div
      className="fg-chrome pointer-events-auto mx-auto w-full max-w-md p-3"
      role="region"
      aria-label={`${booth.sponsor} booth details`}
    >
      <div className="flex items-start gap-2">
        <SponsorLogo booth={booth} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-semibold leading-tight">{booth.sponsor}</p>
          <p className="truncate text-[11px] text-muted-foreground">{booth.tagline}</p>
          <p className="fg-mono mt-0.5 text-[11px] text-[color:var(--fg-coral)]">
            Booth {booth.boothNumber}
            {booth.pinAvailable ? " · official expo pin" : " · unplaced on expo.pdf"}
          </p>
        </div>
        <button type="button" className="min-h-11 min-w-11" aria-label="Dismiss booth details" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>
      {ranked && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-foreground/85">Why · {ranked.why}</p>
      )}
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {booth.pinAvailable
          ? "Centers this PDF pin. No hall walk, GPS, or ETA."
          : "In the catalog without a verified expo.pdf pin. confXarm64 will not invent a location."}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          variant={must ? "guideGhost" : "guide"}
          onClick={() => onSetPref(booth.id, must ? undefined : "must")}
        >
          <Star className={must ? "size-4 fill-highlight text-highlight" : "size-4"} />
          {must ? "Remove Must go" : "Mark Must go"}
        </Button>
        {booth.pinAvailable && (
          <Button type="button" variant="guideGhost" className="min-h-11" onClick={() => onOpen(booth.id)}>
            Recenter pin
          </Button>
        )}
      </div>
    </div>
  );
}
