import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterRankedSessions, matchContribution } from "./ranked-filter.ts";
import type { Ranked, Session } from "./types.ts";

function row(id: string, startIso: string, endIso: string): Ranked<Session> {
  return {
    item: {
      id,
      title: id,
      speaker: "A",
      company: "B",
      roomId: "r",
      floor: 1,
      start: "9:00",
      end: "9:30",
      startIso,
      endIso,
      track: "t",
      tags: [],
      abstract: "",
      crowdTakes: [],
    },
    engine: "elasticsearch",
    mode: "hybrid-bm25-knn",
    score: 1,
    rank: "maybe",
    matchedQueries: ["bm25_keyword", "tag:eBPF"],
    matchedTags: ["eBPF"],
    highlights: ["<em>eBPF</em>"],
    why: "x",
  };
}

describe("filterRankedSessions", () => {
  it("filters by conference day and hides ended talks unless asked", () => {
    const tue = row("tue", "2026-11-10T09:00:00-07:00", "2026-11-10T09:30:00-07:00");
    const wed = row("wed", "2026-11-11T09:00:00-07:00", "2026-11-11T09:30:00-07:00");
    const clock = new Date("2026-11-10T11:00:00-07:00");
    const day = filterRankedSessions([tue, wed], { day: "2026-11-10", includeEnded: true, clock });
    assert.deepEqual(day.map((r) => r.item.id), ["tue"]);
    const hidden = filterRankedSessions([tue, wed], { day: "all", includeEnded: false, clock });
    assert.deepEqual(hidden.map((r) => r.item.id), ["wed"]);
    const shown = filterRankedSessions([tue, wed], { day: "all", includeEnded: true, clock });
    assert.equal(shown.length, 2);
  });
});

describe("matchContribution", () => {
  it("labels keyword+tag as hybrid", () => {
    assert.equal(matchContribution(row("a", "2026-11-10T09:00:00-07:00", "2026-11-10T09:30:00-07:00")), "hybrid");
  });
});
