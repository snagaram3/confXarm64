import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyTaste } from "./taste.ts";
import {
  applySwipe,
  bufferFromPacked,
  cardUncertainty,
  maxSessionsPerDay,
  overlayTasteRank,
  pickNextSwipeCard,
  pickSwipeDeck,
  swipeEligible,
  tasteFromInterests,
  tasteMatchPercent,
  whyTaste,
  withTaste,
} from "./taste.ts";
import type { Ranked, Session } from "./types.ts";

function talk(partial: Partial<Session> & Pick<Session, "id" | "title" | "track">): Session {
  return {
    speaker: "Ada Example",
    company: "CNCF",
    roomId: "251",
    roomLabel: "Salt Palace | Level 2 | 251",
    floor: 2,
    start: "11:05 AM",
    end: "11:40 AM",
    startIso: "2026-11-10T11:05:00-07:00",
    endIso: "2026-11-10T11:40:00-07:00",
    tags: [partial.track],
    abstract: "A published abstract long enough to be a real official talk record for swipe tests.",
    crowdTakes: [],
    audienceLevel: "Advanced",
    dataset: "main",
    ...partial,
  };
}

describe("taste engine", () => {
  it("derives topic weights from existing interests without dropping them", () => {
    const taste = tasteFromInterests(["eBPF", "security"], ["talks"]);
    assert.ok(taste.topicWeights.eBPF >= 1);
    assert.ok(taste.topicWeights.security >= 1);
    assert.ok(taste.topicWeights.Security >= 1);
    const profile = withTaste(
      {
        name: "Jordan",
        role: "Security Engineer",
        interests: ["eBPF", "security"],
        goals: ["talks"],
        attendanceDays: ["2026-11-10"],
        onboarded: true,
        demoPersona: false,
        taste: emptyTaste(),
      },
      taste,
    );
    assert.ok(profile.interests.includes("eBPF"));
    assert.ok(profile.interests.includes("Security") || profile.interests.includes("security"));
  });

  it("love on a Security talk boosts Security and Advanced more than Skip", () => {
    const session = talk({
      id: "sec-1",
      title: "Runtime security with eBPF",
      track: "Security",
      tags: ["Security"],
      audienceLevel: "Advanced",
      abstract: "eBPF runtime security for Kubernetes clusters, published official abstract text.",
    });
    const loved = applySwipe(emptyTaste(), session, "love");
    const skipped = applySwipe(emptyTaste(), session, "skip");
    assert.ok(loved.topicWeights.Security > skipped.topicWeights.Security);
    assert.ok(loved.levelWeights.Advanced > skipped.levelWeights.Advanced);
    assert.equal(loved.swipes[0]?.choice, "love");
  });

  it("next swipe card prefers a track with less evidence", () => {
    const security = talk({ id: "s1", title: "Sec A", track: "Security", audienceLevel: "Advanced" });
    const observability = talk({
      id: "o1",
      title: "OTel B",
      track: "Observability",
      tags: ["Observability"],
      audienceLevel: "Beginner",
    });
    let taste = applySwipe(emptyTaste(), security, "love");
    taste = applySwipe(taste, talk({ id: "s2", title: "Sec C", track: "Security", audienceLevel: "Advanced" }), "love");
    const next = pickNextSwipeCard([security, observability], taste, new Set(["s1", "s2"]));
    assert.equal(next?.id, "o1");
    assert.ok(cardUncertainty(observability, taste) > cardUncertainty(security, taste));
  });

  it("client overlay reorders Elasticsearch hits by taste without inventing sessions", () => {
    const ebpf = talk({
      id: "ebpf",
      title: "eBPF deep dive",
      track: "Security",
      tags: ["Security", "eBPF"],
      abstract: "eBPF and security for Kubernetes, official abstract.",
    });
    const storage = talk({
      id: "store",
      title: "CSI overview",
      track: "Data Processing + Storage",
      tags: ["Data Processing + Storage"],
      audienceLevel: "Beginner",
    });
    const rows: Ranked<Session>[] = [
      {
        item: storage,
        engine: "elasticsearch",
        mode: "hybrid-bm25-knn",
        score: 12,
        rank: "must",
        matchedQueries: [],
        matchedTags: [],
        highlights: [],
        why: "es",
      },
      {
        item: ebpf,
        engine: "elasticsearch",
        mode: "hybrid-bm25-knn",
        score: 8,
        rank: "maybe",
        matchedQueries: [],
        matchedTags: [],
        highlights: [],
        why: "es",
      },
    ];
    const taste = applySwipe(emptyTaste(), ebpf, "love");
    const ordered = overlayTasteRank(rows, taste);
    assert.equal(ordered[0]?.item.id, "ebpf");
    assert.equal(ordered.map((row) => row.item.id).sort().join(), "ebpf,store");
  });

  it("packed dial maps to session cap and planning buffer", () => {
    assert.equal(maxSessionsPerDay(0), 3);
    assert.equal(maxSessionsPerDay(1), 8);
    assert.equal(bufferFromPacked(0), 20);
    assert.equal(bufferFromPacked(1), 5);
  });

  it("taste match percent is zero without weights and cites loved similar talks", () => {
    const a = talk({
      id: "a",
      title: "eBPF one",
      track: "Security",
      tags: ["Security"],
      abstract: "eBPF security talk with a long enough official abstract for tests.",
    });
    const b = talk({
      id: "b",
      title: "eBPF two",
      track: "Security",
      tags: ["Security"],
      abstract: "Another eBPF security talk with a long enough official abstract.",
    });
    assert.equal(tasteMatchPercent(a, emptyTaste(), [a, b]), 0);
    const taste = applySwipe(applySwipe(emptyTaste(), a, "love"), b, "love");
    const percent = tasteMatchPercent(b, taste, [a, b]);
    assert.ok(percent > 0 && percent < 100);
    assert.match(whyTaste(b, taste, [a, b]) ?? "", /loved 1 similar talk/i);
  });

  it("rejects sample and registration records from the swipe deck", () => {
    const sample = talk({ id: "ebpf-obs", title: "sample", track: "Observability", dataset: "sample" });
    const reg = talk({ id: "reg", title: "Badge pickup", track: "Registration", abstract: "x".repeat(50) });
    const real = talk({ id: "real", title: "Real talk", track: "Security" });
    assert.equal(swipeEligible(sample), false);
    assert.equal(swipeEligible(reg), false);
    assert.equal(swipeEligible(real), true);
    assert.equal(pickSwipeDeck([sample, reg, real], emptyTaste(), 8).every((s) => s.id === "real"), true);
  });
});
