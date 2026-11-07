import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { destinationAdvice, isSample255Destination } from "./map-destination.ts";

describe("map destination advice", () => {
  it("only marks the SAMPLE 255 walk as playable", () => {
    assert.equal(isSample255Destination("255"), true);
    assert.equal(isSample255Destination("ent-west-temple"), true);
    assert.equal(destinationAdvice({ kind: "space", id: "255", label: "255" }).playable, true);
  });

  it("does not invent a walk to a booth, official room, or PDF stair label", () => {
    assert.equal(
      destinationAdvice({ kind: "booth", id: "elastic", label: "Elastic" }).playable,
      false,
    );
    assert.equal(
      destinationAdvice({ kind: "room", id: "82953", label: "255 BC" }).playable,
      false,
    );
    assert.equal(
      destinationAdvice({ kind: "connector", id: "sp-stairs-label", label: "STAIRS" }).playable,
      false,
    );
    assert.match(
      destinationAdvice({ kind: "booth", id: "elastic", label: "Elastic" }).body,
      /not a route to this booth/i,
    );
    assert.equal(
      destinationAdvice({ kind: "room", id: "tbd", label: "TBD", placed: false }).playable,
      false,
    );
    assert.match(
      destinationAdvice({ kind: "room", id: "tbd", label: "TBD", placed: false }).title,
      /No map pin/,
    );
  });
});
