import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseToolsPath, toolsPath } from "./tools.ts";

describe("tools routes", () => {
  it("parses deep links and defaults to elasticsearch", () => {
    assert.equal(parseToolsPath("/tools"), "elasticsearch");
    assert.equal(parseToolsPath("/tools/elasticsearch"), "elasticsearch");
    assert.equal(parseToolsPath("/tools/sonar"), "sonar");
    assert.equal(parseToolsPath("/tools/gitar"), "gitar");
    assert.equal(parseToolsPath("/tools/dash0/"), "dash0");
    assert.equal(parseToolsPath("/map"), null);
    assert.equal(toolsPath("radar"), "/tools/radar");
    assert.equal(toolsPath("gitar"), "/tools/gitar");
  });
});
