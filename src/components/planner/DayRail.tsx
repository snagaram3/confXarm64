import { overlappingSaved } from "@/lib/agenda";
import { GUIDE_DAYS, sessionClock, sessionDayId, shortTitle } from "@/lib/field-guide";
import { catalog } from "@/lib/catalog";
import { mustGoBooths } from "@/lib/expo-pins";
import { motionEnabled } from "@/lib/motion";
import { CONFERENCE_TZ, dayKey } from "@/lib/timezone";
import type { ConferenceDayId } from "@/lib/ask";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { useMemo } from "react";

type Slot = {
  time: string;
  title: string;
  sub: string;
  id?: string;
  free?: boolean;
  clash?: boolean;
  sample?: boolean;
};

export function DayRail({
  day,
  onDay,
  freshId,
  onRemoveSession,
  onRemoveBooth,
}: {
  day: ConferenceDayId;
  onDay: (day: ConferenceDayId) => void;
  freshId?: string | null;
  onRemoveSession: (id: string) => void;
  onRemoveBooth: (id: string) => void;
}) {
  const { officialSessions, savedIds, sponsorPrefs, motionPref } = useAppState();
  const live = motionEnabled(motionPref);
  const must = mustGoBooths(catalog.booths, sponsorPrefs);
  const dayIndex = Math.max(0, GUIDE_DAYS.findIndex((item) => item.id === day));

  const slots = useMemo(() => {
    const list: Slot[] = [];
    const keynote = officialSessions.find((session) => {
      if (sessionDayId(session) !== day) return false;
      return session.isPlenum || /keynote/i.test(session.title) || /keynote/i.test(session.track ?? "");
    });
    if (keynote) {
      list.push({
        time: sessionClock(keynote),
        title: shortTitle(keynote.title, 36),
        sub: keynote.roomLabel ?? "Main hall",
        id: savedIds.includes(keynote.id) ? keynote.id : undefined,
      });
    } else {
      list.push({ time: "09:00", title: "Keynotes", sub: "Main hall · Sample", sample: true });
    }
    const saved = officialSessions.filter((session) => {
      if (!savedIds.includes(session.id)) return false;
      if (!session.startIso) return false;
      return dayKey(session.startIso, CONFERENCE_TZ) === day && session.id !== keynote?.id;
    });
    const timings = saved
      .filter((session) => session.startIso && session.endIso)
      .map((session) => ({
        id: session.id,
        title: session.title,
        startIso: session.startIso!,
        endIso: session.endIso!,
      }));
    for (const session of saved) {
      const clash =
        session.startIso && session.endIso
          ? overlappingSaved(
              { id: session.id, title: session.title, startIso: session.startIso, endIso: session.endIso },
              timings,
            ).length > 0
          : false;
      list.push({
        time: sessionClock(session),
        title: shortTitle(session.title, 36),
        sub: clash ? "Overlaps another pick · choose one" : session.roomLabel ?? "Official session",
        id: session.id,
        clash,
      });
    }
    list.sort((a, b) => a.time.localeCompare(b.time));
    const hasNoon = list.some((slot) => slot.time >= "12:00" && slot.time < "13:00");
    if (!hasNoon) {
      list.push({
        time: "12:15",
        title: "45 min free",
        sub: must.length
          ? `Room for your ${must.length} Must Go ${must.length === 1 ? "booth" : "booths"}`
          : "Open",
        free: true,
      });
      list.sort((a, b) => a.time.localeCompare(b.time));
    }
    return list;
  }, [day, must.length, officialSessions, savedIds]);

  return (
    <aside className="fg-rail" aria-label="Your day and Must Go booths">
      <div>
        <h2>Your day</h2>
        <div className="fg-tabs" role="tablist" aria-label="Conference day">
          <span className="fg-thumb" aria-hidden="true" style={{ transform: `translateX(${dayIndex * 100}%)` }} />
          {GUIDE_DAYS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={item.id === day}
              tabIndex={item.id === day ? 0 : -1}
              aria-controls="fg-slots"
              onClick={() => onDay(item.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const next = GUIDE_DAYS[(index + (event.key === "ArrowRight" ? 1 : GUIDE_DAYS.length - 1)) % GUIDE_DAYS.length]!;
                onDay(next.id);
              }}
            >
              {item.label.replace(/ .*/, "")}
            </button>
          ))}
        </div>
        <ol className="fg-slots" id="fg-slots" aria-labelledby={`tab-${day}`} aria-live="polite">
          {slots.map((slot) => (
            <li
              key={`${slot.time}-${slot.id ?? slot.title}`}
              className={cn("fg-slot", slot.free && "free", slot.clash && "clash", live && slot.id === freshId && "fresh")}
            >
              <span className="t">{slot.time}</span>
              <span className="s">
                {slot.title}
                <small>{slot.sub}</small>
              </span>
              {slot.id ? (
                <button className="fg-x" type="button" aria-label={`Remove ${slot.title} from this day`} onClick={() => onRemoveSession(slot.id!)}>
                  <XIcon />
                </button>
              ) : (
                <span />
              )}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <div className="fg-must-head">
          <h2>Must Go booths</h2>
          <span className="fg-mono" style={{ fontSize: 12, color: "var(--fg-muted)" }}>
            {must.length}
          </span>
        </div>
        <ul className="fg-must" aria-live="polite">
          {must.length === 0 ? (
            <li className="fg-must-empty" style={{ display: "block" }}>
              Nothing yet. Add a booth from your picks.
            </li>
          ) : (
            must.map((booth) => (
              <li key={booth.id}>
                <span className="fg-pin" aria-hidden="true">
                  {booth.boothNumber.replace(/^[A-Za-z]+/, "").slice(0, 3) || booth.boothNumber.slice(0, 3)}
                </span>
                <span className="s">
                  {shortTitle(booth.sponsor.replace(/,.*/, ""), 28)}{" "}
                  <span className="fg-mono" style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 400 }}>
                    {/sample/i.test(booth.exhibitorSource) ? "Sample" : booth.boothNumber}
                  </span>
                </span>
                <button className="fg-x" type="button" aria-label={`Remove ${booth.sponsor} from Must Go`} onClick={() => onRemoveBooth(booth.id)}>
                  <XIcon />
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="fg-note">
          Official schedule snapshot and exhibitor catalog. Booth codes are from the expo map PDF, with no live booth
          traffic or step-free routing.
        </p>
      </div>
    </aside>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
