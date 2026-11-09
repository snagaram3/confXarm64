import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPairSide,
  formatModePill,
  inferQueryMode,
  matchPercentFor,
  mixGuidePicks,
  pairPrimaryLabel,
  TASTE_PAIRS,
} from "./field-guide.ts";
import { emptyTaste } from "./taste.ts";
import type { Booth, Ranked, Session } from "./types.ts";

describe("field-guide ranking chrome", () => {
  it("infers only Elasticsearch modes the API can run", () => {
    assert.equal(inferQueryMode(""), "semantic");
    assert.equal(inferQueryMode("   "), "semantic");
    assert.equal(inferQueryMode("eBPF"), "keyword");
    assert.equal(inferQueryMode('"golden path"'), "keyword");
    assert.equal(inferQueryMode("talks that make on-call less painful"), "hybrid");
  });

  it("formats the mode pill from requested or returned engine modes", () => {
    assert.equal(formatModePill("hybrid"), "HYBRID · BM25 + kNN");
    assert.equal(formatModePill("hybrid-bm25-knn"), "HYBRID · BM25 + kNN");
    assert.equal(formatModePill("keyword"), "KEYWORD · BM25");
    assert.equal(formatModePill("keyword-bm25"), "KEYWORD · BM25");
    assert.equal(formatModePill("semantic"), "SEMANTIC · kNN");
    assert.equal(formatModePill("semantic-knn"), "SEMANTIC · kNN");
  });

  it("this-or-that left/right writes reversible taste weights", () => {
    const [left, right] = TASTE_PAIRS[0]!;
    const afterLeft = applyPairSide(emptyTaste(), left, 1);
    assert.ok((afterLeft.topicWeights.observability ?? 0) > 0);
    const undone = applyPairSide(afterLeft, left, -1);
    assert.equal(undone.topicWeights.observability, emptyTaste().topicWeights.observability ?? 0);
    const expo = applyPairSide(emptyTaste(), TASTE_PAIRS[8]![0], 1);
    assert.ok(expo.expoShare > emptyTaste().expoShare);
    assert.equal(pairPrimaryLabel(right), "platform eng");
  });

  it("mixes two Elasticsearch sessions with one booth and does not invent ids", () => {
    const session = (id: string, title: string, score: number): Ranked<Session> => ({
      engine: "elasticsearch",
      mode: "hybrid-bm25-knn",
      score,
      rank: score > 12 ? "must" : "maybe",
      matchedQueries: ["bm25_keyword"],
      matchedTags: ["eBPF"],
      highlights: [],
      why: "ES hybrid",
      item: {
        id,
        title,
        speaker: "Ada",
        company: "CNCF",
        roomId: "251",
        floor: 2,
        start: "11:05",
        end: "11:40",
        startIso: "2026-11-10T11:05:00-07:00",
        endIso: "2026-11-10T11:40:00-07:00",
        track: "Observability",
        tags: ["eBPF", "observability"],
        abstract: "eBPF tracing without sidecars on the official schedule.",
        crowdTakes: [],
        dataset: "main",
      },
    });
    const booth = (id: string, sponsor: string): Ranked<Booth> => ({
      engine: "elasticsearch",
      mode: "hybrid-bm25-knn",
      score: 9,
      rank: "maybe",
      matchedQueries: [],
      matchedTags: ["observability"],
      highlights: [],
      why: "ES hybrid",
      item: {
        id,
        sponsor,
        tagline: "Observability vendor",
        floor: 1,
        boothNumber: "S2",
        locationLabel: "Expo",
        pinAvailable: false,
        exhibitorSource: "KCNA26 Expo Hall Map PDF",
        logo: null,
        logoSource: null,
        tags: ["observability"],
        pitch: "Tracing",
        visitors: [],
      },
    });
    const picks = mixGuidePicks({
      sessions: [session("a", "eBPF tracing without code changes", 18), session("b", "SLOs your pager respects", 14), session("c", "Wasm on the edge", 4)],
      booths: [booth("elastic", "Elastic"), booth("grafana", "Grafana Labs")],
      taste: emptyTaste(),
      officialSessions: [],
      query: "on-call",
      searching: true,
    });
    assert.equal(picks.length, 3);
    assert.equal(picks.filter((p) => p.kind === "session").length, 2);
    assert.equal(picks.filter((p) => p.kind === "booth").length, 1);
    assert.ok(picks.every((p) => p.id === "a" || p.id === "b" || p.id === "elastic"));
    assert.ok(picks.every((p) => p.match >= 1 && p.match <= 99));
  });

  it("keeps match percents in 1–99 from real ES ranks", () => {
    assert.ok(matchPercentFor("must", 20, 0) >= 80);
    assert.ok(matchPercentFor("meh", 1, 0) < 70);
    assert.equal(matchPercentFor("must", 16, 90) <= 99, true);
  });
});
