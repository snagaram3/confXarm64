import { dayKey, parseInstant } from "./timezone";

export type SessionTiming = {
  id: string;
  title: string;
  startIso: string;
  endIso: string;
};

export type AgendaStatus = "upcoming" | "ongoing" | "finished";

export function sessionStatus(session: SessionTiming, now: Date): AgendaStatus {
  const start = parseInstant(session.startIso).getTime();
  const end = parseInstant(session.endIso).getTime();
  const t = now.getTime();
  if (t < start) return "upcoming";
  if (t >= end) return "finished";
  return "ongoing";
}

export function overlaps(a: SessionTiming, b: SessionTiming): boolean {
  const as = parseInstant(a.startIso).getTime();
  const ae = parseInstant(a.endIso).getTime();
  const bs = parseInstant(b.startIso).getTime();
  const be = parseInstant(b.endIso).getTime();
  return as < be && bs < ae;
}

export function conflictGroups(items: SessionTiming[]): SessionTiming[][] {
  const groups: SessionTiming[][] = [];
  const used = new Set<string>();
  for (const item of items) {
    if (used.has(item.id)) continue;
    const group = items.filter((other) => other.id === item.id || overlaps(item, other));
    if (group.length > 1) {
      for (const g of group) used.add(g.id);
      groups.push(group);
    }
  }
  return groups;
}

export function nextSession(items: SessionTiming[], now: Date): SessionTiming | null {
  const upcoming = items
    .filter((item) => parseInstant(item.startIso).getTime() > now.getTime())
    .sort((a, b) => parseInstant(a.startIso).getTime() - parseInstant(b.startIso).getTime());
  return upcoming[0] ?? null;
}

export function countdownMs(iso: string, now: Date): number {
  return parseInstant(iso).getTime() - now.getTime();
}

/** Gap after `a` until `b`, minus a user planning buffer. Labeled estimate, not walking time. */
export function planningGapMinutes(
  a: SessionTiming,
  b: SessionTiming,
  bufferMinutes: number,
): number {
  const gap = (parseInstant(b.startIso).getTime() - parseInstant(a.endIso).getTime()) / 60_000;
  return gap - bufferMinutes;
}

export function groupByDay(items: SessionTiming[], timeZone: string): Record<string, SessionTiming[]> {
  const out: Record<string, SessionTiming[]> = {};
  for (const item of items) {
    const key = dayKey(item.startIso, timeZone);
    (out[key] ??= []).push(item);
  }
  for (const key of Object.keys(out)) {
    out[key].sort((a, b) => parseInstant(a.startIso).getTime() - parseInstant(b.startIso).getTime());
  }
  return out;
}
