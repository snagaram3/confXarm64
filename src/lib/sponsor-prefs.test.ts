import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cycleSponsorPref,
  parseSponsorPrefs,
  prefLabel,
} from "./sponsor-prefs.ts";

describe("sponsor prefs", () => {
  it("treats missing keys as unrated, not Meh", () => {
    const prefs = parseSponsorPrefs(JSON.stringify({ elastic: "must" }));
    assert.equal(prefs.elastic, "must");
    assert.equal(prefs.grafana, undefined);
    assert.equal(prefLabel(prefs.grafana), "Unrated");
    assert.notEqual(prefLabel(undefined), "Meh");
  });

  it("ignores invalid stored values", () => {
    const prefs = parseSponsorPrefs(JSON.stringify({ elastic: "MUST", dash0: 1, radar: "meh" }));
    assert.deepEqual(prefs, { radar: "meh" });
  });

  it("clears a rank when the same option is chosen again", () => {
    assert.equal(cycleSponsorPref("maybe", "maybe"), undefined);
    assert.equal(cycleSponsorPref(undefined, "must"), "must");
    assert.equal(cycleSponsorPref("must", "meh"), "meh");
  });
});
