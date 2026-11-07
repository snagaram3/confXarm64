import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_CLOCK,
  FULL_SESSION_THRESHOLD,
  PARTICIPANT_COUNT,
  liveEngagementUnavailable,
  recordsForTest,
  syntheticEngagement,
  syntheticMetricPoints,
} from "./synthetic-engagement.ts";

describe("synthetic engagement scenario", () => {
  it("keeps a fixed participant universe that reconciles", () => {
    const snap = syntheticEngagement();
    assert.equal(snap.mode, "synthetic");
    assert.match(snap.label, /Synthetic demo data/);
    assert.equal(snap.totals.participants, PARTICIPANT_COUNT);
    assert.equal(
      snap.totals.observedFull + snap.totals.observedPartial + snap.totals.unknownPresence,
      snap.totals.participants,
    );
    assert.ok(snap.totals.activeNow <= snap.totals.participants);
    assert.equal(snap.demo.clock, DEMO_CLOCK);
    assert.ok(FULL_SESSION_THRESHOLD === 0.9);
  });

  it("does not treat intentions as presence", () => {
    const { intents, events } = recordsForTest();
    assert.ok(intents.length > 0);
    const intentOnly = intents.filter(
      (i) => !events.some((e) => e.participantId === i.participantId && e.sessionId === i.sessionId),
    );
    assert.ok(intentOnly.length > 0, "some planned sessions have no join evidence");
    const ebfp = syntheticEngagement({ sessionId: "ebpf-obs" }).sessions[0]!;
    assert.equal(ebfp.plannedFull + ebfp.plannedPartial + ebfp.unknown >= 0, true);
    assert.equal(ebfp.observedFull + ebfp.observedPartial + ebfp.unknown, PARTICIPANT_COUNT);
  });

  it("topic filters shrink the same universe without mixing live data", () => {
    const all = syntheticEngagement();
    const filtered = syntheticEngagement({ topic: "eBPF" });
    assert.ok(filtered.totals.participants < all.totals.participants);
    assert.ok(filtered.people.every((p) => p.topics.includes("eBPF")));
    assert.equal(filtered.mode, "synthetic");
  });

  it("keeps live mode empty and unlabeled as healthy", () => {
    const live = liveEngagementUnavailable();
    assert.equal(live.mode, "live");
    assert.equal(live.available, false);
    assert.equal(live.data, null);
    assert.doesNotMatch(JSON.stringify(live), /healthy/i);
  });

  it("never emits participant names as metric attributes", () => {
    const points = syntheticMetricPoints();
    const blob = JSON.stringify(points);
    assert.doesNotMatch(blob, /@example\.test/);
    assert.equal(points.attributes["floorwise.synthetic"], "true");
    for (const g of points.gauges) {
      assert.match(g.name, /^floorwise\.synthetic\./);
    }
  });
});
