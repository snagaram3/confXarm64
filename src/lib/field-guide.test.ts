import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPairSide,
  formatModePill,
  inferQueryMode,
  matchPercentFor,
  mixGuidePicks,
  nextModePillView,
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
    assert.ok(picks.every((p) => !/^Because you like/.test(p.why)));
  });

  it("does not leave the mode pill stuck hidden after a HYBRID settle", () => {
    const mid = nextModePillView(
      { display: "KEYWORD · BM25", outgoing: null, incoming: false },
      "HYBRID · BM25 + kNN",
    );
    assert.equal(mid.display, "HYBRID · BM25 + kNN");
    assert.equal(mid.outgoing, "KEYWORD · BM25");
    assert.equal(mid.incoming, true);
    const settled = nextModePillView(mid, "HYBRID · BM25 + kNN");
    assert.equal(settled.display, "HYBRID · BM25 + kNN");
    assert.equal(settled.incoming, false);
    assert.ok(settled.display.length > 0);
  });

  it("falls back to Elasticsearch ranks when taste is empty and the query is cleared", () => {
    const knn = (id: string, title: string, score: number): Ranked<Session> => ({
      engine: "elasticsearch",
      mode: "semantic-knn",
      score,
      rank: "maybe",
      matchedQueries: ["semantic_knn"],
      matchedTags: [],
      highlights: [],
      why: "ES semantic",
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
        tags: ["observability"],
        abstract: "Official schedule talk.",
        crowdTakes: [],
        dataset: "main",
      },
    });
    const sample: Ranked<Session> = {
      ...knn("sample-255", "Sample: late for 255", 99),
      item: { ...knn("sample-255", "Sample: late for 255", 99).item, dataset: "sample", roomId: "255" },
    };
    const booth: Ranked<Booth> = {
      engine: "elasticsearch",
      mode: "semantic-knn",
      score: 8,
      rank: "maybe",
      matchedQueries: ["semantic_knn"],
      matchedTags: [],
      highlights: [],
      why: "ES semantic",
      item: {
        id: "elastic",
        sponsor: "Elastic",
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
    };
    const picks = mixGuidePicks({
      sessions: [sample, knn("a", "eBPF tracing without code changes", 18), knn("b", "SLOs your pager respects", 14)],
      booths: [booth],
      taste: emptyTaste(),
      officialSessions: [],
      query: "",
      searching: false,
    });
    assert.ok(picks.length >= 2);
    assert.equal(picks.some((p) => p.id === "sample-255"), false);
    assert.ok(picks.some((p) => p.id === "a"));
    assert.ok(picks.every((p) => /Elasticsearch ranked it before you locked taste/.test(p.why)));
  });

  it("still requires a topic match when taste is locked and you are not searching", () => {
    const taste = applyPairSide(emptyTaste(), TASTE_PAIRS[1]![0], 1);
    const knnOnly: Ranked<Session> = {
      engine: "elasticsearch",
      mode: "semantic-knn",
      score: 20,
      rank: "must",
      matchedQueries: ["semantic_knn"],
      matchedTags: [],
      highlights: [],
      why: "ES semantic",
      item: {
        id: "knn-only",
        title: "Neighbor talk with no tag hit",
        speaker: "Ada",
        company: "CNCF",
        roomId: "251",
        floor: 2,
        start: "11:05",
        end: "11:40",
        startIso: "2026-11-10T11:05:00-07:00",
        endIso: "2026-11-10T11:40:00-07:00",
        track: "Observability",
        tags: ["observability"],
        abstract: "Official schedule talk.",
        crowdTakes: [],
        dataset: "main",
      },
    };
    const tagged: Ranked<Session> = {
      ...knnOnly,
      matchedTags: ["eBPF"],
      matchedQueries: ["tag:eBPF"],
      item: { ...knnOnly.item, id: "tagged", title: "eBPF tracing without code changes", tags: ["eBPF"] },
    };
    const picks = mixGuidePicks({
      sessions: [knnOnly, tagged],
      booths: [],
      taste,
      officialSessions: [],
      query: "",
      searching: false,
    });
    assert.equal(picks.some((p) => p.id === "knn-only"), false);
    assert.equal(picks.some((p) => p.id === "tagged"), true);
  });

  it("keeps match percents in 1–99 from real ES ranks", () => {
    assert.ok(matchPercentFor("must", 20, 0) >= 80);
    assert.ok(matchPercentFor("meh", 1, 0) < 70);
    assert.equal(matchPercentFor("must", 16, 90) <= 99, true);
  });
});
