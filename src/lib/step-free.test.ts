import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sampleWalkSteps } from "./step-free.ts";

describe("sampleWalkSteps", () => {
  it("keeps the sample polyline and relabels the vertical step", () => {
    const any = sampleWalkSteps(false);
    const free = sampleWalkSteps(true);
    assert.equal(any.length, free.length);
    assert.match(any.find((s) => s.id === "up")!.title, /escalator/i);
    assert.match(free.find((s) => s.id === "up")!.title, /elevator/i);
    assert.match(free.find((s) => s.id === "up")!.detail, /SAMPLE/);
    assert.deepEqual(
      any.map((s) => s.youAreHere),
      free.map((s) => s.youAreHere),
    );
  });
});
