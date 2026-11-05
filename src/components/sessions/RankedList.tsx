import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RANK_LABEL } from "@/lib/ranking";
import type { Rank, Ranked, Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { Bookmark, MapPin, Search } from "lucide-react";

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
  } = useAppState();
  const selectedId = selection?.kind === "session" ? selection.id : null;
  const savedRows = rankedSessions.filter((row) => savedIds.includes(row.item.id));

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
      </div>
      {rankStatus === "loading" && rankedSessions.length === 0 && (
        <p className="text-sm text-muted-foreground">Querying Elasticsearch…</p>
      )}
      {profile.interests.length === 0 && !searchQuery && rankStatus === "ready" && (
        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Pick an interest in your profile, or type a keyword, to pull Must / Maybe ranks.
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
        const rows = rankedSessions.filter((r) => r.rank === rank);
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

function SessionRow({
  row,
  selected,
  onSelect,
}: {
  row: Ranked<Session>;
  selected: boolean;
  onSelect: () => void;
}) {
  const { item, rank, why } = row;
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
      </p>
      {rank === "must" && (
        <p className="mt-2 text-[12px] leading-snug text-foreground/80">Why · {why}</p>
      )}
    </button>
  );
}
