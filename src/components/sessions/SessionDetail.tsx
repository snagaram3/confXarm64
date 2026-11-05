import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { catalog, LATE_SESSION_ID, spaceById } from "@/lib/catalog";
import { RANK_LABEL } from "@/lib/ranking";
import { useAppState } from "@/state/app-state";
import { ArrowUpRight, Navigation } from "lucide-react";
import { CrowdTake } from "./CrowdTake";

export function SessionDetail() {
  const {
    selection,
    rankedSessionById,
    rankByBooth,
    rankedBooths,
    startNavTo255,
    selectBooth,
    setView,
  } = useAppState();

  if (selection?.kind === "booth") {
    const booth = catalog.booths.find((b) => b.id === selection.id);
    if (!booth) return <EmptyState />;
    const rank = rankByBooth[booth.id] ?? "meh";
    return (
      <div className="flex flex-col gap-3">
        <Badge variant={rank}>{RANK_LABEL[rank]} booth</Badge>
        <h2 className="font-display text-xl font-semibold">{booth.sponsor}</h2>
        <p className="text-sm text-muted-foreground">{booth.tagline}</p>
        <p className="text-sm">{booth.pitch}</p>
        <p className="font-mono text-xs text-primary">
          {booth.hallId.replace("-", " ").toUpperCase()} · Level {booth.floor}
        </p>
        <Button
          onClick={() => {
            selectBooth(booth.id);
            setView("sponsor");
          }}
        >
          Open sponsor mirror
          <ArrowUpRight />
        </Button>
      </div>
    );
  }

  if (selection?.kind === "space") {
    const space = spaceById(selection.id);
    if (!space) return <EmptyState />;
    return (
      <div className="flex flex-col gap-2">
        <Badge variant="outline">{space.kind}</Badge>
        <h2 className="font-display text-xl font-semibold">{space.label}</h2>
        {space.stack && (
          <p className="text-sm text-primary">Vertical stack {space.stack}</p>
        )}
        <p className="text-sm text-muted-foreground">
          No cataloged session in this space right now. Try a numbered room or a
          Solutions Showcase hall.
        </p>
      </div>
    );
  }

  const sessionId = selection?.kind === "session" ? selection.id : LATE_SESSION_ID;
  const row = rankedSessionById[sessionId];
  if (!row) return <LoadingOrEmpty />;
  const { item, rank, why, matchedTags, score } = row;
  const is255 = item.roomId === "255";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={rank}>{RANK_LABEL[rank]}</Badge>
        <Badge variant="outline">{item.track}</Badge>
        {item.roomId === "255" && <Badge variant="path">Stacked 155/255/355</Badge>}
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold leading-tight">{item.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {item.speaker} · {item.company}
        </p>
      </div>
      <p className="font-mono text-sm text-primary">
        Room {item.roomId} · Level {item.floor} · {item.start}–{item.end}
      </p>
      <p className="text-sm leading-relaxed">{item.abstract}</p>
      <div className="flex flex-wrap gap-1.5">
        {item.tags.map((tag) => (
          <Badge
            key={tag}
            variant={matchedTags.some((t) => t.toLowerCase() === tag.toLowerCase()) ? "must" : "outline"}
          >
            {tag}
          </Badge>
        ))}
      </div>
      {(rank === "must" || rank === "maybe") && (
        <p className="rounded-lg border border-must/30 bg-must/10 px-3 py-2 font-mono text-xs text-must">
          Why this rank · Elasticsearch score {score.toFixed(1)} · {why}
        </p>
      )}
      {item.crowdTakes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Crowd take
          </h3>
          {item.crowdTakes.map((take) => (
            <CrowdTake key={take.id} take={take} />
          ))}
        </section>
      )}
      {is255 && (
        <Button onClick={startNavTo255}>
          <Navigation />
          I’m late — navigate to 255
        </Button>
      )}
      {!is255 && rankedBooths[0] && item.floor === 1 && (
        <p className="text-xs text-muted-foreground">
          Nearby booths are color-coded on Level 1.
        </p>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <p className="text-sm text-muted-foreground">
      Tap a hall or room on the map. Seeded sessions live in 150s / 250s / 350s and
      Halls A–B.
    </p>
  );
}

function LoadingOrEmpty() {
  const { rankStatus, rankError } = useAppState();
  if (rankStatus === "loading") {
    return <p className="text-sm text-muted-foreground">Ranking sessions in Elasticsearch…</p>;
  }
  if (rankStatus === "error") {
    return (
      <p className="text-sm text-destructive">
        {rankError ?? "Elasticsearch is unreachable. Run docker compose up -d."}
      </p>
    );
  }
  return <EmptyState />;
}
