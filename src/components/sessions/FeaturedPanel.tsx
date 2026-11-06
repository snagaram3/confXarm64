import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatInZone } from "@/lib/timezone";
import { useAppState } from "@/state/app-state";

export function FeaturedPanel() {
  const { featured, selectSession, timeZone, toggleSaved, savedIds, scheduleReminder } = useAppState();
  if (!featured) return null;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-primary">Keynote picks</p>
        <h2 className="font-display text-2xl font-semibold">{featured.label}</h2>
        <p className="text-sm text-muted-foreground">{featured.disclaimer}</p>
      </div>
      {featured.picks.map((pick) => (
        <article key={pick.sessionId} className="rounded-2xl border border-border bg-card p-4">
          <Badge variant="highlight">Keynote pick</Badge>
          <h3 className="mt-2 font-display text-lg font-semibold leading-tight">{pick.title}</h3>
          <p className="text-xs text-muted-foreground">
            {formatInZone(pick.start, timeZone)} · {pick.roomLabel}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {pick.speakers.map((sp) => (
              <li key={sp.fullName} className="flex gap-2 text-sm">
                {sp.photo && (
                  <img src={sp.photo} alt="" className="size-10 rounded-lg object-cover" />
                )}
                <span>
                  <span className="font-medium">{sp.fullName}</span>
                  {sp.tagLine && <span className="block text-xs text-muted-foreground">{sp.tagLine}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Why · {pick.why}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => selectSession(pick.sessionId)}>
              Open
            </Button>
            <Button type="button" variant="outline" onClick={() => toggleSaved(pick.sessionId)}>
              {savedIds.includes(pick.sessionId) ? "On agenda" : "Add to agenda"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void scheduleReminder(pick.sessionId)}>
              Remind me
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
