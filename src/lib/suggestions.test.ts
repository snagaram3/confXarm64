import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSuggestions } from "./suggestions.ts";
import type { Booth, Ranked, Session } from "./types.ts";

function session(partial: Partial<Session> & Pick<Session, "id" | "title" | "roomId">): Ranked<Session> {
  return {
    item: {
      speaker: "A",
      company: "B",
      floor: 2,
      start: "11:05",
      end: "11:40",
      track: "Observability",
      tags: ["eBPF"],
      abstract: "x",
      crowdTakes: [],
      ...partial,
    },
    engine: "elasticsearch",
    mode: "hybrid-bm25-knn",
    score: 40,
    rank: "must",
    matchedQueries: ["tag:eBPF"],
    matchedTags: ["eBPF"],
    highlights: [],
    why: "ES hybrid 40 · tag overlap eBPF",
  };
}

function booth(partial: Partial<Booth> & Pick<Booth, "id" | "sponsor">): Ranked<Booth> {
  return {
    item: {
      tagline: "Search",
      floor: 1,
      boothNumber: "196",
      locationLabel: "Booth",
      pinAvailable: true,
      exhibitorSource: "expo.pdf",
      logo: null,
      logoSource: null,
      tags: ["observability"],
      pitch: "x",
      visitors: [],
      ...partial,
    },
    engine: "elasticsearch",
    mode: "hybrid-bm25-knn",
    score: 12,
    rank: "maybe",
    matchedQueries: [],
    matchedTags: ["observability"],
    highlights: [],
    why: "tag overlap observability",
  };
}

describe("buildSuggestions", () => {
  it("returns a retry status when search is down", () => {
    const tips = buildSuggestions({
      rankStatus: "error",
      navigating: false,
      mustSessions: [],
      lateSession: undefined,
      remainingSec: 200,
    });
    assert.equal(tips.length, 1);
    assert.equal(tips[0].kind, "status");
    assert.deepEqual(tips[0].actions, ["retry"]);
    assert.match(tips[0].body, /expo map stays available/i);
  });

  it("recommends the top Must talk with navigate only for SAMPLE 255", () => {
    const late = session({ id: "ebpf-obs", title: "eBPF Observability", roomId: "255" });
    const tips = buildSuggestions({
      rankStatus: "ready",
      navigating: false,
      mustSessions: [late],
      lateSession: late,
      remainingSec: 180,
    });
    const rec = tips.find((t) => t.kind === "recommendation" && t.sessionId);
    assert.ok(rec?.actions.includes("navigate"));
    assert.match(rec?.why ?? "", /Matches your interests/);
    assert.equal(tips.filter((t) => t.kind === "route").length, 0);
  });

  it("does not attach SAMPLE navigation to a different official talk, and can add a topical exhibitor", () => {
    const talk = session({ id: "otel-prod", title: "OpenTelemetry", roomId: "251", roomLabel: "251" });
    const elastic = booth({ id: "elastic", sponsor: "Elastic" });
    const tips = buildSuggestions({
      rankStatus: "ready",
      navigating: false,
      mustSessions: [talk],
      lateSession: session({ id: "ebpf-obs", title: "eBPF Observability", roomId: "255" }),
      remainingSec: 180,
      rankedBooths: [elastic],
    });
    const rec = tips.find((t) => t.sessionId === "otel-prod");
    assert.ok(rec);
    assert.ok(rec.actions.includes("view"));
    assert.ok(rec.actions.includes("save"));
    assert.ok(!rec.actions.includes("navigate"));
    const sponsor = tips.find((t) => t.boothId === "elastic");
    assert.ok(sponsor);
    assert.match(sponsor.why, /observability/);
    assert.doesNotMatch(sponsor.why, /\bmeters\b|GPS|nearby booth/i);
    assert.match(sponsor.why, /not walking distance/);
    assert.deepEqual(sponsor.actions, ["view"]);
  });

  it("does not claim an AI engine in copy", () => {
    const talk = session({ id: "otel-prod", title: "OpenTelemetry", roomId: "251" });
    const tips = buildSuggestions({
      rankStatus: "ready",
      navigating: true,
      mustSessions: [talk],
      lateSession: talk,
      remainingSec: 0,
    });
    const blob = tips.map((t) => `${t.title} ${t.body} ${t.why}`).join(" ");
    assert.doesNotMatch(blob, /AI engine|powered by AI|language model/i);
    assert.ok(tips[0].actions.includes("view"));
    assert.ok(tips[0].actions.includes("save"));
  });

  it("says when a Must-go booth is unplaced instead of inventing a pin", () => {
    const tips = buildSuggestions({
      rankStatus: "ready",
      navigating: false,
      mustSessions: [],
      lateSession: undefined,
      remainingSec: 0,
      mustBooth: { id: "radar", sponsor: "Radar", boothNumber: "365", pinAvailable: false },
      mustBoothFromPref: true,
      rankedBooths: [booth({ id: "radar", sponsor: "Radar", boothNumber: "365", pinAvailable: false })],
    });
    assert.match(tips[0].body, /not a verified pin/);
    assert.deepEqual(tips[0].actions, ["view"]);
    assert.equal(tips[0].boothId, "radar");
  });
});
