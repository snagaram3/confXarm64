import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { catalog, LATE_SESSION_ID, sessionById, spaceById } from "@/lib/catalog";
import { RANK_LABEL } from "@/lib/ranking";
import { useAppState } from "@/state/app-state";
import { ArrowUpRight, Bookmark, Navigation } from "lucide-react";
import { CrowdTake } from "./CrowdTake";

export function SessionDetail() {
  const {
    selection,
    rankedSessionById,
    rankByBooth,
    startNavTo255,
    selectBooth,
    setView,
    savedIds,
    toggleSaved,
    rankStatus,
  } = useAppState();

  if (selection?.kind === "booth") {
    const booth = catalog.booths.find((b) => b.id === selection.id);
    if (!booth) return <EmptyState />;
    const rank = rankByBooth[booth.id];
    return (
      <div className="flex flex-col gap-3">
        {rank ? <Badge variant={rank}>{RANK_LABEL[rank]} booth</Badge> : <Badge variant="outline">Unranked</Badge>}
        <h2 className="font-display text-2xl font-semibold leading-tight">{booth.sponsor}</h2>
        <p className="text-sm text-muted-foreground">{booth.tagline}</p>
        <p className="text-sm leading-relaxed">{booth.pitch}</p>
        <p className="font-mono text-xs text-primary">
          {booth.hallId.replace("-", " ").toUpperCase()} · Level {booth.floor}
        </p>
        <Button
          onClick={() => {
            selectBooth(booth.id);
            setView("sponsor");
          }}
        >
          Open booth mirror
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
        <h2 className="font-display text-2xl font-semibold">{space.label}</h2>
        {space.stack && (
          <p className="text-sm text-primary">Vertical stack {space.stack} in this sample map</p>
        )}
        <p className="text-sm text-muted-foreground">
          No seeded session in this space. Try a numbered room or a Solutions Showcase hall.
        </p>
      </div>
    );
  }

  const sessionId = selection?.kind === "session" ? selection.id : LATE_SESSION_ID;
  const item = sessionById(sessionId);
  const row = rankedSessionById[sessionId];
  if (!item) return <EmptyState />;

  const rank = row?.rank;
  const is255 = item.roomId === "255";
  const saved = savedIds.includes(item.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {rank ? (
          <Badge variant={rank}>{RANK_LABEL[rank]}</Badge>
        ) : (
          <Badge variant="outline">{rankStatus === "error" ? "Rank pending" : "Unranked"}</Badge>
        )}
        <Badge variant="outline">{item.track}</Badge>
        {is255 && <Badge variant="path">Stacked 155/255/355</Badge>}
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold leading-tight">{item.title}</h2>
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
            variant={row?.matchedTags.some((t) => t.toLowerCase() === tag.toLowerCase()) ? "must" : "outline"}
          >
            {tag}
          </Badge>
        ))}
      </div>
      {row && (rank === "must" || rank === "maybe") && (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs leading-relaxed text-secondary-foreground">
          Why this rank · Elasticsearch score {row.score.toFixed(1)} · {row.why}
        </p>
      )}
      {item.crowdTakes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Seeded crowd take · not a live feed
          </h3>
          {item.crowdTakes.map((take) => (
            <CrowdTake key={take.id} take={take} />
          ))}
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        {is255 && (
          <Button onClick={startNavTo255}>
            <Navigation />
            Navigate to 255
          </Button>
        )}
        <Button variant="outline" onClick={() => toggleSaved(item.id)}>
          <Bookmark />
          {saved ? "Saved" : "Save preference"}
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <p className="text-sm text-muted-foreground">
      Tap a hall or room on the map. Seeded sessions live in the 150s / 250s / 350s and Halls A–B.
    </p>
  );
}
