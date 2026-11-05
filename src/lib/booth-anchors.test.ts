import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("booth anchors", () => {
  it("places every catalog exhibitor on a PDF text position", () => {
    const anchors = JSON.parse(readFileSync("src/data/booth-anchors.json", "utf8")) as {
      booths: Array<{ id: string; placed: boolean; nx?: number; ny?: number }>;
    };
    assert.equal(anchors.booths.length, 10);
    for (const b of anchors.booths) {
      assert.equal(b.placed, true, b.id);
      assert.ok((b.nx ?? -1) >= 0 && (b.nx ?? 2) <= 1);
      assert.ok((b.ny ?? -1) >= 0 && (b.ny ?? 2) <= 1);
    }
  });
});
