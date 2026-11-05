import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addMinutes, dayKey, formatInZone, parseInstant, timeHm } from "./timezone.ts";
import {
  conflictGroups,
  countdownMs,
  nextSession,
  overlaps,
  planningGapMinutes,
  sessionStatus,
} from "./agenda.ts";

describe("timezone", () => {
  it("keeps source instants and labels Denver vs Chicago", () => {
    const iso = "2026-11-10T09:00:00-07:00";
    assert.equal(parseInstant(iso).toISOString(), "2026-11-10T16:00:00.000Z");
    assert.equal(dayKey(iso, "America/Denver"), "2026-11-10");
    assert.equal(dayKey(iso, "America/Chicago"), "2026-11-10");
    assert.match(formatInZone(iso, "America/Denver"), /9:00/);
    assert.match(timeHm(iso, "America/Chicago"), /10:00/);
    assert.equal(addMinutes(iso, 10), "2026-11-10T16:10:00.000Z");
  });
});

describe("agenda timing", () => {
  const a = {
    id: "a",
    title: "A",
    startIso: "2026-11-10T09:00:00-07:00",
    endIso: "2026-11-10T09:30:00-07:00",
  };
  const b = {
    id: "b",
    title: "B",
    startIso: "2026-11-10T09:15:00-07:00",
    endIso: "2026-11-10T09:45:00-07:00",
  };
  const c = {
    id: "c",
    title: "C",
    startIso: "2026-11-10T10:00:00-07:00",
    endIso: "2026-11-10T10:30:00-07:00",
  };

  it("detects overlap, next talk, buffer gap, and status", () => {
    assert.equal(overlaps(a, b), true);
    assert.equal(overlaps(a, c), false);
    assert.equal(conflictGroups([a, b, c]).length, 1);
    const now = parseInstant("2026-11-10T08:50:00-07:00");
    assert.equal(nextSession([a, c], now)?.id, "a");
    assert.equal(sessionStatus(a, now), "upcoming");
    assert.equal(sessionStatus(a, parseInstant("2026-11-10T09:10:00-07:00")), "ongoing");
    assert.equal(sessionStatus(a, parseInstant("2026-11-10T09:31:00-07:00")), "finished");
    assert.equal(planningGapMinutes(a, c, 10), 20);
    assert.ok(countdownMs(a.startIso, now) > 0);
  });
});
