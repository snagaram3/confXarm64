import { overlaps, type SessionTiming } from "./agenda";
import { CONFERENCE_DAYS, type ConferenceDayId } from "./ask";
import { mustGoBooths } from "./expo-pins";
import { bufferFromPacked, maxSessionsPerDay, whyTaste } from "./taste";
import { CONFERENCE_TZ, dayKey } from "./timezone";
import type { Booth, Profile, Rank, Ranked, Session, TasteProfile } from "./types";

export type LivePlanKind = "session" | "booth" | "break";

export interface LivePlanItem {
  id: string;
  kind: LivePlanKind;
  day: ConferenceDayId | string;
  title: string;
  start?: string;
  end?: string;
  startIso?: string;
  endIso?: string;
  room?: string;
  why: string;
  conflict: boolean;
  alreadySaved?: boolean;
  sessionId?: string;
  boothId?: string;
}

function asTiming(session: Session): SessionTiming | null {
  if (!session.startIso || !session.endIso) return null;
  return { id: session.id, title: session.title, startIso: session.startIso, endIso: session.endIso };
}

export function buildLivePlan(opts: {
  ranked: Ranked<Session>[];
  taste: TasteProfile;
  profile: Profile;
  sessions: Session[];
  booths: Booth[];
  sponsorPrefs: Record<string, Rank>;
  savedIds: string[];
}): LivePlanItem[] {
  const { ranked, taste, profile, sessions, booths, sponsorPrefs, savedIds } = opts;
  const days = profile.attendanceDays.length ? profile.attendanceDays : CONFERENCE_DAYS.map((day) => day.id);
  const maxPerDay = maxSessionsPerDay(taste.packed);
  const bufferMin = bufferFromPacked(taste.packed);
  const ordered = ranked.filter((row) => {
    if (row.item.dataset === "sample") return false;
    if (row.item.isServiceSession) return false;
    if (/registration/i.test(row.item.track ?? "")) return false;
    return Boolean(row.item.startIso && row.item.endIso);
  });

  const items: LivePlanItem[] = [];
  for (const day of days) {
    const dayRows = ordered.filter((row) => row.item.startIso && dayKey(row.item.startIso, CONFERENCE_TZ) === day);
    const picked: Session[] = [];
    for (const row of dayRows) {
      if (picked.length >= maxPerDay) break;
      picked.push(row.item);
    }
    picked.sort((a, b) => Date.parse(a.startIso!) - Date.parse(b.startIso!));
    for (let i = 0; i < picked.length; i += 1) {
      const session = picked[i]!;
      const timing = asTiming(session)!;
      const clash = picked.some((other) => other.id !== session.id && asTiming(other) && overlaps(timing, asTiming(other)!));
      const why = whyTaste(session, taste, sessions);
      items.push({
        id: `session-${session.id}`,
        kind: "session",
        day,
        title: session.title,
        start: session.start,
        end: session.end,
        startIso: session.startIso,
        endIso: session.endIso,
        room: session.roomLabel ?? session.roomId,
        why: why ?? "Ranked from your taste weights over the official schedule — not a popularity score.",
        conflict: clash,
        alreadySaved: savedIds.includes(session.id),
        sessionId: session.id,
      });
      const next = picked[i + 1];
      if (next?.startIso && session.endIso) {
        const gapMin = (Date.parse(next.startIso) - Date.parse(session.endIso)) / 60_000;
        if (gapMin >= bufferMin + 15) {
          items.push({
            id: `break-${session.id}-${next.id}`,
            kind: "break",
            day,
            title: "Open gap",
            start: session.end,
            end: next.start,
            startIso: session.endIso,
            endIso: next.startIso,
            why: `Planning buffer ${bufferMin} min. Not walking time and not a mapped route.`,
            conflict: false,
          });
        }
      }
    }
  }

  const must = mustGoBooths(booths, sponsorPrefs);
  for (const booth of must.slice(0, 4)) {
    items.push({
      id: `booth-${booth.id}`,
      kind: "booth",
      day: days[0] ?? "expo",
      title: `${booth.sponsor.replace(/,.*/, "")} · booth ${booth.boothNumber}`,
      room: booth.pinAvailable ? "Expo floor (official pin)" : "Catalog only — unplaced on expo.pdf",
      why: "Must go sponsor booth. Visit in a gap — not a scheduled slot or walking time.",
      conflict: false,
      boothId: booth.id,
    });
  }

  return items;
}

export function livePlanByDay(items: LivePlanItem[]): Array<{ day: string; label: string; items: LivePlanItem[] }> {
  const labelFor = new Map<string, string>(
    CONFERENCE_DAYS.map((day) => [day.id, `${day.weekday} ${day.label.replace(/^[A-Za-z]+ /, "")}`]),
  );
  const order: string[] = [];
  const groups = new Map<string, LivePlanItem[]>();
  for (const item of items) {
    if (!groups.has(item.day)) {
      groups.set(item.day, []);
      order.push(item.day);
    }
    groups.get(item.day)!.push(item);
  }
  return order.map((day) => ({
    day,
    label: labelFor.get(day) ?? day,
    items: groups.get(day) ?? [],
  }));
}
