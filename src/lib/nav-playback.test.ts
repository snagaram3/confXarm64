import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { interpolateNav, navProgressForStep, sample255Keyframes, sampleNavDisclaimer } from "./nav-playback.ts";
import { sampleWalkSteps } from "./step-free.ts";

describe("SAMPLE 255 nav playback", () => {
  it("keeps the same polyline when step-free copy is on, and never claims a verified path", () => {
    const a = sample255Keyframes();
    const b = sample255Keyframes();
    assert.ok(a.length > 6);
    assert.equal(a.length, b.length);
    assert.ok(a.some((f) => f.floor === 1) && a.some((f) => f.floor === 2));
    assert.ok(a.some((f) => f.kind === "vertical"));
    assert.match(sampleNavDisclaimer(true), /not a verified accessible route/);
    assert.match(sampleNavDisclaimer(false), /SAMPLE/);
    const free = sampleWalkSteps(true).find((s) => s.id === "up");
    const any = sampleWalkSteps(false).find((s) => s.id === "up");
    assert.ok(free && any);
    assert.notEqual(free.title, any.title);
  });

  it("interpolates along the path, stays at the end, and does not loop", () => {
    const frames = sample255Keyframes();
    const start = interpolateNav(frames, 0);
    const end = interpolateNav(frames, 1);
    const past = interpolateNav(frames, 2);
    assert.ok(start && end && past);
    assert.equal(start.floor, 1);
    assert.equal(end.floor, 2);
    assert.equal(past.position.x, end.position.x);
    assert.equal(navProgressForStep(0, false), 0);
    assert.equal(navProgressForStep(sampleWalkSteps(false).length - 1, false), 1);
  });
});
