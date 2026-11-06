import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { motionEnabled } from "./motion.ts";

describe("motionEnabled", () => {
  it("disables when the OS asks for reduced motion", () => {
    assert.equal(motionEnabled("full", true), false);
    assert.equal(motionEnabled("reduced", true), false);
  });

  it("honors the in-app toggle when the OS allows motion", () => {
    assert.equal(motionEnabled("full", false), true);
    assert.equal(motionEnabled("reduced", false), false);
  });
});
