import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rescueCopy, type RescueReason, type SessionGate } from "@/lib/rescue";
import { RANK_LABEL } from "@/lib/ranking";
import type { Ranked, Session } from "@/lib/types";
import { MapPin } from "lucide-react";

export function BestPick({
  pick,
  gate,
  rescuedFrom,
  rescuedReason,
  onTake,
  onSkip,
}: {
  pick: Ranked<Session> | null;
  gate: SessionGate | null;
  rescuedFrom: Ranked<Session> | null;
  rescuedReason: RescueReason | null;
  onTake: () => void;
  onSkip: () => void;
}) {
  if (!pick) {
    return (
      <div className="fg-empty-panel text-sm">
        No open pick yet. Add an interest, Ask for a topic, or save a talk — this is your ranking, not a live hall count.
      </div>
    );
  }

  return (
    <section className="rec-enter fg-card fg-card-pad">
      <p className="fg-eyebrow">Best pick</p>
      {rescuedFrom && (
        <p className="mt-2 rounded-xl border border-maybe/40 bg-maybe/15 px-3 py-2 text-sm text-foreground" role="status">
          Rescue · {rescuedFrom.item.title} is blocked ({rescueCopy(rescuedReason)}). Next open pick is below. Not a live occupancy count.
        </p>
      )}
      <h3 className="mt-2 font-display text-xl font-semibold leading-snug">{pick.item.title}</h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span className="fg-mono inline-flex items-center gap-1 text-[color:var(--fg-navy)]">
          <MapPin className="size-3" />
          {pick.item.roomLabel ?? pick.item.roomId}
          {pick.item.level != null ? ` · L${pick.item.level}` : ""}
        </span>
        <span>
          {pick.item.start}–{pick.item.end}
        </span>
        <Badge variant={pick.rank}>{RANK_LABEL[pick.rank]}</Badge>
      </p>
      {gate?.detail && gate.partition !== "recommended" && (
        <p className="mt-2 text-xs text-maybe">{gate.detail}</p>
      )}
      <p className="mt-2 text-sm leading-snug text-foreground/85">Why · {pick.why}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="guide" onClick={onTake}>
          Take me there
        </Button>
        <Button type="button" variant="guideGhost" onClick={onSkip}>
          Next pick
        </Button>
      </div>
    </section>
  );
}
