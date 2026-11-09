import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { conflictGroups, countdownMs, nextSession, planningGapMinutes, sessionStatus } from "@/lib/agenda";
import { CONFERENCE_TZ, TZ_LABEL, formatInZone, timeHm, type DisplayTimeZone } from "@/lib/timezone";
import type { Session } from "@/lib/types";
import { useAppState } from "@/state/app-state";
import { Bell, BellOff, Download } from "lucide-react";

export function AgendaPanel() {
  const {
    officialSessions,
    savedIds,
    toggleSaved,
    selectSession,
    timeZone,
    setTimeZone,
    bufferMinutes,
    setBufferMinutes,
    plannerIso,
    setPlannerIso,
    reminderMinutes,
    setReminderMinutes,
    reminderJobs,
    scheduleReminder,
    cancelReminder,
    pushStatus,
    enablePush,
  } = useAppState();

  const items = officialSessions.filter((s) => savedIds.includes(s.id));
  const clock = plannerIso === "live" ? new Date() : new Date(plannerIso);
  const next = nextSession(
    items.map((s) => ({ id: s.id, title: s.title, startIso: s.startIso!, endIso: s.endIso! })),
    clock,
  );
  const conflicts = conflictGroups(
    items.map((s) => ({ id: s.id, title: s.title, startIso: s.startIso!, endIso: s.endIso! })),
  );
  const days = [...new Set(items.map((s) => s.startIso!.slice(0, 10)))].sort();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="fg-eyebrow">My itinerary</p>
        <h2 className="font-display text-2xl font-medium tracking-[-0.02em]">Day by day</h2>
        <p className="text-sm text-[color:var(--fg-muted)]">
          Stored only in this browser. Changing topics does not wipe this list. Sponsors never see it. Times use IANA zones, not naive wall clocks.
        </p>
      </div>

      {next && (
        <p className="rounded-xl bg-must/10 px-3 py-2 text-sm text-must" role="status">
          Next · {items.find((s) => s.id === next.id)?.title} ·{" "}
          {formatInZone(next.startIso, timeZone)} ({timeZone === CONFERENCE_TZ ? "conference" : "your zone"})
          {" · "}
          {formatCountdown(countdownMs(next.startIso, clock))}
        </p>
      )}

      {conflicts.length > 0 && (
        <p className="rounded-xl bg-maybe/10 px-3 py-2 text-sm text-maybe">
          {conflicts.length} overlap{conflicts.length > 1 ? "s" : ""} on your agenda. Favorites are not seat holds.
        </p>
      )}

      {items.length === 0 && (
        <p className="fg-empty-panel text-sm">Add a talk from Home or For you. SAMPLE 255 is not mixed into this official list.</p>
      )}

      {days.map((day) => (
        <section key={day} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide">{day}</h3>
          {items
            .filter((s) => s.startIso!.startsWith(day))
            .sort((a, b) => a.startIso!.localeCompare(b.startIso!))
            .map((s, i, dayItems) => {
              const prev = i > 0 ? dayItems[i - 1] : null;
              const gap =
                prev && s.startIso && prev.endIso
                  ? planningGapMinutes(
                      { id: prev.id, title: prev.title, startIso: prev.startIso!, endIso: prev.endIso! },
                      { id: s.id, title: s.title, startIso: s.startIso!, endIso: s.endIso! },
                      bufferMinutes,
                    )
                  : null;
              return (
                <div key={s.id}>
                  {gap != null && gap > 0 && (
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      Planning gap {Math.round(gap)} min after buffer (estimate, not walking time)
                    </p>
                  )}
                  {gap != null && gap <= 0 && (
                    <p className="mb-1 text-[11px] text-maybe">
                      Tight or overlapping after a {bufferMinutes} min planning buffer
                    </p>
                  )}
                  <AgendaRow
                    session={s}
                    timeZone={timeZone}
                    now={clock}
                    reminded={reminderJobs.some((j) => j.sessionId === s.id && j.status === "scheduled")}
                    onOpen={() => selectSession(s.id, { jump: false })}
                    onMap={() => selectSession(s.id)}
                    onRemove={() => toggleSaved(s.id)}
                    onRemind={() => void scheduleReminder(s.id)}
                    onCancelRemind={() => void cancelReminder(s.id)}
                  />
                </div>
              );
            })}
        </section>
      ))}

      {items.length > 0 && (
        <Button type="button" variant="outline" onClick={() => downloadIcs(items, timeZone)}>
          <Download />
          Download ICS
        </Button>
      )}

      <details className="fg-card p-4">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          Timezone, buffer, and reminders
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium">Display timezone</span>
            <select
              className="fg-select"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value as DisplayTimeZone)}
            >
              {(Object.keys(TZ_LABEL) as DisplayTimeZone[]).map((z) => (
                <option key={z} value={z}>
                  {TZ_LABEL[z]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium">Planner clock (preview, not a live venue clock)</span>
            <input
              type="datetime-local"
              className="fg-select"
              value={plannerIso === "live" ? "" : plannerIso.slice(0, 16)}
              onChange={(e) => setPlannerIso(new Date(e.target.value).toISOString())}
            />
            <Button type="button" variant="guideGhost" onClick={() => setPlannerIso("live")}>
              Use live clock
            </Button>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium">Planning buffer</span>
            <input
              type="number"
              min={0}
              max={30}
              className="fg-input"
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
            />
            <span className="text-xs text-muted-foreground">
              Subtracted from gaps between talks. Planning estimate, not measured walking duration.
            </span>
          </label>
          <div className="text-sm">
            <p className="font-medium">Reminders</p>
            <p className="text-xs text-muted-foreground">{pushStatus?.notice}</p>
            {pushStatus?.foregroundOnly && (
              <p className="mt-1 text-xs text-maybe">Foreground / in-tab only until VAPID is provisioned.</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {([5, 10, 15] as const).map((m) => (
                <Button key={m} type="button" variant={reminderMinutes === m ? "default" : "outline"} onClick={() => setReminderMinutes(m)}>
                  {m} min
                </Button>
              ))}
              <Button type="button" variant="outline" onClick={() => void enablePush()}>
                Enable notifications
              </Button>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

function AgendaRow({
  session,
  timeZone,
  now,
  reminded,
  onOpen,
  onMap,
  onRemove,
  onRemind,
  onCancelRemind,
}: {
  session: Session;
  timeZone: DisplayTimeZone;
  now: Date;
  reminded: boolean;
  onOpen: () => void;
  onMap: () => void;
  onRemove: () => void;
  onRemind: () => void;
  onCancelRemind: () => void;
}) {
  const status = sessionStatus(
    { id: session.id, title: session.title, startIso: session.startIso!, endIso: session.endIso! },
    now,
  );
  return (
    <article
      className="fg-card p-4"
      aria-labelledby={`itinerary-${session.id}`}
    >
      <button type="button" className="w-full text-left" onClick={onOpen}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status === "ongoing" ? "must" : "outline"}>{status}</Badge>
          <span className="fg-mono text-xs text-[color:var(--fg-navy)]">
            <span className="sr-only">Time </span>
            {timeHm(session.startIso!, timeZone)}–{timeHm(session.endIso!, timeZone)}
          </span>
        </div>
        <p id={`itinerary-${session.id}`} className="mt-1 font-medium leading-tight">
          {session.title}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="sr-only">Room </span>
          {session.roomLabel ?? session.roomId}
        </p>
      </button>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onMap}>
          Show on map
        </Button>
        <Button type="button" variant="outline" onClick={onRemove}>
          Remove
        </Button>
        {reminded ? (
          <Button type="button" variant="outline" onClick={onCancelRemind}>
            <BellOff />
            Cancel reminder
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={onRemind}>
            <Bell />
            Remind
          </Button>
        )}
      </div>
    </article>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "starting now";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `in ${hours}h ${minutes % 60}m`;
}

function downloadIcs(items: Session[], timeZone: string) {
  const stamp = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//confXarm64//Agenda//EN",
    `X-WR-TIMEZONE:${timeZone}`,
  ];
  for (const s of items) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@confxarm64.local`,
      `DTSTAMP:${stamp(s.startIso!)}`,
      `DTSTART:${stamp(s.startIso!)}`,
      `DTEND:${stamp(s.endIso!)}`,
      `SUMMARY:${s.title.replace(/\n/g, " ")}`,
      `LOCATION:${(s.roomLabel ?? "").replace(/\n/g, " ")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "confxarm64-agenda.ics";
  a.click();
}

