import { CONFERENCE_DAYS, type ConferenceDayId } from "./ask";
import { hasExhibitorTopicMatch, hasInterestMatch } from "./ranked-filter";
import { canonicalTopic, clampUnit, clampWeight, tasteMatchPercent, whyTaste } from "./taste";
import { CONFERENCE_TZ, dayKey } from "./timezone";
import type { Booth, QueryMode, Rank, RankEngineMode, Ranked, Session, TasteProfile } from "./types";

/** Main conference days shown in the slim rail (colocated Sunday stays on Search). */
export const GUIDE_DAYS = CONFERENCE_DAYS.filter((day) => day.id !== "2026-11-08");

export type PairSide = {
  heading: string;
  topics: Record<string, number>;
  expoDelta?: number;
  depthDelta?: number;
  format?: "talks" | "handsOn";
};

/** Editorial this-or-that prompts. Picks write taste weights, then Elasticsearch re-ranks. */
export const TASTE_PAIRS: [PairSide, PairSide][] = [
  [
    { heading: "Debugging a cluster at 3am", topics: { observability: 0.8, Kubernetes: 0.5, "Operations + Performance": 0.4 } },
    { heading: "Designing a platform for 400 devs", topics: { "platform engineering": 1, "Platform Engineering": 0.8, "Cloud Native Experience": 0.4 } },
  ],
  [
    { heading: "Kernel-level visibility", topics: { eBPF: 1, Observability: 0.4 } },
    { heading: "Dashboards the whole team reads", topics: { Observability: 1, observability: 0.8 } },
  ],
  [
    { heading: "Locking down the supply chain", topics: { security: 1, Security: 0.8 } },
    { heading: "Golden paths that ship faster", topics: { "platform engineering": 1, "Platform Engineering": 0.7 } },
  ],
  [
    { heading: "Wasm at the edge", topics: { WASM: 1, "Emerging + Advanced": 0.5 } },
    { heading: "Classic containers, tuned", topics: { Kubernetes: 1, "Operations + Performance": 0.4 } },
  ],
  [
    { heading: "Cutting the cloud bill", topics: { FinOps: 1, "Operations + Performance": 0.4 } },
    { heading: "Cutting the pager noise", topics: { observability: 0.7, Observability: 0.7, "Operations + Performance": 0.5 } },
  ],
  [
    { heading: "A war-story postmortem", topics: { observability: 0.5, Kubernetes: 0.4, "Operations + Performance": 0.6 } },
    { heading: "A hands-on tutorial", topics: { "Cloud Native Experience": 0.7, "Application Development + Delivery": 0.4 }, format: "handsOn", expoDelta: 0.12 },
  ],
  [
    { heading: "Tracing every request", topics: { Observability: 1, OpenTelemetry: 0.7 } },
    { heading: "Policy as code", topics: { Security: 1, security: 0.6 } },
  ],
  [
    { heading: "Frontend performance", topics: { "Application Development + Delivery": 0.7, Observability: 0.4 } },
    { heading: "eBPF networking", topics: { eBPF: 1, Connectivity: 0.5 } },
  ],
  [
    { heading: "Hallway chats at booths", topics: {}, expoDelta: 0.35, format: "handsOn" },
    { heading: "Front row at talks", topics: {}, expoDelta: -0.3, format: "talks" },
  ],
];

const TOPIC_LABEL: Record<string, string> = {
  eBPF: "eBPF",
  observability: "observability",
  Observability: "observability",
  OpenTelemetry: "OpenTelemetry",
  Kubernetes: "Kubernetes internals",
  security: "security",
  Security: "security",
  "platform engineering": "platform eng",
  "Platform Engineering": "platform eng",
  "Cloud Native Experience": "developer experience",
  "Application Development + Delivery": "developer experience",
  "Operations + Performance": "on-call / SRE",
  WASM: "Wasm",
  "Emerging + Advanced": "Wasm",
  FinOps: "cost",
  Connectivity: "networking",
};

const STOP = new Set(
  "a an the that this make makes less more with for about talks talk to of on in and or my me i want love like how what some".split(
    " ",
  ),
);

export function queryTokens(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/["“”]/g, "")
    .split(/[^a-z0-9-]+/)
    .filter((word) => word.length > 1 && !STOP.has(word));
}

/** Pick an Elasticsearch mode the API can actually run. */
export function inferQueryMode(q: string): QueryMode {
  const raw = q.trim();
  const tokens = queryTokens(q);
  if (!raw) return "semantic";
  if (/^["“].*["”]$/.test(raw) || tokens.length <= 1) return "keyword";
  return "hybrid";
}

export function formatModePill(mode: QueryMode | RankEngineMode | null | undefined): string {
  if (mode === "keyword" || mode === "keyword-bm25") return "KEYWORD · BM25";
  if (mode === "semantic" || mode === "semantic-knn") return "SEMANTIC · kNN";
  return "HYBRID · BM25 + kNN";
}

export type ModePillView = {
  display: string;
  outgoing: string | null;
  incoming: boolean;
};

/** Keep the visible pill from sticking on `.in` (opacity 0) after a HYBRID transition. */
export function nextModePillView(current: ModePillView, pill: string): ModePillView {
  if (pill === current.display) {
    return { display: current.display, outgoing: current.outgoing, incoming: false };
  }
  return { display: pill, outgoing: current.display, incoming: true };
}

export function tasteHasTopics(taste: TasteProfile): boolean {
  return Object.values(taste.topicWeights).some((weight) => weight > 0);
}

export function applyPairSide(taste: TasteProfile, side: PairSide, sign: 1 | -1): TasteProfile {
  const topicWeights = { ...taste.topicWeights };
  for (const [topic, weight] of Object.entries(side.topics)) {
    topicWeights[topic] = clampWeight((topicWeights[topic] ?? 0) + sign * weight);
    const canon = canonicalTopic(topic);
    if (canon !== topic) {
      topicWeights[canon] = clampWeight((topicWeights[canon] ?? 0) + sign * weight * 0.6);
    }
  }
  let talks = taste.formatWeights.talks;
  let handsOn = taste.formatWeights.handsOn;
  if (side.format === "talks") talks = clampWeight(talks + sign * 0.4);
  if (side.format === "handsOn") handsOn = clampWeight(handsOn + sign * 0.4);
  return {
    ...taste,
    topicWeights,
    expoShare: clampUnit(taste.expoShare + sign * (side.expoDelta ?? 0)),
    depth: clampUnit(taste.depth + sign * (side.depthDelta ?? 0)),
    formatWeights: { talks, handsOn },
  };
}

export function pairPrimaryLabel(side: PairSide): string {
  const topic = Object.keys(side.topics)[0];
  if (topic) return TOPIC_LABEL[topic] ?? topic;
  if (side.format === "handsOn" || (side.expoDelta ?? 0) > 0) return "expo time";
  if (side.format === "talks" || (side.expoDelta ?? 0) < 0) return "talks";
  return "taste";
}

const DIAL_WORDS = {
  depth: ["intro", "balanced", "deep"],
  hall: ["talks", "mixed", "expo"],
  pace: ["easy", "steady", "packed"],
} as const;

export function dialWord(kind: keyof typeof DIAL_WORDS, value: number): string {
  return DIAL_WORDS[kind][value < 34 ? 0 : value < 67 ? 1 : 2]!;
}

export type GuidePickKind = "session" | "booth";

export type GuidePick = {
  kind: GuidePickKind;
  id: string;
  title: string;
  dayLabel?: string;
  time?: string;
  code?: string;
  sample: boolean;
  match: number;
  score: number;
  why: string;
  session?: Session;
  booth?: Booth;
};

function isSampleSession(session: Session): boolean {
  return session.dataset === "sample" || session.roomId === "255";
}

function weekdayShort(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  return new Intl.DateTimeFormat("en-US", { timeZone: CONFERENCE_TZ, weekday: "short" }).format(new Date(iso));
}

function clock(iso: string | undefined, fallback?: string): string | undefined {
  if (iso) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: CONFERENCE_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso));
  }
  return fallback;
}

/** Blend Elasticsearch Must/Maybe/Meh with the local taste overlay for the MATCH numeral. */
export function matchPercentFor(
  rank: Rank,
  score: number,
  tastePct: number,
): number {
  const esBand = rank === "must" ? 88 : rank === "maybe" ? 72 : 58;
  const esNudge = Math.max(-6, Math.min(8, Math.round(score / 4)));
  if (tastePct <= 0) return Math.max(1, Math.min(99, esBand + esNudge));
  return Math.max(1, Math.min(99, Math.round(0.4 * (esBand + esNudge) + 0.6 * tastePct)));
}

function guideWhy(opts: {
  tasteBits: string[];
  keyword?: string;
  matchedLabels: string[];
  searching: boolean;
  hasTaste: boolean;
}): string {
  const bits: string[] = [];
  if (opts.hasTaste) bits.push(...opts.tasteBits);
  if (opts.keyword) bits.push(`keyword “${opts.keyword}”`);
  else if (opts.searching) bits.push(...opts.matchedLabels);
  const labeled = bits.filter(Boolean).slice(0, 3);
  if (opts.hasTaste && labeled.length) return `Because you like ${labeled.join(" · ")}`;
  if (opts.keyword) return `Elasticsearch matched ${labeled.join(" · ")}`;
  if (opts.searching && labeled.length) return `Elasticsearch matched ${labeled.join(" · ")}`;
  if (opts.searching) return "Elasticsearch ranked this for your query — no keyword overlap in the title or tags";
  return "A stretch pick — Elasticsearch ranked it before you locked taste";
}

function sessionWhy(session: Session, taste: TasteProfile, official: Session[], query: string, matchedTags: string[]): string {
  const tasteWhy = whyTaste(session, taste, official);
  const tasteBits: string[] = [];
  if (tasteWhy) {
    const cleaned = tasteWhy.replace(/^Matches:\s*/i, "");
    for (const bit of cleaned.split(/;|,/).map((s) => s.trim()).filter(Boolean)) {
      if (bit) tasteBits.push(bit);
    }
  }
  const matchedLabels: string[] = [];
  for (const tag of matchedTags.slice(0, 2)) {
    const label = TOPIC_LABEL[tag] ?? tag;
    if (!matchedLabels.some((p) => p.toLowerCase() === label.toLowerCase())) matchedLabels.push(label);
  }
  const tokens = queryTokens(query).filter((token) => {
    const hay = `${session.title} ${session.abstract} ${session.tags.join(" ")}`.toLowerCase();
    return hay.includes(token);
  });
  return guideWhy({
    tasteBits,
    keyword: tokens[0],
    matchedLabels,
    searching: query.trim().length > 0,
    hasTaste: tasteHasTopics(taste),
  });
}

function boothWhy(booth: Booth, taste: TasteProfile, query: string, matchedTags: string[]): string {
  const weights = Object.entries(taste.topicWeights)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1]);
  const overlap = booth.tags.filter((tag) =>
    weights.some(([topic]) => topic.toLowerCase() === tag.toLowerCase() || canonicalTopic(topic).toLowerCase() === tag.toLowerCase()),
  );
  const tasteBits = overlap.slice(0, 2).map((tag) => TOPIC_LABEL[tag] ?? tag);
  const matchedLabels = matchedTags.slice(0, 2).map((tag) => TOPIC_LABEL[tag] ?? tag);
  const tokens = queryTokens(query).filter((token) =>
    `${booth.sponsor} ${booth.tagline} ${booth.pitch} ${booth.tags.join(" ")}`.toLowerCase().includes(token),
  );
  return guideWhy({
    tasteBits,
    keyword: tokens[0],
    matchedLabels,
    searching: query.trim().length > 0,
    hasTaste: tasteHasTopics(taste),
  });
}

export function mixGuidePicks(opts: {
  sessions: Ranked<Session>[];
  booths: Ranked<Booth>[];
  taste: TasteProfile;
  officialSessions: Session[];
  query: string;
  searching: boolean;
}): GuidePick[] {
  const hasTaste = tasteHasTopics(opts.taste);
  const sessions = opts.sessions.filter((row) => {
    if (!opts.searching && isSampleSession(row.item)) return false;
    if (!opts.searching) {
      const track = row.item.track ?? "";
      const types = row.item.sessionTypeLabels ?? [];
      if (/registration/i.test(track) || types.some((label) => /registration/i.test(label))) return false;
      if (hasTaste && !hasInterestMatch(row)) return false;
    }
    return true;
  });
  const booths = opts.booths.filter((row) => opts.searching || !hasTaste || hasExhibitorTopicMatch(row));

  const sessionPicks = sessions.slice(0, 2).map((row) => {
    const tastePct = tasteMatchPercent(row.item, opts.taste, opts.officialSessions);
    return {
      kind: "session" as const,
      id: row.item.id,
      title: row.item.title,
      dayLabel: weekdayShort(row.item.startIso),
      time: clock(row.item.startIso, row.item.start),
      sample: isSampleSession(row.item),
      match: matchPercentFor(row.rank, row.score, tastePct),
      score: row.score,
      why: sessionWhy(row.item, opts.taste, opts.officialSessions, opts.query, row.matchedTags),
      session: row.item,
    };
  });
  const boothPicks = booths.slice(0, 1).map((row) => {
    const tastePct = Math.round(
      40 +
        row.matchedTags.length * 12 +
        Object.entries(opts.taste.topicWeights).reduce((sum, [topic, weight]) => {
          if (weight <= 0) return sum;
          return row.item.tags.some((tag) => tag.toLowerCase() === topic.toLowerCase()) ? sum + weight * 18 : sum;
        }, 0),
    );
    return {
      kind: "booth" as const,
      id: row.item.id,
      title: row.item.sponsor,
      code: row.item.boothNumber,
      sample: /sample/i.test(row.item.exhibitorSource) || row.item.id.startsWith("sample"),
      match: matchPercentFor(row.rank, row.score, Math.max(0, Math.min(99, tastePct))),
      score: row.score,
      why: boothWhy(row.item, opts.taste, opts.query, row.matchedTags),
      booth: row.item,
    };
  });
  return [...sessionPicks, ...boothPicks].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export function defaultGuideDay(attendanceDays: string[], now = new Date()): ConferenceDayId {
  const today = dayKey(now.toISOString(), CONFERENCE_TZ);
  const inGuide = GUIDE_DAYS.find((day) => day.id === today);
  if (inGuide) return inGuide.id;
  const fromAttendance = GUIDE_DAYS.find((day) => attendanceDays.includes(day.id));
  if (fromAttendance) return fromAttendance.id;
  return "2026-11-10";
}

export function sessionDayId(session: Session): ConferenceDayId | null {
  if (!session.startIso) return null;
  const key = dayKey(session.startIso, CONFERENCE_TZ);
  return CONFERENCE_DAYS.some((day) => day.id === key) ? (key as ConferenceDayId) : null;
}

export function sessionDayShort(session: Session): string {
  return weekdayShort(session.startIso) ?? "";
}

export function sessionClock(session: Session): string {
  return clock(session.startIso, session.start) ?? session.start;
}

export function shortTitle(title: string, max = 42): string {
  const trimmed = title.replace(/^Sample:\s*/i, "");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}
