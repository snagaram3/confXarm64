import { catalog } from "@/lib/catalog";
import { buildLivePlan, livePlanByDay } from "@/lib/live-plan";
import { ensureTaste } from "@/lib/taste";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { useMemo } from "react";

export function LiveItinerary() {
  const { profile, rankedSessions, officialSessions, sponsorPrefs, savedIds } = useAppState();
  const taste = ensureTaste(profile);
  const items = useMemo(
    () =>
      buildLivePlan({
        ranked: rankedSessions,
        taste,
        profile,
        sessions: officialSessions,
        booths: catalog.booths,
        sponsorPrefs,
        savedIds,
      }),
    [rankedSessions, taste, profile, officialSessions, sponsorPrefs, savedIds],
  );
  const groups = livePlanByDay(items);
  const conflicts = items.filter((item) => item.conflict).length;

  return (
    <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="live-plan-heading">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Live preview</p>
          <h2 id="live-plan-heading" className="font-display text-xl font-semibold">
            What the plan would look like
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rebuilt as your taste changes. Breaks are planning gaps, not walking time. Must Go booths are not scheduled
            slots.
          </p>
        </div>
        {conflicts > 0 && (
          <p className="rounded-full bg-maybe/15 px-2 py-1 text-xs font-semibold text-maybe" role="status">
            {conflicts} overlap{conflicts === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Swipe a few official talks or boost a topic to preview a day. confXarm64 will not invent sessions.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.day} className="rounded-2xl border border-border/80 bg-background/60 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h3>
              <ol className="mt-2 flex flex-col gap-2">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-xl border px-3 py-2",
                      item.kind === "break" && "border-dashed border-border bg-transparent",
                      item.kind === "booth" && "border-highlight/70 bg-highlight/20",
                      item.kind === "session" && "border-border bg-card",
                      item.conflict && "border-maybe bg-maybe/10",
                    )}
                  >
                    <p className="text-sm font-semibold leading-snug">
                      {item.kind === "break" ? "Break · " : item.kind === "booth" ? "Must go · " : ""}
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.start && item.end ? `${item.start}–${item.end}` : "Untimed"}
                      {item.room ? ` · ${item.room}` : ""}
                      {item.alreadySaved ? " · already on itinerary" : ""}
                      {item.conflict ? " · overlaps another pick" : ""}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-foreground/80">Why · {item.why}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
