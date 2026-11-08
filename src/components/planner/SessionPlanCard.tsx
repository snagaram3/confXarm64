import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { overlappingSaved } from "@/lib/agenda";
import { RANK_LABEL } from "@/lib/ranking";
import { matchContribution } from "@/lib/ranked-filter";
import type { Ranked, Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { MapPin } from "lucide-react";

export function SessionPlanCard({
  row,
  compact = false,
}: {
  row: Ranked<Session>;
  compact?: boolean;
}) {
  const {
    savedIds,
    toggleSaved,
    officialSessions,
    selectSession,
    requestMapFocus,
    setView,
    setMapSurface,
    setVenueLayer,
    roomAnchors,
  } = useAppState();
  const saved = savedIds.includes(row.item.id);
  const savedTimings = officialSessions
    .filter((item) => savedIds.includes(item.id) && item.startIso && item.endIso)
    .map((item) => ({
      id: item.id,
      title: item.title,
      startIso: item.startIso!,
      endIso: item.endIso!,
    }));
  const clashes =
    row.item.startIso && row.item.endIso
      ? overlappingSaved(
          { id: row.item.id, title: row.item.title, startIso: row.item.startIso, endIso: row.item.endIso },
          savedTimings,
        )
      : [];
  const room = roomAnchors.find((item) => item.id === row.item.roomId);
  const unmapped = Boolean(row.item.roomId) && room != null && !room.placed;
  const sample = row.item.dataset === "sample" || row.item.roomId === "255";
  const match = matchContribution(row);

  const showOnMap = () => {
    selectSession(row.item.id, { jump: true });
    if (sample) return;
    setMapSurface("venue");
    setVenueLayer("schematic");
    if (row.item.roomId) requestMapFocus(row.item.roomId);
    setView("map");
  };

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-3 shadow-[0_8px_24px_rgba(17,62,130,0.06)]",
        compact && "p-3",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-[16px] font-semibold leading-snug">{row.item.title}</h3>
        <Badge variant={row.rank} className="shrink-0">
          {RANK_LABEL[row.rank]}
        </Badge>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-mono text-primary">
          <MapPin className="size-3" />
          {row.item.roomLabel ?? row.item.roomId}
          {row.item.level != null ? ` · L${row.item.level}` : ""}
        </span>
        <span>
          {row.item.start}–{row.item.end}
        </span>
        {row.item.speaker ? <span>{row.item.speaker}</span> : null}
        <Badge variant="outline">{match}</Badge>
      </p>
      <p className="mt-2 text-[13px] leading-snug text-foreground/85">Why · {row.why}</p>
      {clashes.length > 0 && !saved && (
        <p className="mt-2 rounded-lg bg-maybe/15 px-2 py-1.5 text-xs text-maybe" role="status">
          Overlaps “{clashes[0]!.title}” on your itinerary. Favorites are not seat holds.
        </p>
      )}
      {unmapped && (
        <p className="mt-2 text-xs text-muted-foreground">
          Schedule label only — not a verified pin. Floorwise will not invent a walk.
        </p>
      )}
      {sample && (
        <p className="mt-2 text-xs text-muted-foreground">SAMPLE catalog talk, not an official main-schedule record.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant={saved ? "outline" : "default"} onClick={() => toggleSaved(row.item.id)}>
          {saved ? "Remove from itinerary" : "Add to itinerary"}
        </Button>
        <Button type="button" variant="outline" onClick={showOnMap}>
          {unmapped ? "Show schedule label" : "Show on map"}
        </Button>
      </div>
    </article>
  );
}
