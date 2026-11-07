import { BestPick } from "@/components/sessions/BestPick";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CONFERENCE_DAYS } from "@/lib/ask";
import { pickBest } from "@/lib/rescue";
import { filterRankedSessions, matchContribution } from "@/lib/ranked-filter";
import { RANK_LABEL } from "@/lib/ranking";
import { LATE_SESSION_ID } from "@/lib/catalog";
import type { Rank, Ranked, Session } from "@/lib/types";
import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { Bookmark, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";

const ORDER: Rank[] = ["must", "maybe", "meh"];

export function RankedList() {
  const {
    rankedSessions,
    selection,
    selectSession,
    setView,
    profile,
    searchQuery,
    setSearchQuery,
    rankStatus,
    rankMeta,
    savedIds,
    officialSessions,
    roomAnchors,
    plannerIso,
    dayFilter,
    setDayFilter,
    includeEnded,
    setIncludeEnded,
    askUnderstood,
    applyAsk,
    pickId,
    setPickId,
    startNavTo255,
    requestMapFocus,
  } = useAppState();
  const [askDraft, setAskDraft] = useState("");
  const selectedId = selection?.kind === "session" ? selection.id : null;
  const clock = plannerIso === "live" ? new Date() : new Date(plannerIso);
  const savedTimings = officialSessions
    .filter((s) => savedIds.includes(s.id) && s.startIso && s.endIso)
    .map((s) => ({ id: s.id, title: s.title, startIso: s.startIso!, endIso: s.endIso! }));

  const visible = useMemo(
    () => filterRankedSessions(rankedSessions, { day: dayFilter, includeEnded, clock }),
    [rankedSessions, dayFilter, includeEnded, clock],
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
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Find the right talk
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold">Your personal ranking</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elasticsearch hybrid over the official 2026 main schedule. This is your interest
          fit, not a global popularity score.
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
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="eBPF, keynote, Hall DE…"
            className="h-11 min-h-11 pl-9"
            aria-label="Search official sessions"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1" role="tablist" aria-label="Conference day">
          <DayChip id="all" label="All days" active={dayFilter === "all"} onSelect={() => setDayFilter("all")} />
          {CONFERENCE_DAYS.map((day) => (
            <DayChip
              key={day.id}
              id={day.id}
              label={day.label}
              active={dayFilter === day.id}
              onSelect={() => setDayFilter(day.id)}
            />
          ))}
        </div>
        <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={includeEnded}
            onChange={(e) => setIncludeEnded(e.target.checked)}
          />
          Include ended talks
        </label>
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
            <SessionRow
              key={`saved-${row.item.id}`}
              row={row}
              selected={selectedId === row.item.id}
              onSelect={() => {
                selectSession(row.item.id);
                setView("map");
              }}
            />
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
              <SessionRow
                key={row.item.id}
                row={row}
                selected={selectedId === row.item.id}
                onSelect={() => {
                  selectSession(row.item.id);
                  setView("map");
                }}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function DayChip({
  id,
  label,
  active,
  onSelect,
}: {
  id: string;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "min-h-11 rounded-full border px-3 text-xs font-semibold",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
      )}
    >
      {label}
      <span className="sr-only"> {id === "all" ? "" : id}</span>
    </button>
  );
}

function SessionRow({
  row,
  selected,
  onSelect,
}: {
  row: Ranked<Session>;
  selected: boolean;
  onSelect: () => void;
}) {
  const { item, rank, why, highlights } = row;
  const match = matchContribution(row);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "min-h-11 w-full rounded-2xl border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-[16px] font-semibold leading-snug">{item.title}</p>
        <Badge variant={rank}>{RANK_LABEL[rank]}</Badge>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-mono text-primary">
          <MapPin className="size-3" />
          {item.roomLabel ?? item.roomId}{item.level != null ? ` · L${item.level}` : ""}
        </span>
        <span>
          {item.start}–{item.end}
        </span>
        <span>{item.speaker}</span>
        <Badge variant="outline">{match}</Badge>
      </p>
      {highlights[0] && (
        <p className="mt-1 text-[12px] text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHtml(highlights[0]) }} />
      )}
      {rank === "must" && (
        <p className="mt-2 text-[12px] leading-snug text-foreground/80">Why · {why}</p>
      )}
    </button>
  );
}
