import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickBest, sessionGate } from "./rescue.ts";
import type { Ranked, Session } from "./types.ts";

function session(partial: Partial<Session> & Pick<Session, "id" | "title" | "roomId">): Session {
  return {
    speaker: "A",
    company: "B",
    floor: 2,
    start: "11:05",
    end: "11:40",
    startIso: "2026-11-10T11:05:00-07:00",
    endIso: "2026-11-10T11:40:00-07:00",
    track: "Observability",
    tags: ["eBPF"],
    abstract: "x",
    crowdTakes: [],
    ...partial,
  };
}

function row(item: Session, rank: Ranked<Session>["rank"] = "must"): Ranked<Session> {
  return {
    item,
    engine: "elasticsearch",
    mode: "hybrid-bm25-knn",
    score: 40,
    rank,
    matchedQueries: ["tag:eBPF"],
    matchedTags: ["eBPF"],
    highlights: [],
    why: "fit",
  };
}

const rooms = [
  { id: "r1", placed: true },
  { id: "r2", placed: false },
  { id: "r3", placed: true },
];

describe("sessionGate", () => {
  const clock = new Date("2026-11-10T10:00:00-07:00");

  it("uses official sold-out and unplaced signals, never occupancy", () => {
    const sold = sessionGate(session({ id: "a", title: "A", roomId: "r1", access: { soldOut: true, separateRegistration: false, allAccessColocated: false, notes: [] } }), {
      clock,
      saved: [],
      rooms,
    });
    assert.equal(sold.reason, "sold_out");
    assert.equal(sold.partition, "unavailable");

    const unplaced = sessionGate(session({ id: "b", title: "B", roomId: "r2" }), { clock, saved: [], rooms });
    assert.equal(unplaced.reason, "unplaced_room");
    assert.equal(unplaced.partition, "check");
  });

  it("flags agenda overlap as a rescue reason", () => {
    const gate = sessionGate(session({ id: "b", title: "B", roomId: "r1" }), {
      clock,
      saved: [{ id: "a", title: "Saved", startIso: "2026-11-10T11:00:00-07:00", endIso: "2026-11-10T11:30:00-07:00" }],
      rooms,
    });
    assert.equal(gate.reason, "agenda_conflict");
  });
});

describe("pickBest", () => {
  it("keeps a sticky recommended pick and rescues when it becomes unavailable", () => {
    const open = row(session({ id: "open", title: "Open", roomId: "r1" }));
    const sold = row(
      session({
        id: "sold",
        title: "Sold",
        roomId: "r3",
        access: { soldOut: true, separateRegistration: false, allAccessColocated: false, notes: [] },
      }),
    );
    const ctx = { clock: new Date("2026-11-10T10:00:00-07:00"), saved: [], rooms };
    const sticky = pickBest([sold, open], ctx, "open");
    assert.equal(sticky.pick?.item.id, "open");
    const rescued = pickBest([sold, open], ctx, "sold");
    assert.equal(rescued.pick?.item.id, "open");
    assert.equal(rescued.rescuedFrom?.item.id, "sold");
  });
});
