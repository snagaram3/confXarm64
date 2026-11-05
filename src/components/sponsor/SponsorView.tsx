import { PrefBot } from "@/components/sponsor/PrefBot";
import { PrefPicker } from "@/components/sponsor/PrefPicker";
import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { Badge } from "@/components/ui/badge";
import { catalog } from "@/lib/catalog";
import { RANK_LABEL } from "@/lib/ranking";
import { prefLabel } from "@/lib/sponsor-prefs";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";

export function SponsorView() {
  const {
    sponsorBoothId,
    setSponsorBoothId,
    selectBooth,
    rankedVisitors,
    sponsorPrefs,
    setSponsorPref,
    rankByBooth,
  } = useAppState();
  const booth = catalog.booths.find((b) => b.id === sponsorBoothId) ?? catalog.booths[0];
  const visitors = rankedVisitors;
  const mustNearby = visitors.filter((v) => v.rank === "must" || v.rank === "maybe");
  const pref = sponsorPrefs[booth.id];
  const esFit = rankByBooth[booth.id];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-maybe">Sponsor mirror</p>
        <h2 className="font-display text-xl font-semibold">Who’s walking by</h2>
        <p className="text-sm text-muted-foreground">
          Official exhibitor names and booth numbers from the KCNA26 Expo Hall Map
          (5 Nov 2026 snapshot). Indoor coordinates were not published — pins are
          labeled, not geocoded. Seeded Must/Maybe visitors are a demo, not a live
          beacon.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {catalog.booths.map((b, i) => {
          const active = b.id === booth.id;
          const cardPref = sponsorPrefs[b.id];
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setSponsorBoothId(b.id);
                selectBooth(b.id);
              }}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-left",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              <span className="relative shrink-0">
                <SponsorLogo booth={b} className="size-10" />
                <span className="absolute -right-1.5 -top-1.5">
                  <PrefBot pref={cardPref} delayMs={i * 70} size="sm" showLabel={false} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium leading-tight">{b.sponsor}</span>
                <span className="block font-mono text-[11px] text-muted-foreground">
                  Booth {b.boothNumber} · {prefLabel(cardPref)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <SponsorLogo booth={booth} className="size-14" />
            <div>
              <p className="font-display text-lg font-semibold">{booth.sponsor}</p>
              <p className="text-sm text-muted-foreground">{booth.tagline}</p>
            </div>
          </div>
          <PrefBot pref={pref} delayMs={0} />
        </div>
        <p className="mt-2 font-mono text-xs text-primary">
          {booth.locationLabel} · location pin unavailable
        </p>
        <p className="mt-2 text-sm">{booth.pitch}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">{booth.exhibitorSource}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PrefPicker
            name={booth.sponsor}
            value={pref}
            onChange={(next) => setSponsorPref(booth.id, next)}
          />
          {esFit ? (
            <Badge variant={esFit}>Search fit {RANK_LABEL[esFit]}</Badge>
          ) : (
            <Badge variant="outline">Search fit pending</Badge>
          )}
        </div>
        {booth.visitors.length > 0 && (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Seeded demo · {mustNearby.length} Must/Maybe visitors in the catalog, not
            live indoor location
          </p>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nearby visitors · Elasticsearch · seeded demo
        </h3>
        {visitors.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No ranked visitors yet. Confirm Elasticsearch is up, then reselect this
            booth. Unrated is not Meh.
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
