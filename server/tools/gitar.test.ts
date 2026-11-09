import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gitarStatus } from "./gitar.ts";

describe("gitar adapter", () => {
  it("reports committed review files without inventing PRs or scores", () => {
    const snap = gitarStatus();
    assert.equal(snap.tool, "gitar");
    assert.equal(snap.repo, "snagaram3/confXarm64");
    assert.equal(snap.repoUrl, "https://github.com/snagaram3/confXarm64");
    assert.equal(snap.pullsUrl, "https://github.com/snagaram3/confXarm64/pulls");
    assert.equal(snap.connectUrl, "https://docs.gitar.ai/connecting-code/github");
    assert.equal(snap.missingEnv.length, 0);
    assert.equal(snap.state, "ok");
    assert.equal(snap.configured, true);
    assert.match(snap.source, /does not call a Gitar API/i);
    assert.match(snap.notice, /does not invent review scores/i);
    assert.equal("qualityGate" in snap, false);
    assert.ok(!("pulls" in snap));
    assert.ok(!("score" in snap));
    const review = snap.files.find((f) => f.path === ".gitar/review/README.md");
    const apply = snap.files.find((f) => f.path === ".gitar/config/apply.md");
    assert.equal(review?.present, true);
    assert.equal(apply?.present, true);
    assert.match(snap.ci.jobs, /npm test/);
  });
});
