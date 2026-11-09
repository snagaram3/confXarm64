import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { askScheduleStatus, livenessBody, readinessOk, readinessStatusCode } from "./health.ts";

describe("liveness vs readiness", () => {
  it("liveness stays ok when search is down", () => {
    assert.deepEqual(livenessBody(), { ok: true, live: true });
    assert.equal(readinessOk(false, false, false), false);
    assert.equal(readinessStatusCode(false), 503);
  });

  it("readiness is 200 only when Elasticsearch is healthy and the index is ready", () => {
    assert.equal(readinessOk(true, true, true), true);
    assert.equal(readinessStatusCode(true), 200);
    assert.equal(readinessOk(true, true, false), false);
    assert.equal(readinessOk(true, false, true), false);
  });

  it("ask-the-schedule copy follows the real env instead of a hardcoded missing-key line", () => {
    const missing = askScheduleStatus({ OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "" });
    assert.equal(missing.available, false);
    assert.doesNotMatch(missing.reason, /No OPENAI_API_KEY or ANTHROPIC_API_KEY in this environment/);
    const present = askScheduleStatus({ OPENAI_API_KEY: "sk-test" });
    assert.equal(present.available, true);
    assert.match(present.reason, /LLM key is present/);
  });
});
