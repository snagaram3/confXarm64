import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { destinationAdvice, isSample255Destination } from "./map-destination.ts";
import { HERO_DESTINATION_ID, HERO_ORIGIN_ID, HERO_SHAFT_ID } from "./south-to-l2.ts";

describe("map destination advice", () => {
  it("marks SAMPLE 255 and the illustrative South→L2 demo as playable, not arbitrary rooms", () => {
    assert.equal(isSample255Destination("255"), true);
    assert.equal(isSample255Destination("ent-west-temple"), true);
    assert.equal(destinationAdvice({ kind: "space", id: "255", label: "255" }).playable, true);
    assert.equal(destinationAdvice({ kind: "room", id: HERO_ORIGIN_ID, label: "200 South" }).playable, true);
    assert.equal(destinationAdvice({ kind: "room", id: HERO_DESTINATION_ID, label: "East Registration" }).playable, true);
    assert.equal(destinationAdvice({ kind: "space", id: HERO_SHAFT_ID, label: "DEMO shaft" }).playable, true);
    assert.match(
      destinationAdvice({ kind: "room", id: HERO_ORIGIN_ID, label: "200 South" }).body,
      /not verified onsite navigation/i,
    );
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
