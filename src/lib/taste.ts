import { catalog } from "./catalog";
import type { Profile, Session, SwipeChoice, TasteProfile, TasteSwipe } from "./types";

/** Official All Sessions tracks that are topical (not Registration / Breaks). */
export const TASTE_TRACKS = [
  "AI Inference + Agentic",
  "Application Development + Delivery",
  "Cloud Native Experience",
  "Cloud Native Novice",
  "Connectivity",
  "Data Processing + Storage",
  "Emerging + Advanced",
  "Observability",
  "Operations + Performance",
  "Platform Engineering",
  "Security",
  "Maintainer Track",
] as const;

export const AUDIENCE_LEVELS = ["Beginner", "Advanced", "Any Level"] as const;

const WEIGHT_MIN = -1;
const WEIGHT_MAX = 2;
const INTEREST_FLOOR = 0.35;
export const SWIPE_DECK_SIZE = 10;

const CATALOG_TO_TRACK: Record<string, string> = {
  observability: "Observability",
  "platform engineering": "Platform Engineering",
  security: "Security",
  "ai/ml": "AI Inference + Agentic",
  storage: "Data Processing + Storage",
};

const SERVICE_TRACK = /registration|break/i;

export function emptyTaste(): TasteProfile {
  return {
    topicWeights: {},
    levelWeights: { Beginner: 0, Advanced: 0, "Any Level": 0 },
    formatWeights: { talks: 0, handsOn: 0 },
    depth: 0.72,
    expoShare: 0.4,
    packed: 0.55,
    swipes: [],
  };
}

export function clampWeight(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, n));
}

export function clampUnit(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

export function maxSessionsPerDay(packed: number): number {
  return Math.round(3 + clampUnit(packed) * 5);
}

export function bufferFromPacked(packed: number): number {
  return Math.round(20 - clampUnit(packed) * 15);
}

export function parseTaste(raw: unknown): TasteProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<TasteProfile>;
  const topicWeights: Record<string, number> = {};
  if (data.topicWeights && typeof data.topicWeights === "object") {
    for (const [key, value] of Object.entries(data.topicWeights)) {
      if (key.trim()) topicWeights[key] = clampWeight(Number(value));
    }
  }
  const levelWeights: Record<string, number> = { Beginner: 0, Advanced: 0, "Any Level": 0 };
  if (data.levelWeights && typeof data.levelWeights === "object") {
    for (const [key, value] of Object.entries(data.levelWeights)) {
      if (key.trim()) levelWeights[key] = clampWeight(Number(value));
    }
  }
  const talks = clampWeight(Number(data.formatWeights?.talks ?? 0));
  const handsOn = clampWeight(Number(data.formatWeights?.handsOn ?? 0));
  const swipes: TasteSwipe[] = Array.isArray(data.swipes)
    ? data.swipes
        .filter((row): row is TasteSwipe => {
          if (!row || typeof row !== "object") return false;
          return typeof row.sessionId === "string" && isSwipeChoice(row.choice);
        })
        .slice(0, 40)
    : [];
  return {
    topicWeights,
    levelWeights,
    formatWeights: { talks, handsOn },
    depth: clampUnit(Number(data.depth ?? 0.5)),
    expoShare: clampUnit(Number(data.expoShare ?? 0.25)),
    packed: clampUnit(Number(data.packed ?? 0.4)),
    swipes,
  };
}

function isSwipeChoice(value: unknown): value is SwipeChoice {
  return value === "love" || value === "maybe" || value === "skip";
}

export function tasteFromInterests(interests: string[], goals: string[] = []): TasteProfile {
  const taste = emptyTaste();
  for (const interest of interests) {
    taste.topicWeights[interest] = 1;
    const canon = canonicalTopic(interest);
    if (canon !== interest) taste.topicWeights[canon] = Math.max(taste.topicWeights[canon] ?? 0, 1);
  }
  if (goals.includes("tutorials")) {
    taste.expoShare = 0.55;
    taste.depth = 0.7;
    taste.formatWeights.handsOn = 0.6;
  }
  if (goals.includes("exhibitors")) taste.expoShare = Math.max(taste.expoShare, 0.45);
  if (goals.includes("talks")) taste.formatWeights.talks = Math.max(taste.formatWeights.talks, 0.4);
  return taste;
}

export function ensureTaste(profile: Pick<Profile, "interests" | "goals" | "taste">): TasteProfile {
  if (profile.taste) return profile.taste;
  if (profile.interests.length > 0) return tasteFromInterests(profile.interests, profile.goals);
  return emptyTaste();
}

export function canonicalTopic(topic: string): string {
  return CATALOG_TO_TRACK[topic.toLowerCase()] ?? topic;
}

export function interestsFromTaste(taste: TasteProfile): string[] {
  const keys = new Set<string>();
  for (const [topic, weight] of Object.entries(taste.topicWeights)) {
    if (weight >= INTEREST_FLOOR) {
      keys.add(topic);
      keys.add(canonicalTopic(topic));
    }
  }
  return [...keys].sort((a, b) => (taste.topicWeights[b] ?? 0) - (taste.topicWeights[a] ?? 0) || a.localeCompare(b));
}

export function hasTasteSignal(profile: Pick<Profile, "interests" | "taste">): boolean {
  if (profile.interests.length > 0) return true;
  const taste = profile.taste;
  if (!taste) return false;
  if (taste.swipes.length > 0) return true;
  return Object.values(taste.topicWeights).some((weight) => Math.abs(weight) >= INTEREST_FLOOR);
}

export function withTaste(profile: Profile, taste: TasteProfile): Profile {
  return {
    ...profile,
    taste,
    interests: interestsFromTaste(taste),
  };
}

export function sessionFormat(session: Session): "talk" | "handsOn" {
  const blob = `${session.track} ${(session.sessionTypeLabels ?? []).join(" ")}`;
  if (/tutorial|contribfest|experiences/i.test(blob)) return "handsOn";
  return "talk";
}

export function sessionTopics(session: Session): string[] {
  const out = new Set<string>();
  if (session.track) out.add(session.track);
  for (const tag of session.tags) out.add(tag);
  const hay = `${session.title} ${session.abstract} ${session.tags.join(" ")}`.toLowerCase();
  for (const interest of catalog.interests) {
    if (interest.length >= 3 && hay.includes(interest.toLowerCase())) out.add(interest);
  }
  return [...out];
}

function deltaFor(choice: SwipeChoice): number {
  if (choice === "love") return 0.45;
  if (choice === "maybe") return 0.15;
  return -0.22;
}

export function applySwipe(taste: TasteProfile, session: Session, choice: SwipeChoice): TasteProfile {
  const next: TasteProfile = {
    ...taste,
    topicWeights: { ...taste.topicWeights },
    levelWeights: { ...taste.levelWeights },
    formatWeights: { ...taste.formatWeights },
    swipes: [...taste.swipes.filter((row) => row.sessionId !== session.id), { sessionId: session.id, choice }],
  };
  const delta = deltaFor(choice);
  for (const topic of sessionTopics(session)) {
    next.topicWeights[topic] = clampWeight((next.topicWeights[topic] ?? 0) + delta);
    const canon = canonicalTopic(topic);
    if (canon !== topic) {
      next.topicWeights[canon] = clampWeight((next.topicWeights[canon] ?? 0) + delta * 0.6);
    }
  }
  if (session.audienceLevel) {
    next.levelWeights[session.audienceLevel] = clampWeight((next.levelWeights[session.audienceLevel] ?? 0) + delta);
  }
  const format = sessionFormat(session);
  if (format === "handsOn") {
    next.formatWeights.handsOn = clampWeight(next.formatWeights.handsOn + delta);
    next.expoShare = clampUnit(next.expoShare + delta * 0.12);
  } else {
    next.formatWeights.talks = clampWeight(next.formatWeights.talks + delta);
    next.expoShare = clampUnit(next.expoShare - delta * 0.08);
  }
  if (session.audienceLevel === "Advanced") next.depth = clampUnit(next.depth + delta * 0.12);
  if (session.audienceLevel === "Beginner") next.depth = clampUnit(next.depth - delta * 0.12);
  return next;
}

export function setTopicWeight(taste: TasteProfile, topic: string, weight: number): TasteProfile {
  const topicWeights = { ...taste.topicWeights, [topic]: clampWeight(weight) };
  const canon = canonicalTopic(topic);
  if (canon !== topic && Math.abs(weight) >= INTEREST_FLOOR) {
    topicWeights[canon] = clampWeight(Math.max(topicWeights[canon] ?? 0, weight * 0.7));
  }
  return { ...taste, topicWeights };
}

export function nudgeTopic(taste: TasteProfile, topic: string, delta: number): TasteProfile {
  return setTopicWeight(taste, topic, (taste.topicWeights[topic] ?? 0) + delta);
}

export function swipeEligible(session: Session): boolean {
  if (session.dataset === "sample") return false;
  if (session.isServiceSession) return false;
  const track = session.track ?? "";
  const types = (session.sessionTypeLabels ?? []).join(" ");
  if (SERVICE_TRACK.test(track) || SERVICE_TRACK.test(types)) return false;
  if (/registration/i.test(session.title)) return false;
  if (!session.startIso || !session.endIso) return false;
  const ms = Date.parse(session.endIso) - Date.parse(session.startIso);
  if (!Number.isFinite(ms) || ms <= 0 || ms > 3 * 60 * 60 * 1000) return false;
  if ((session.abstract?.length ?? 0) < 40) return false;
  return true;
}

function richness(session: Session): number {
  let n = 0;
  if (session.audienceLevel) n += 2;
  if (session.speaker && session.speaker !== "—") n += 1;
  if (session.roomLabel) n += 1;
  if ((session.abstract?.length ?? 0) > 120) n += 1;
  return n;
}

function topicEvidence(taste: TasteProfile, topic: string): number {
  return Math.abs(taste.topicWeights[topic] ?? 0) + Math.abs(taste.topicWeights[canonicalTopic(topic)] ?? 0) * 0.5;
}

export function cardUncertainty(session: Session, taste: TasteProfile): number {
  const topics = sessionTopics(session);
  const avg = topics.length ? topics.reduce((sum, topic) => sum + topicEvidence(taste, topic), 0) / topics.length : 0;
  const level = session.audienceLevel ? Math.abs(taste.levelWeights[session.audienceLevel] ?? 0) : 0;
  return 3 - avg - 0.35 * level;
}

export function pickNextSwipeCard(
  sessions: Session[],
  taste: TasteProfile,
  seenIds: Set<string>,
  recentTracks: string[] = [],
): Session | null {
  let best: Session | null = null;
  let bestScore = -Infinity;
  for (const session of sessions) {
    if (!swipeEligible(session) || seenIds.has(session.id)) continue;
    const recentPenalty = recentTracks.includes(session.track) ? 1.4 : 0;
    const score = cardUncertainty(session, taste) + richness(session) * 0.35 - recentPenalty;
    if (score > bestScore) {
      best = session;
      bestScore = score;
    }
  }
  return best;
}

const SEED_TRACKS: readonly string[] = [
  "Security",
  "Observability",
  "Platform Engineering",
  "Connectivity",
  "AI Inference + Agentic",
  "Application Development + Delivery",
];

export function pickSwipeDeck(sessions: Session[], taste: TasteProfile, count = SWIPE_DECK_SIZE): Session[] {
  const seen = new Set<string>();
  const out: Session[] = [];
  for (const track of SEED_TRACKS) {
    if (out.length >= count) break;
    const hit = sessions
      .filter((session) => swipeEligible(session) && session.track === track && richness(session) >= 2)
      .sort((a, b) => b.title.localeCompare(a.title))[0];
    if (hit && !seen.has(hit.id)) {
      out.push(hit);
      seen.add(hit.id);
    }
  }
  while (out.length < count) {
    const next = pickNextSwipeCard(
      sessions,
      taste,
      seen,
      out.slice(-2).map((session) => session.track),
    );
    if (!next) break;
    out.push(next);
    seen.add(next.id);
  }
  return out;
}

export function topicBoost(session: Session, taste: TasteProfile): number {
  const topics = sessionTopics(session);
  if (!topics.length) return 0;
  const sum = topics.reduce((acc, topic) => acc + (taste.topicWeights[topic] ?? 0), 0);
  return sum / topics.length;
}

export function levelFactor(session: Session, taste: TasteProfile): number {
  const level = session.audienceLevel;
  const depth = taste.depth;
  if (level === "Advanced") return 0.55 + depth * 0.9;
  if (level === "Beginner") return 1.45 - depth * 0.9;
  const learned = level ? taste.levelWeights[level] ?? 0 : 0;
  return 1 + learned * 0.15;
}

export function formatFactor(session: Session, taste: TasteProfile): number {
  const format = sessionFormat(session);
  if (format === "handsOn") return 0.45 + taste.expoShare * 1.1;
  return 1.55 - taste.expoShare * 1.1;
}

export function tasteScore(session: Session, taste: TasteProfile, esScore = 1): number {
  const base = esScore > 0 ? esScore : 1;
  return base * (1 + topicBoost(session, taste)) * levelFactor(session, taste) * formatFactor(session, taste);
}

export function overlayTasteRank<T extends { item: Session; score: number }>(rows: T[], taste: TasteProfile): T[] {
  return [...rows].sort((a, b) => {
    const diff = tasteScore(b.item, taste, b.score) - tasteScore(a.item, taste, a.score);
    if (Math.abs(diff) > 0.0001) return diff;
    return a.item.title.localeCompare(b.item.title);
  });
}

export function lovedSimilarCount(session: Session, taste: TasteProfile, sessions: Session[]): number {
  const loved = new Set(taste.swipes.filter((row) => row.choice === "love").map((row) => row.sessionId));
  if (!loved.size) return 0;
  const topics = new Set(sessionTopics(session).map((topic) => canonicalTopic(topic).toLowerCase()));
  let count = 0;
  for (const other of sessions) {
    if (!loved.has(other.id) || other.id === session.id) continue;
    const otherTopics = sessionTopics(other).map((topic) => canonicalTopic(topic).toLowerCase());
    if (otherTopics.some((topic) => topics.has(topic))) count += 1;
  }
  return count;
}

/** Overlap with this attendee’s weights/swipes. Not a popularity score. */
export function tasteMatchPercent(session: Session, taste: TasteProfile, sessions: Session[] = []): number {
  const positive = Object.values(taste.topicWeights).some((weight) => weight > 0) || taste.swipes.some((row) => row.choice === "love");
  if (!positive) return 0;
  const topics = sessionTopics(session);
  let topicScore = 0;
  let topicMax = 0;
  for (const topic of topics) {
    topicMax += 1;
    const weight = taste.topicWeights[topic] ?? 0;
    topicScore += Math.min(1, Math.max(0, (weight + 0.2) / 1.6));
  }
  const topicPart = topicMax ? topicScore / topicMax : 0;
  let levelPart = 0.4;
  if (session.audienceLevel === "Advanced") levelPart = taste.depth;
  else if (session.audienceLevel === "Beginner") levelPart = 1 - taste.depth;
  else if (session.audienceLevel) levelPart = 0.5 + (taste.levelWeights[session.audienceLevel] ?? 0) * 0.2;
  const formatPart = sessionFormat(session) === "handsOn" ? taste.expoShare : 1 - taste.expoShare * 0.6;
  const similar = lovedSimilarCount(session, taste, sessions);
  const similarPart = Math.min(0.25, similar * 0.08);
  const raw = 100 * (0.55 * topicPart + 0.2 * Math.min(1, Math.max(0, levelPart)) + 0.15 * Math.min(1, Math.max(0, formatPart)) + similarPart);
  return Math.max(0, Math.min(99, Math.round(raw)));
}

export function whyTaste(session: Session, taste: TasteProfile, sessions: Session[] = []): string | null {
  const matches: string[] = [];
  const topics = sessionTopics(session)
    .filter((topic) => (taste.topicWeights[topic] ?? 0) >= INTEREST_FLOOR)
    .filter((topic, index, all) => all.findIndex((item) => canonicalTopic(item) === canonicalTopic(topic)) === index)
    .slice(0, 3);
  matches.push(...topics);
  if (session.audienceLevel && (taste.levelWeights[session.audienceLevel] ?? 0) >= 0.2) {
    matches.push(session.audienceLevel);
  } else if (session.audienceLevel === "Advanced" && taste.depth >= 0.66) {
    matches.push("Advanced");
  } else if (session.audienceLevel === "Beginner" && taste.depth <= 0.34) {
    matches.push("Beginner");
  }
  const similar = lovedSimilarCount(session, taste, sessions);
  const parts: string[] = [];
  if (matches.length) parts.push(`Matches: ${matches.join(", ")}`);
  if (similar > 0) parts.push(`you loved ${similar} similar talk${similar === 1 ? "" : "s"}`);
  if (!parts.length) return null;
  return parts.join("; ");
}

export function rankedTopicEntries(taste: TasteProfile): Array<{ topic: string; weight: number }> {
  const seen = new Set<string>();
  const rows: Array<{ topic: string; weight: number }> = [];
  for (const track of TASTE_TRACKS) {
    seen.add(track.toLowerCase());
    rows.push({ topic: track, weight: taste.topicWeights[track] ?? 0 });
  }
  for (const [topic, weight] of Object.entries(taste.topicWeights)) {
    if (seen.has(topic.toLowerCase()) || seen.has(canonicalTopic(topic).toLowerCase())) continue;
    if (Math.abs(weight) < 0.05) continue;
    seen.add(topic.toLowerCase());
    rows.push({ topic, weight });
  }
  for (const interest of catalog.interests) {
    if (seen.has(interest.toLowerCase()) || seen.has(canonicalTopic(interest).toLowerCase())) continue;
    const weight = taste.topicWeights[interest] ?? 0;
    if (Math.abs(weight) < 0.05) continue;
    seen.add(interest.toLowerCase());
    rows.push({ topic: interest, weight });
  }
  return rows.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight) || a.topic.localeCompare(b.topic));
}

export function depthLabel(depth: number): string {
  if (depth >= 0.66) return "Deep-dive (Advanced)";
  if (depth <= 0.34) return "Broad overview (Beginner)";
  return "Mixed levels";
}

export function expoLabel(expoShare: number): string {
  if (expoShare >= 0.6) return "Hands-on / expo time";
  if (expoShare <= 0.3) return "Talks-first";
  return "Talks with some expo";
}

export function packedLabel(packed: number): string {
  const max = maxSessionsPerDay(packed);
  const buffer = bufferFromPacked(packed);
  if (packed >= 0.66) return `Packed · up to ${max} talks/day, ${buffer} min buffer`;
  if (packed <= 0.34) return `Relaxed · up to ${max} talks/day, ${buffer} min buffer`;
  return `Balanced · up to ${max} talks/day, ${buffer} min buffer`;
}

export function tasteShareText(profile: Profile, sessions: Session[]): string {
  const taste = ensureTaste(profile);
  const topics = rankedTopicEntries(taste)
    .filter((row) => row.weight >= INTEREST_FLOOR)
    .slice(0, 6)
    .map((row) => `${row.topic} (${row.weight >= 1 ? "boost" : "lean"})`);
  const loved = taste.swipes.filter((row) => row.choice === "love");
  const titles = loved
    .map((row) => sessions.find((session) => session.id === row.sessionId)?.title)
    .filter((title): title is string => Boolean(title))
    .slice(0, 4);
  const lines = [
    "confXarm64 taste · KubeCon NA 2026",
    topics.length ? `Topics: ${topics.join(", ")}` : "Topics: none boosted yet",
    `Vibe: ${depthLabel(taste.depth)} · ${expoLabel(taste.expoShare)} · ${packedLabel(taste.packed)}`,
    loved.length ? `Loved ${loved.length} official talk${loved.length === 1 ? "" : "s"}${titles.length ? `: ${titles.join("; ")}` : ""}` : "No loved talks yet",
    "Browser profile only — not a popularity score, not the official schedule filters.",
  ];
  return lines.join("\n");
}

export function vibeQueryExtras(taste: TasteProfile): string[] {
  const extras: string[] = [];
  if (taste.depth >= 0.66) extras.push("advanced");
  if (taste.depth <= 0.34) extras.push("beginner");
  if (taste.expoShare >= 0.6) extras.push("tutorial");
  return extras;
}
