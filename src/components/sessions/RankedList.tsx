import { SessionPlanCard } from "@/components/planner/SessionPlanCard";
import { TalkSearch } from "@/components/search/TalkSearch";
import { BestPick } from "@/components/sessions/BestPick";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { pickBest } from "@/lib/rescue";
import { filterRankedSessions } from "@/lib/ranked-filter";
import { RANK_LABEL } from "@/lib/ranking";
import { LATE_SESSION_ID } from "@/lib/catalog";
import type { Rank } from "@/lib/types";
import { useAppState } from "@/state/app-state";
import { Bookmark, Search } from "lucide-react";
import { useMemo, useState } from "react";

const ORDER: Rank[] = ["must", "maybe", "meh"];

export function RankedList() {
  const {
    rankedSessions,
    selectSession,
    profile,
    searchQuery,
    rankStatus,
    rankError,
    retryRank,
    rankMeta,
    savedIds,
    officialSessions,
    roomAnchors,
    plannerIso,
    dayFilter,
    includeEnded,
    trackFilter,
    askUnderstood,
    applyAsk,
    pickId,
    setPickId,
    startNavTo255,
    requestMapFocus,
  } = useAppState();
  const [askDraft, setAskDraft] = useState("");
  const clock = plannerIso === "live" ? new Date() : new Date(plannerIso);
  const savedTimings = officialSessions
    .filter((s) => savedIds.includes(s.id) && s.startIso && s.endIso)
    .map((s) => ({ id: s.id, title: s.title, startIso: s.startIso!, endIso: s.endIso! }));

  const visible = useMemo(
    () =>
      filterRankedSessions(rankedSessions, {
        day: dayFilter,
        includeEnded,
        clock,
        attendanceDays: profile.attendanceDays,
        track: trackFilter,
      }),
    [rankedSessions, dayFilter, includeEnded, clock, profile.attendanceDays, trackFilter],
  );
  const savedRows = visible.filter((row) => savedIds.includes(row.item.id));
  const best = useMemo(
    () =>
      pickBest(visible, {
        clock,
        saved: savedTimings,
        rooms: roomAnchors.map((r) => ({ id: r.id, placed: r.placed })),
      }, pickId),
    [visible, clock, savedTimings, roomAnchors, pickId],
  );

  return (
    <div className="flex flex-col gap-6">
      <TalkSearch prominent />

      <div>
        <h2 className="font-display text-2xl font-semibold">Talks for your topics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rankings are personal Elasticsearch fit, not a global popularity score.
          {rankMeta ? ` Last query ${rankMeta.tookMs}ms.` : ""}
        </p>
        <form
          className="mt-3 grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyAsk(askDraft || searchQuery);
          }}
        >
          <label className="grid gap-1">
            <span className="text-xs font-medium">Ask Floorwise</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={askDraft}
                onChange={(e) => setAskDraft(e.target.value)}
                placeholder="step-free eBPF near Hyatt on Tuesday"
                className="h-11 min-h-11 pl-9"
                aria-label="Ask for talks, a building, a day, or the sample 255 walk"
              />
            </div>
          </label>
          <button type="submit" className="sr-only">
            Ask
          </button>
        </form>
        {askUnderstood.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1" aria-label="Understood from Ask">
            {askUnderstood.map((chip) => (
              <li key={chip}>
                <Badge variant="path">{chip}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BestPick
        pick={best.pick}
        gate={best.gate}
        rescuedFrom={best.rescuedFrom}
        rescuedReason={best.rescuedReason}
        onTake={() => {
          if (!best.pick) return;
          setPickId(best.pick.item.id);
          if (best.pick.item.id === LATE_SESSION_ID || best.pick.item.dataset === "sample") {
            startNavTo255({ stayOnMap: true });
            return;
          }
          selectSession(best.pick.item.id);
          if (best.pick.item.roomId) requestMapFocus(best.pick.item.roomId);
        }}
        onSkip={() => {
          const ids = visible.map((row) => row.item.id);
          const current = best.pick?.item.id;
          const idx = current ? ids.indexOf(current) : -1;
          const next = ids[(idx + 1) % Math.max(ids.length, 1)];
          setPickId(next ?? null);
        }}
      />

      {rankStatus === "loading" && rankedSessions.length === 0 && (
        <p className="text-sm text-muted-foreground">Querying Elasticsearch…</p>
      )}
      {rankStatus === "error" && (
        <div className="rounded-2xl border border-destructive/30 p-4 text-sm" role="alert">
          <p className="font-semibold">Search is unavailable</p>
          <p className="mt-1 text-muted-foreground">{rankError ?? "Elasticsearch did not return a ranking."} Floorwise will not invent talks here.</p>
          <button type="button" className="mt-2 text-sm font-semibold text-primary" onClick={retryRank}>
            Retry ranking
          </button>
        </div>
      )}
      {profile.interests.length === 0 && !searchQuery && rankStatus === "ready" && (
        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Pick an interest in your profile, or type a keyword, to pull Must / Maybe ranks.
        </div>
      )}
      {visible.length === 0 && rankStatus === "ready" && rankedSessions.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nothing left on this day{includeEnded ? "" : " after hiding ended talks"}. Try All days or Include ended.
        </div>
      )}
      {savedRows.length > 0 && (
        <section className="flex flex-col gap-2">
          <header className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Bookmark className="size-3.5" /> Saved
          </header>
          {savedRows.map((row) => (
            <SessionPlanCard key={`saved-${row.item.id}`} row={row} />
          ))}
        </section>
      )}
      {ORDER.map((rank) => {
        const rows = visible.filter((r) => r.rank === rank);
        if (!rows.length) return null;
        return (
          <section key={rank} className="flex flex-col gap-2">
            <header className="flex items-center gap-2">
              <Badge variant={rank}>{RANK_LABEL[rank]}</Badge>
              <span className="text-xs text-muted-foreground">{rows.length}</span>
            </header>
            {rows.map((row) => (
              <SessionPlanCard key={row.item.id} row={row} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
