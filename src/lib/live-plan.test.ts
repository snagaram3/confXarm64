import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLivePlan } from "./live-plan.ts";
import { applySwipe, emptyTaste } from "./taste.ts";
import type { Booth, Ranked, Session } from "./types.ts";

function talk(id: string, title: string, start: string, end: string, track: string): Session {
  return {
    id,
    title,
    speaker: "Ada Example",
    company: "CNCF",
    roomId: "251",
    roomLabel: "251",
    floor: 2,
    start: "11:00 AM",
    end: "11:35 AM",
    startIso: start,
    endIso: end,
    track,
    tags: [track],
    abstract: "Official published abstract for a KCNA 2026 session used in live-plan tests.",
    crowdTakes: [],
    audienceLevel: "Advanced",
    dataset: "main",
  };
}

function ranked(session: Session, score: number): Ranked<Session> {
  return {
    item: session,
    engine: "elasticsearch",
    mode: "hybrid-bm25-knn",
    score,
    rank: "maybe",
    matchedQueries: ["tag:Security"],
    matchedTags: ["Security"],
    highlights: [],
    why: "es",
  };
}

const booth: Booth = {
  id: "elastic",
  sponsor: "Elastic",
  tagline: "Search",
  floor: 1,
  boothNumber: "A1",
  locationLabel: "Expo",
  pinAvailable: true,
  pinNx: 0.2,
  pinNy: 0.3,
  exhibitorSource: "official",
  logo: null,
  logoSource: null,
  tags: ["observability"],
  pitch: "Search",
  visitors: [],
};

describe("live itinerary preview", () => {
  it("packs official talks, flags overlaps, and lists Must Go booths without inventing slots", () => {
    const a = talk("a", "Talk A", "2026-11-10T11:00:00-07:00", "2026-11-10T11:35:00-07:00", "Security");
    const b = talk("b", "Talk B", "2026-11-10T11:10:00-07:00", "2026-11-10T11:45:00-07:00", "Security");
    const c = talk("c", "Talk C", "2026-11-10T14:00:00-07:00", "2026-11-10T14:35:00-07:00", "Observability");
    const taste = applySwipe(emptyTaste(), a, "love");
    const items = buildLivePlan({
      ranked: [ranked(a, 9), ranked(b, 8), ranked(c, 7)],
      taste,
      profile: {
        name: "",
        role: "",
        interests: ["Security"],
        goals: ["talks", "exhibitors"],
        attendanceDays: ["2026-11-10"],
        onboarded: true,
        demoPersona: false,
        taste,
      },
      sessions: [a, b, c],
      booths: [booth],
      sponsorPrefs: { elastic: "must" },
      savedIds: ["a"],
    });
    const sessions = items.filter((item) => item.kind === "session");
    assert.ok(sessions.length >= 2);
    assert.ok(sessions.some((item) => item.conflict));
    assert.ok(sessions.some((item) => item.alreadySaved));
    assert.ok(sessions.every((item) => /Matches:|Ranked from your taste/.test(item.why)));
    const expo = items.find((item) => item.kind === "booth");
    assert.ok(expo);
    assert.match(expo!.why, /not a scheduled slot/i);
    assert.equal(items.some((item) => item.title.includes("invent")), false);
  });
});
