import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldSkipExistingIndex } from "./seed.ts";

describe("seed skip-if-index-exists", () => {
  it("skips a live index unless force is set", () => {
    assert.equal(shouldSkipExistingIndex(true, false), true);
    assert.equal(shouldSkipExistingIndex(true, true), false);
    assert.equal(shouldSkipExistingIndex(false, false), false);
    assert.equal(shouldSkipExistingIndex(false, true), false);
  });
});
