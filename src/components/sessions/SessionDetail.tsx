import { PrefBot } from "@/components/sponsor/PrefBot";
import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { catalog, LATE_SESSION_ID } from "@/lib/catalog";
import { RANK_LABEL } from "@/lib/ranking";
import { prefLabel } from "@/lib/sponsor-prefs";
import { formatInZone } from "@/lib/timezone";
import { useAppState } from "@/state/app-state";
import { Bell, Bookmark, Navigation } from "lucide-react";
import { CrowdTake } from "./CrowdTake";

export function SessionDetail() {
  const {
    selection,
    rankedSessionById,
    sponsorPrefs,
    startNavTo255,
    selectBooth,
    savedIds,
    toggleSaved,
    rankStatus,
    resolveSession,
    timeZone,
    scheduleReminder,
    cancelReminder,
    reminderJobs,
    setMapSurface,
    scheduleNote,
    pushStatus,
  } = useAppState();

  if (selection?.kind === "booth") {
    const booth = catalog.booths.find((b) => b.id === selection.id);
    if (!booth) return <EmptyState />;
    const pref = sponsorPrefs[booth.id];
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <SponsorLogo booth={booth} className="size-12" />
          <PrefBot pref={pref} />
        </div>
        <Badge variant={pref ?? "outline"}>{prefLabel(pref)}</Badge>
        <h2 className="font-display text-2xl font-semibold leading-tight">{booth.sponsor}</h2>
        <p className="text-sm text-muted-foreground">{booth.tagline}</p>
        <p className="text-sm leading-relaxed">{booth.pitch}</p>
        <p className="font-mono text-xs text-primary">
          Booth {booth.boothNumber}
          {booth.pinAvailable
            ? " · pin on official expo map (image-relative PDF text)"
            : " · unplaced — booth number not verified on the expo PDF"}
        </p>
        {booth.pinMethod && <p className="text-[11px] text-muted-foreground">{booth.pinMethod}</p>}
        <Button onClick={() => selectBooth(booth.id)}>Open booth card</Button>
      </div>
    );
  }

  const sessionId = selection?.kind === "session" ? selection.id : LATE_SESSION_ID;
  const item = resolveSession(sessionId);
  const row = rankedSessionById[sessionId];
  if (!item) {
    return (
      <p className="text-sm text-muted-foreground">
        Official schedule is loading, or pick a logo on the expo map.
      </p>
    );
  }

  const rank = row?.rank;
  const isSample = item.dataset === "sample" || item.id === LATE_SESSION_ID;
  const saved = savedIds.includes(item.id);
  const reminded = reminderJobs.some((j) => j.sessionId === item.id && j.status === "scheduled");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {rank ? (
          <Badge variant={rank}>{RANK_LABEL[rank]}</Badge>
        ) : (
          <Badge variant="outline">{rankStatus === "error" ? "Rank pending" : "Unranked"}</Badge>
        )}
        <Badge variant="outline">{item.track}</Badge>
        {isSample && <Badge variant="maybe">Sample catalog</Badge>}
        {item.access?.soldOut && <Badge variant="meh">Sold out label</Badge>}
      </div>
      <div>
        <h2 className="font-display text-2xl font-semibold leading-tight">{item.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {item.speaker}
          {item.company ? ` · ${item.company}` : ""}
        </p>
      </div>
      <p className="font-mono text-sm text-primary">
        {item.roomLabel ?? `Room ${item.roomId}`}
        {item.building ? ` · ${item.building}` : ""}
        {item.level != null ? ` · Level ${item.level}` : ""}
      </p>
      {item.startIso && (
        <p className="text-sm">
          {formatInZone(item.startIso, timeZone)} – {formatInZone(item.endIso ?? item.startIso, timeZone, { hour: "numeric", minute: "2-digit" })}
          <span className="block text-xs text-muted-foreground">Displayed in {timeZone}. Source zone America/Denver (−07:00).</span>
        </p>
      )}
      <p className="text-sm leading-relaxed">{item.abstract}</p>
      {item.speakers && item.speakers.length > 0 && (
        <ul className="flex flex-col gap-2">
          {item.speakers.map((sp) => (
            <li key={sp.id} className="flex gap-2 text-sm">
              {sp.photo && <img src={sp.photo} alt="" className="size-10 rounded-lg object-cover" />}
              <span>
                <span className="font-medium">{sp.fullName}</span>
                {sp.tagLine && <span className="block text-xs text-muted-foreground">{sp.tagLine}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {item.sessionUrl && (
        <a href={item.sessionUrl} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
          Organizer session page
        </a>
      )}
      {item.access?.separateRegistration && (
        <p className="text-xs text-maybe">Separate registration or eligibility may apply.</p>
      )}
      <p className="text-[11px] text-muted-foreground">{scheduleNote}</p>
      {row && (rank === "must" || rank === "maybe") && (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs leading-relaxed text-secondary-foreground">
          Personal search fit · Elasticsearch score {row.score.toFixed(1)} · {row.why}. Not a global popularity rank.
        </p>
      )}
      {item.crowdTakes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Seeded crowd take · sample catalog only
          </h3>
          {item.crowdTakes.map((take) => (
            <CrowdTake key={take.id} take={take} />
          ))}
        </section>
      )}
      <div className="flex flex-wrap gap-2">
        {isSample && (
          <Button onClick={startNavTo255}>
            <Navigation />
            Sample walk to 255
          </Button>
        )}
        <Button variant="outline" onClick={() => toggleSaved(item.id)}>
          <Bookmark />
          {saved ? "On agenda" : "Add to agenda"}
        </Button>
        {item.startIso && (
          <Button
            variant="outline"
            onClick={() => (reminded ? void cancelReminder(item.id) : void scheduleReminder(item.id))}
          >
            <Bell />
            {reminded ? "Cancel reminder" : "Remind me"}
          </Button>
        )}
        {pushStatus?.foregroundOnly && (
          <p className="w-full text-[11px] text-maybe">
            Reminders are in-tab until VAPID is provisioned. Background Web Push needs
            `npm run vapid:provision`, HTTPS or localhost, and an explicit Enable notifications tap.
          </p>
        )}
        <Button variant="outline" onClick={() => setMapSurface(isSample ? "sample" : item.building === "Hyatt Regency" ? "venue" : "venue")}>
          Show on map
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <p className="text-sm text-muted-foreground">
      Tap an exhibitor logo on the expo map, or a verified room on the venue map.
    </p>
  );
}
