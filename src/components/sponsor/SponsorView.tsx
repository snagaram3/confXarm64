import { Badge } from "@/components/ui/badge";
import { catalog } from "@/lib/catalog";
import { RANK_LABEL } from "@/lib/ranking";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";

export function SponsorView() {
  const { sponsorBoothId, setSponsorBoothId, selectBooth, rankByBooth, rankedVisitors } =
    useAppState();
  const booth = catalog.booths.find((b) => b.id === sponsorBoothId) ?? catalog.booths[0];
  const visitors = rankedVisitors;
  const mustNearby = visitors.filter((v) => v.rank === "must" || v.rank === "maybe");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-maybe">Sponsor mirror</p>
        <h2 className="font-display text-xl font-semibold">Who’s walking by</h2>
        <p className="text-sm text-muted-foreground">
          Seeded Must/Maybe visitors near the booth, ranked in Elasticsearch against
          this booth’s tags — not a live beacon.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {catalog.booths.map((b) => {
          const active = b.id === booth.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setSponsorBoothId(b.id);
                selectBooth(b.id);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent",
              )}
            >
              {b.sponsor}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-lg font-semibold">{booth.sponsor}</p>
            <p className="text-sm text-muted-foreground">{booth.tagline}</p>
          </div>
          <Badge variant={rankByBooth[booth.id] ?? "meh"}>
            Attendee rank {RANK_LABEL[rankByBooth[booth.id] ?? "meh"]}
          </Badge>
        </div>
        <p className="mt-2 font-mono text-xs text-primary">
          {booth.hallId.replace("-", " ").toUpperCase()} · Level {booth.floor} ·{" "}
          {mustNearby.length} Must/Maybe within ~25m
        </p>
        <p className="mt-2 text-sm">{booth.pitch}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nearby visitors · Elasticsearch
        </h3>
        {visitors.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No ranked visitors yet. Confirm Elasticsearch is up, then reselect this booth.
          </p>
        )}
        {visitors.map((row) => (
          <article
            key={row.item.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"
          >
            <img
              src={row.item.photo}
              alt=""
              className="size-11 rounded-lg object-cover ring-1 ring-border"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium leading-tight">{row.item.name}</p>
                <Badge variant={row.rank}>{RANK_LABEL[row.rank]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {row.item.role} · {row.item.company} · {row.item.metersAway}m
              </p>
              <p className="mt-1 font-mono text-[11px] text-must/90">
                {row.rank === "must" ? `Why · ${row.why}` : row.item.interests.join(" · ")}
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
