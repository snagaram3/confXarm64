import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAsk } from "./ask.ts";

describe("parseAsk", () => {
  it("maps Floorwise origins, not simulated graph ids", () => {
    const hyatt = parseAsk("step-free eBPF near Hyatt on Tuesday");
    assert.equal(hyatt.surface, "venue");
    assert.equal(hyatt.sheet, "hyatt");
    assert.equal(hyatt.stepFree, true);
    assert.equal(hyatt.day, "2026-11-10");
    assert.equal(hyatt.q, "eBPF");
    assert.ok(hyatt.understood.includes("Hyatt schematic"));
    assert.equal(parseAsk("west temple observability booths").surface, "expo");
    assert.equal(parseAsk("walk to 255").surface, "sample");
    assert.equal(parseAsk("keynotes in Hall DE").sheet, "salt-l1");
  });

  it("leaves leftover text as the search query", () => {
    const parsed = parseAsk("platform engineering on Wednesday");
    assert.equal(parsed.day, "2026-11-11");
    assert.equal(parsed.q, "platform engineering");
  });

  it("does not invent occupancy or origin node ids", () => {
    const parsed = parseAsk("full rooms near entrance-south");
    assert.equal(parsed.surface, null);
    assert.match(parsed.q, /full rooms/);
  });
});
