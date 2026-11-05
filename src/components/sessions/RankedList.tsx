import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RANK_LABEL } from "@/lib/ranking";
import type { Rank, Ranked, Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { MapPin, Search } from "lucide-react";

const ORDER: Rank[] = ["must", "maybe", "meh"];

export function RankedList() {
  const {
    rankedSessions,
    selection,
    selectSession,
    profile,
    searchQuery,
    setSearchQuery,
    rankStatus,
    rankError,
    rankMeta,
  } = useAppState();
  const selectedId = selection?.kind === "session" ? selection.id : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-primary">Find the right talk</p>
        <h2 className="font-display text-xl font-semibold">Ranked by Elasticsearch</h2>
        <p className="text-sm text-muted-foreground">
          Hybrid BM25 + dense_vector cosine over titles, abstracts, and tags.
          {rankMeta ? ` Last query ${rankMeta.tookMs}ms.` : ""}
        </p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="eBPF, OpenTelemetry, room 255…"
            className="pl-9"
            aria-label="Search sessions"
          />
        </div>
      </div>
      {rankStatus === "error" && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {rankError}
        </p>
      )}
      {rankStatus === "loading" && rankedSessions.length === 0 && (
        <p className="text-sm text-muted-foreground">Querying Elasticsearch…</p>
      )}
      {profile.interests.length === 0 && !searchQuery && (
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Pick at least one interest — or type a keyword — to pull Must/Maybe ranks from Elasticsearch.
        </div>
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
                onSelect={() => selectSession(row.item.id)}
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
        "w-full rounded-xl border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-[15px] font-semibold leading-snug">{item.title}</p>
        <Badge variant={rank}>{RANK_LABEL[rank]}</Badge>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 font-mono text-primary">
          <MapPin className="size-3" />
          {item.roomId.toUpperCase()} · L{item.floor}
        </span>
        <span>
          {item.start}–{item.end}
        </span>
        <span>{item.speaker}</span>
      </p>
      {rank === "must" && (
        <p className="mt-2 rounded-md bg-must/10 px-2 py-1 font-mono text-[11px] leading-snug text-must">
          Why this rank · {why}
        </p>
      )}
      {row.highlights[0] && rank !== "must" && (
        <p className="mt-2 text-[11px] text-muted-foreground">Matched {row.highlights[0]}</p>
      )}
    </button>
  );
}
