import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { officialSessions, scheduleMeta, sessionById } from "./schedule.ts";
import { ReminderStore } from "./reminders-store.ts";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

describe("official schedule", () => {
  it("loads 601 main records without merging related feeds", () => {
    assert.equal(officialSessions.length, 601);
    assert.equal(scheduleMeta.sessionCount, 601);
    assert.match(scheduleMeta.note, /not 601 technical talks/i);
    assert.ok(sessionById.get("1302801")?.title.includes("Welcome"));
    assert.equal(
      officialSessions.filter((s) => s.dataset !== "main").length,
      0,
    );
    assert.equal(
      officialSessions.some((s) => s.crowdTakes.length > 0),
      false,
    );
  });

  it("maps official Audience Level onto sessions when Sessionize published it", () => {
    const mentoring = sessionById.get("1345969");
    assert.equal(mentoring?.audienceLevel, "Beginner");
    assert.ok(officialSessions.some((session) => session.audienceLevel === "Advanced"));
  });

  it("keeps Hyatt rooms off the sample 255 id", () => {
    const hyatt = officialSessions.filter((s) => s.building === "Hyatt Regency");
    assert.ok(hyatt.length > 0);
    assert.equal(hyatt.some((s) => s.roomId === "255"), false);
  });
});

describe("reminder store", () => {
  it("dedupes session jobs per attendee", () => {
    const store = new ReminderStore(join(mkdtempSync(join(tmpdir(), "fw-rem-")), "r.sqlite"));
    store.schedule({
      attendeeId: "a",
      sessionId: "1",
      title: "Talk",
      fireAt: Date.now() + 10_000,
      minutesBefore: 10,
    });
    store.schedule({
      attendeeId: "a",
      sessionId: "1",
      title: "Talk",
      fireAt: Date.now() + 20_000,
      minutesBefore: 5,
    });
    const jobs = store.listJobs("a");
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].minutesBefore, 5);
    assert.equal(store.cancel("a", "1"), true);
    assert.equal(store.listJobs("b").length, 0);
    store.close();
  });
});
