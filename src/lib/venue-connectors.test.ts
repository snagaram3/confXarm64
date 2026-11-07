import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  VENUE_CONNECTORS,
  VENUE_CONNECTOR_SOURCE,
  isWalkableConnector,
  stepFreeMayUse,
} from "./venue-connectors.ts";

describe("official venue connectors", () => {
  it("keeps PDF-text anchors in range and never claims a surveyed or step-free path", () => {
    assert.equal(VENUE_CONNECTOR_SOURCE.file, "official/maps/venue.pdf");
    assert.ok(VENUE_CONNECTORS.length >= 8);
    for (const connector of VENUE_CONNECTORS) {
      assert.ok(connector.nx >= 0 && connector.nx <= 1, connector.id);
      assert.ok(connector.ny >= 0 && connector.ny <= 1, connector.id);
      assert.equal(connector.stepFreeVerified, false);
      assert.equal(isWalkableConnector(connector), false);
      assert.equal(stepFreeMayUse(connector), false);
      assert.ok(connector.note.length > 20);
    }
  });

  it("records the official STAIRS label separately from elevator lobbies", () => {
    const stairs = VENUE_CONNECTORS.find((c) => c.kind === "stairs");
    const hyatt = VENUE_CONNECTORS.filter((c) => c.kind === "elevator-lobby");
    assert.ok(stairs);
    assert.equal(stairs.matchedText, "STAIRS");
    assert.equal(hyatt.length, 4);
    assert.ok(hyatt.every((c) => c.building === "Hyatt Regency"));
  });
});
