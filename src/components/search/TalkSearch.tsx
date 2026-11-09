import { HowSearchWorks } from "@/components/search/HowSearchWorks";
import { Input } from "@/components/ui/input";
import { CONFERENCE_DAYS } from "@/lib/ask";
import { uniqueTracks } from "@/lib/ranked-filter";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { Search } from "lucide-react";
import { useMemo } from "react";

export function TalkSearch({ prominent = false }: { prominent?: boolean }) {
  const {
    searchQuery,
    setSearchQuery,
    dayFilter,
    setDayFilter,
    trackFilter,
    setTrackFilter,
    includeEnded,
    setIncludeEnded,
    officialSessions,
    profile,
    rankMeta,
    rankStatus,
  } = useAppState();
  const tracks = useMemo(() => uniqueTracks(officialSessions), [officialSessions]);

  return (
    <section
      aria-labelledby="talk-search-heading"
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-[0_8px_24px_rgba(17,62,130,0.06)]",
        prominent && "border-primary/40",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Find the right talk</p>
      <h2 id="talk-search-heading" className="mt-1 font-display text-xl font-semibold">
        Search the official schedule
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Natural language over titles and abstracts. “something on eBPF and security” can match talks
        that never use those words in the title, via BM25 + kNN.
        {rankMeta ? ` Last query ${rankMeta.tookMs} ms.` : ""}
      </p>
      <label className="mt-3 grid gap-1">
        <span className="text-xs font-medium">Ask for a talk</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="something on eBPF and security"
            className="h-12 min-h-12 pl-9 text-base"
            aria-label="Search official sessions with natural language"
            autoComplete="off"
            name="talk-search"
          />
        </div>
      </label>
      <div className="mt-3 flex flex-wrap gap-1" role="tablist" aria-label="Conference day">
        <DayChip
          id="all"
          label={profile.attendanceDays.length ? "Your days" : "All days"}
          active={dayFilter === "all"}
          onSelect={() => setDayFilter("all")}
        />
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
      <label className="mt-3 grid gap-1 text-xs font-medium">
        Track
        <select
          className="h-11 min-h-11 rounded-md border border-input bg-card px-3 text-sm"
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value || "all")}
          aria-label="Filter by official track"
        >
          <option value="all">All tracks</option>
          {tracks.map((track) => (
            <option key={track} value={track}>
              {track}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-[var(--primary)]"
          checked={includeEnded}
          onChange={(e) => setIncludeEnded(e.target.checked)}
        />
        Include ended talks
      </label>
      {rankStatus === "loading" && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          Querying Elasticsearch…
        </p>
      )}
      <div className="mt-3">
        <HowSearchWorks />
      </div>
    </section>
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
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground",
      )}
    >
      {label}
      <span className="sr-only">{id === "all" ? "" : ` ${id}`}</span>
    </button>
  );
}
