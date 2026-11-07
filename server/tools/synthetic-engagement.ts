import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Deterministic SAMPLE-catalog engagement scenario.
 * Not live KCNA attendance. Not sponsor leads. Not GPS.
 */
export const SYNTHETIC_LABEL = "Synthetic demo data — not live attendance";
export const DEMO_DATE = "2026-11-10";
export const DEMO_CLOCK = "11:20";
export const DEMO_TZ = "America/Denver";
export const FULL_SESSION_THRESHOLD = 0.9;
export const JOIN_GRACE_MINUTES = 5;
export const PARTICIPANT_COUNT = 48;

const FIRST = [
  "Alex",
  "Blair",
  "Casey",
  "Drew",
  "Eden",
  "Finn",
  "Gray",
  "Harper",
  "Indigo",
  "Jules",
  "Kai",
  "Lake",
  "Morgan",
  "Noel",
  "Oakley",
  "Quinn",
  "Remy",
  "Sage",
  "Tatum",
  "Uma",
  "Val",
  "Winter",
  "Yael",
  "Zion",
] as const;
const LAST = [
  "Adler",
  "Brooks",
  "Cole",
  "Diaz",
  "Ellis",
  "Frost",
  "Green",
  "Hayes",
  "Ingram",
  "Khan",
  "Lang",
  "Moss",
  "Ng",
  "Owen",
  "Parkes",
  "Reeve",
  "Singh",
  "Tran",
  "Ueda",
  "Vale",
  "West",
  "Young",
  "Zimmer",
  "Bell",
] as const;
const ROLES = [
  "Staff Platform Engineer",
  "SRE",
  "Security Engineer",
  "Developer Advocate",
  "Data Engineer",
  "Frontend Engineer",
  "CNCF Ambassador",
] as const;

export type IntentKind = "plans_full" | "plans_partial" | "none";
export type PresenceKind = "full" | "partial" | "unknown";

export type SampleSession = {
  id: string;
  title: string;
  speaker: string;
  track: string;
  tags: string[];
  start: string;
  end: string;
  roomId: string;
};

export type SyntheticParticipant = {
  id: string;
  displayName: string;
  role: string;
  contact: string;
  topics: string[];
};

export type SessionIntent = {
  participantId: string;
  sessionId: string;
  intent: Exclude<IntentKind, "none">;
};

export type PresenceEvent = {
  participantId: string;
  sessionId: string;
  joinMin: number;
  leaveMin: number | null;
};

export type PresenceRow = {
  participantId: string;
  sessionId: string;
  status: PresenceKind;
  onTrackForFull: boolean;
  activeNow: boolean;
  joinClock: string | null;
  leaveClock: string | null;
  elapsedShare: number | null;
  evidence: string;
};

type CatalogShape = {
  interests: string[];
  sessions: SampleSession[];
};

function loadCatalog(): CatalogShape {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const raw = JSON.parse(readFileSync(resolve(root, "src/data/catalog.json"), "utf8")) as CatalogShape;
  return {
    interests: raw.interests,
    sessions: raw.sessions.map((s) => ({
      id: s.id,
      title: s.title,
      speaker: s.speaker,
      track: s.track,
      tags: s.tags,
      start: s.start,
      end: s.end,
      roomId: s.roomId,
    })),
  };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function clockOf(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function pick<T>(rng: () => number, items: readonly T[], n: number): T[] {
  const copy = [...items];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(rng() * copy.length);
    out.push(copy.splice(i, 1)[0]!);
  }
  return out;
}

function buildRecords() {
  const catalog = loadCatalog();
  const clock = minutesOf(DEMO_CLOCK);
  const participants: SyntheticParticipant[] = [];
  const intents: SessionIntent[] = [];
  const events: PresenceEvent[] = [];

  for (let i = 0; i < PARTICIPANT_COUNT; i++) {
    const rng = mulberry32(20261110 + i * 97);
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[Math.floor(i / FIRST.length) % LAST.length]!;
    const displayName = `${first} ${last}`;
    const id = `syn-${String(i + 1).padStart(3, "0")}`;
    const topics = pick(rng, catalog.interests, 2 + (rng() > 0.45 ? 1 : 0) + (rng() > 0.8 ? 1 : 0));
    const participant: SyntheticParticipant = {
      id,
      displayName,
      role: ROLES[i % ROLES.length]!,
      contact: `${first.toLowerCase()}.${last.toLowerCase()}@example.test`,
      topics,
    };
    participants.push(participant);

    const matching = catalog.sessions.filter((s) => s.tags.some((t) => topics.includes(t)));
    const pool = matching.length ? matching : catalog.sessions;
    const chosen = pick(rng, pool, 2 + (rng() > 0.5 ? 1 : 0));

    for (const session of chosen) {
      const overlap = session.tags.some((t) => topics[0] === t);
      const fullRoll = rng();
      let intent: IntentKind = "none";
      if (overlap && fullRoll < 0.72) intent = "plans_full";
      else if (fullRoll < 0.55) intent = "plans_partial";
      if (intent !== "none") {
        intents.push({ participantId: id, sessionId: session.id, intent });
      }

      const start = minutesOf(session.start);
      const end = minutesOf(session.end);
      const duration = Math.max(1, end - start);
      const future = start > clock;
      if (future) continue;

      const showUp =
        intent === "plans_full" ? rng() < 0.86 : intent === "plans_partial" ? rng() < 0.7 : rng() < 0.12;
      if (!showUp) continue;

      let joinOffset: number;
      if (intent === "plans_full") joinOffset = Math.floor(rng() * 7) - 2;
      else if (intent === "plans_partial") joinOffset = 6 + Math.floor(rng() * 10);
      else joinOffset = 8 + Math.floor(rng() * 12);
      const joinMin = start + joinOffset;

      const inProgress = start <= clock && clock < end;
      let leaveMin: number | null;
      if (inProgress) {
        const stillThere =
          intent === "plans_full" ? rng() < 0.82 : intent === "plans_partial" ? rng() < 0.4 : rng() < 0.25;
        leaveMin = stillThere ? null : start + Math.floor(duration * (0.35 + rng() * 0.3));
        if (leaveMin !== null && leaveMin > clock) leaveMin = clock - 1;
      } else {
        const stayFull = intent === "plans_full" ? rng() < 0.78 : rng() < 0.22;
        leaveMin = stayFull
          ? start + Math.floor(duration * (0.92 + rng() * 0.1))
          : start + Math.floor(duration * (0.35 + rng() * 0.4));
      }
      events.push({ participantId: id, sessionId: session.id, joinMin, leaveMin });
    }
  }

  return { catalog, clock, participants, intents, events };
}

const RECORDS = buildRecords();

export function presenceFor(event: PresenceEvent, session: SampleSession, clock: number): PresenceRow {
  const start = minutesOf(session.start);
  const end = minutesOf(session.end);
  const duration = Math.max(1, end - start);
  const joinOnTime = event.joinMin <= start + JOIN_GRACE_MINUTES;
  const stillPresent = event.leaveMin === null || event.leaveMin > clock;
  const inProgress = start <= clock && clock < end;
  const ended = end <= clock;
  const leaveOrNow = event.leaveMin ?? (stillPresent ? Math.min(clock, end) : event.joinMin);
  const dwell = Math.max(0, leaveOrNow - event.joinMin);
  const elapsedShare = dwell / duration;
  const metFull =
    joinOnTime && elapsedShare >= FULL_SESSION_THRESHOLD && (ended || !inProgress || elapsedShare >= FULL_SESSION_THRESHOLD);
  const onTrackForFull = Boolean(inProgress && joinOnTime && stillPresent && elapsedShare < FULL_SESSION_THRESHOLD);
  const activeNow = Boolean(inProgress && event.joinMin <= clock && stillPresent);
  const status: PresenceKind = metFull ? "full" : "partial";
  const evidence = metFull
    ? `Joined ${clockOf(event.joinMin)} (grace ${JOIN_GRACE_MINUTES}m) and dwell ${(elapsedShare * 100).toFixed(0)}% ≥ ${FULL_SESSION_THRESHOLD * 100}% of scheduled length.`
    : onTrackForFull
      ? `Still present at demo clock ${DEMO_CLOCK}; elapsed ${(elapsedShare * 100).toFixed(0)}% — full-session needs ${FULL_SESSION_THRESHOLD * 100}% plus on-time join.`
      : `Join ${clockOf(event.joinMin)}${event.leaveMin != null ? `, leave ${clockOf(event.leaveMin)}` : ""}; dwell ${(elapsedShare * 100).toFixed(0)}% does not meet the ${FULL_SESSION_THRESHOLD * 100}% rule.`;
  return {
    participantId: event.participantId,
    sessionId: event.sessionId,
    status,
    onTrackForFull,
    activeNow,
    joinClock: clockOf(event.joinMin),
    leaveClock: event.leaveMin == null ? null : clockOf(event.leaveMin),
    elapsedShare,
    evidence,
  };
}

export function unknownPresence(participantId: string, sessionId: string): PresenceRow {
  return {
    participantId,
    sessionId,
    status: "unknown",
    onTrackForFull: false,
    activeNow: false,
    joinClock: null,
    leaveClock: null,
    elapsedShare: null,
    evidence: "No join/leave evidence. Intention is not observed presence.",
  };
}

export type EngagementFilters = {
  topic?: string | null;
  sessionId?: string | null;
};

export type EngagementSnapshot = {
  mode: "synthetic";
  label: typeof SYNTHETIC_LABEL;
  source: string;
  window: string;
  fetchedAt: string;
  demo: {
    date: string;
    clock: string;
    timezone: string;
    note: string;
  };
  rules: {
    fullSession: string;
    intentVsPresence: string;
    gps: string;
  };
  totals: {
    participants: number;
    activeNow: number;
    plannedFull: number;
    plannedPartial: number;
    observedFull: number;
    observedPartial: number;
    unknownPresence: number;
  };
  topics: Array<{ topic: string; interested: number }>;
  sessions: Array<{
    id: string;
    title: string;
    speaker: string;
    track: string;
    tags: string[];
    start: string;
    end: string;
    phase: "ended" | "in_progress" | "upcoming";
    plannedFull: number;
    plannedPartial: number;
    observedFull: number;
    observedPartial: number;
    unknown: number;
    activeNow: number;
    onTrackForFull: number;
  }>;
  heatmap: Array<{ sessionId: string; topic: string; count: number }>;
  timeline: Array<{ clock: string; arrivals: number; departures: number; occupancy: number }>;
  people: Array<{
    id: string;
    displayName: string;
    role: string;
    contact: string;
    topics: string[];
    intent: IntentKind;
    presence: PresenceKind;
    onTrackForFull: boolean;
    activeNow: boolean;
    evidence: string;
    sessionId: string | null;
    sessionTitle: string | null;
  }>;
  filters: { topic: string | null; sessionId: string | null };
};

function sessionPhase(session: SampleSession, clock: number): "ended" | "in_progress" | "upcoming" {
  const start = minutesOf(session.start);
  const end = minutesOf(session.end);
  if (end <= clock) return "ended";
  if (start <= clock) return "in_progress";
  return "upcoming";
}

export function syntheticEngagement(filters: EngagementFilters = {}): EngagementSnapshot {
  const { catalog, clock, participants, intents, events } = RECORDS;
  const topic = filters.topic && catalog.interests.includes(filters.topic) ? filters.topic : null;
  const sessionId = filters.sessionId && catalog.sessions.some((s) => s.id === filters.sessionId) ? filters.sessionId : null;

  const topicSet = new Set(topic ? participants.filter((p) => p.topics.includes(topic)).map((p) => p.id) : participants.map((p) => p.id));
  const scopedPeople = participants.filter((p) => topicSet.has(p.id));

  const presenceRows = new Map<string, PresenceRow>();
  for (const event of events) {
    const session = catalog.sessions.find((s) => s.id === event.sessionId)!;
    presenceRows.set(`${event.participantId}:${event.sessionId}`, presenceFor(event, session, clock));
  }

  const sessionStats = catalog.sessions.map((session) => {
    const phase = sessionPhase(session, clock);
    let plannedFull = 0;
    let plannedPartial = 0;
    let observedFull = 0;
    let observedPartial = 0;
    let unknown = 0;
    let activeNow = 0;
    let onTrackForFull = 0;
    for (const person of scopedPeople) {
      const intent = intents.find((i) => i.participantId === person.id && i.sessionId === session.id);
      if (intent?.intent === "plans_full") plannedFull += 1;
      else if (intent?.intent === "plans_partial") plannedPartial += 1;
      const row = presenceRows.get(`${person.id}:${session.id}`) ?? unknownPresence(person.id, session.id);
      if (row.status === "full") observedFull += 1;
      else if (row.status === "partial") observedPartial += 1;
      else unknown += 1;
      if (row.activeNow) activeNow += 1;
      if (row.onTrackForFull) onTrackForFull += 1;
    }
    return {
      id: session.id,
      title: session.title,
      speaker: session.speaker,
      track: session.track,
      tags: session.tags,
      start: session.start,
      end: session.end,
      phase,
      plannedFull,
      plannedPartial,
      observedFull,
      observedPartial,
      unknown,
      activeNow,
      onTrackForFull,
    };
  });

  const topics = catalog.interests
    .map((name) => ({
      topic: name,
      interested: scopedPeople.filter((p) => p.topics.includes(name)).length,
    }))
    .filter((t) => t.interested > 0)
    .sort((a, b) => b.interested - a.interested);

  const heatmap: EngagementSnapshot["heatmap"] = [];
  for (const session of catalog.sessions) {
    for (const name of catalog.interests) {
      const count = scopedPeople.filter((p) => {
        if (!p.topics.includes(name)) return false;
        const intent = intents.some((i) => i.participantId === p.id && i.sessionId === session.id);
        const present = presenceRows.has(`${p.id}:${session.id}`);
        return intent || present;
      }).length;
      if (count > 0) heatmap.push({ sessionId: session.id, topic: name, count });
    }
  }

  const startMin = minutesOf("08:45");
  const endMin = minutesOf("16:45");
  const timeline: EngagementSnapshot["timeline"] = [];
  for (let t = startMin; t <= endMin; t += 15) {
    let arrivals = 0;
    let departures = 0;
    let occupancy = 0;
    for (const event of events) {
      if (topic && !topicSet.has(event.participantId)) continue;
      if (sessionId && event.sessionId !== sessionId) continue;
      if (event.joinMin >= t && event.joinMin < t + 15) arrivals += 1;
      if (event.leaveMin != null && event.leaveMin >= t && event.leaveMin < t + 15) departures += 1;
      const inRoom = event.joinMin <= t && (event.leaveMin == null || event.leaveMin > t);
      if (inRoom) occupancy += 1;
    }
    timeline.push({ clock: clockOf(t), arrivals, departures, occupancy });
  }

  const focusSession = sessionId ?? (catalog.sessions.find((s) => sessionPhase(s, clock) === "in_progress")?.id ?? catalog.sessions[0]!.id);
  const people = scopedPeople
    .map((p) => {
      const intent = intents.find((i) => i.participantId === p.id && i.sessionId === focusSession);
      const row = presenceRows.get(`${p.id}:${focusSession}`) ?? unknownPresence(p.id, focusSession);
      const session = catalog.sessions.find((s) => s.id === focusSession)!;
      return {
        id: p.id,
        displayName: p.displayName,
        role: p.role,
        contact: p.contact,
        topics: p.topics,
        intent: (intent?.intent ?? "none") as IntentKind,
        presence: row.status,
        onTrackForFull: row.onTrackForFull,
        activeNow: row.activeNow,
        evidence: row.evidence,
        sessionId: focusSession,
        sessionTitle: session.title,
      };
    })
    .filter((p) => {
      if (!sessionId) return p.intent !== "none" || p.presence !== "unknown" || p.topics.length > 0;
      return true;
    })
    .sort((a, b) => Number(b.activeNow) - Number(a.activeNow) || a.displayName.localeCompare(b.displayName));

  let plannedFull = 0;
  let plannedPartial = 0;
  let observedFull = 0;
  let observedPartial = 0;
  const observedUnknown = new Set<string>();
  for (const person of scopedPeople) {
    const personIntents = intents.filter((i) => i.participantId === person.id);
    if (personIntents.some((i) => i.intent === "plans_full")) plannedFull += 1;
    else if (personIntents.some((i) => i.intent === "plans_partial")) plannedPartial += 1;
    const rows = [...presenceRows.values()].filter((r) => r.participantId === person.id);
    if (rows.some((r) => r.status === "full")) observedFull += 1;
    else if (rows.some((r) => r.status === "partial")) observedPartial += 1;
    else observedUnknown.add(person.id);
  }

  const activeNow = new Set(
    [...presenceRows.values()].filter((r) => r.activeNow && topicSet.has(r.participantId)).map((r) => r.participantId),
  ).size;

  return {
    mode: "synthetic",
    label: SYNTHETIC_LABEL,
    source: "Floorwise deterministic SAMPLE-catalog scenario (not Dash0 remote, not live KCNA)",
    window: `Demo clock ${DEMO_DATE} ${DEMO_CLOCK} ${DEMO_TZ} · SAMPLE sessions only`,
    fetchedAt: new Date().toISOString(),
    demo: {
      date: DEMO_DATE,
      clock: DEMO_CLOCK,
      timezone: DEMO_TZ,
      note: "Official KCNA 2026 is 9–12 Nov. This clock is a labeled Tuesday demo on the SAMPLE 12-talk schematic, not live hall counts.",
    },
    rules: {
      fullSession: `Observed full-session dwell: join within ${JOIN_GRACE_MINUTES} minutes of start and remain for ≥ ${FULL_SESSION_THRESHOLD * 100}% of scheduled length (or still present once that threshold is reached).`,
      intentVsPresence:
        "Agenda-like plans (plans_full / plans_partial) are intentions only. They are never counted as observed presence or completion.",
      gps: "No GPS, geofence, or PDF pin is used for attendance.",
    },
    totals: {
      participants: scopedPeople.length,
      activeNow,
      plannedFull,
      plannedPartial,
      observedFull,
      observedPartial,
      unknownPresence: observedUnknown.size,
    },
    topics,
    sessions: sessionId ? sessionStats.filter((s) => s.id === sessionId) : sessionStats,
    heatmap: sessionId ? heatmap.filter((h) => h.sessionId === sessionId) : heatmap,
    timeline,
    people: sessionId ? people : people.filter((p) => p.activeNow || p.intent !== "none").slice(0, 48),
    filters: { topic, sessionId },
  };
}

export function liveEngagementUnavailable() {
  return {
    mode: "live" as const,
    available: false,
    label: "Live attendance is not available",
    source: "No consented live attendee presence feed is configured",
    window: "KCNA 2026 is 9–12 Nov 2026 — Floorwise does not observe halls",
    fetchedAt: new Date().toISOString(),
    error:
      "Live participant counts are not configured. Agenda saves and Must/Maybe prefs are intentions, not attendance. Synthetic mode is a separate labeled demo.",
    data: null,
  };
}

export function syntheticMetricPoints() {
  const snap = syntheticEngagement();
  return {
    serviceName: "floorwise-synthetic-demo",
    attributes: { "floorwise.synthetic": "true" },
    gauges: [
      { name: "floorwise.synthetic.participants", value: snap.totals.participants },
      { name: "floorwise.synthetic.active_now", value: snap.totals.activeNow },
      { name: "floorwise.synthetic.observed_full", value: snap.totals.observedFull },
    ],
    byTopic: snap.topics.map((t) => ({
      name: "floorwise.synthetic.topic_interest",
      value: t.interested,
      topic: t.topic,
    })),
  };
}

export function recordsForTest() {
  return RECORDS;
}
