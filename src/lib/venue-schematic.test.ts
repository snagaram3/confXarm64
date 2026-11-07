import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SCHEMATIC_DISCLAIMER,
  SCHEMATIC_ROOMS,
  SCHEMATIC_UNMAPPED,
  buildSchematic,
  sheetForFocus,
  sheetForRoom,
} from "./venue-schematic.ts";
import roomAnchorsJson from "../data/room-anchors.json" with { type: "json" };

const rooms = (roomAnchorsJson as { rooms: Array<{ id: string; roomOrArea?: string; placed: boolean }> }).rooms;

describe("venue schematic", () => {
  it("places official schedule rooms on illustrative sheets without dropping unplaced labels", () => {
    const hallDe = SCHEMATIC_ROOMS.find((r) => r.roomOrArea === "Hall DE");
    const bc = SCHEMATIC_ROOMS.find((r) => r.roomOrArea === "255 BC");
    const hyatt = SCHEMATIC_ROOMS.find((r) => r.roomOrArea === "Regency Ballroom B");
    const ballH = SCHEMATIC_ROOMS.find((r) => r.roomOrArea === "Grand Ballroom H");
    assert.equal(hallDe?.sheet, "salt-l1");
    assert.equal(bc?.sheet, "salt-l2");
    assert.equal(hyatt?.sheet, "hyatt");
    assert.equal(ballH?.placedOnOfficial, false);
    assert.ok(ballH, "unplaced-on-PDF rooms still appear when building/level are known");
    assert.ok(SCHEMATIC_UNMAPPED.some((r) => /tbd/i.test(r.roomOrArea ?? r.label)));
    assert.ok(SCHEMATIC_UNMAPPED.some((r) => /off-site/i.test(r.roomOrArea ?? r.label)));
    assert.equal(SCHEMATIC_ROOMS.length + SCHEMATIC_UNMAPPED.length, rooms.length);
    assert.match(SCHEMATIC_DISCLAIMER, /not to scale/);
  });

  it("does not treat schematic positions as official pins", () => {
    const built = buildSchematic();
    for (const room of built.rooms) {
      assert.ok(room.rect.w > 0 && room.rect.h > 0);
      if (!room.placedOnOfficial) assert.ok(room.unplacedReason);
    }
    assert.equal(sheetForFocus("82953"), "salt-l2");
    assert.equal(sheetForRoom({ id: "x", label: "Room TBD", building: null, level: null, placed: false, isTbd: true }), "unmapped");
  });
});
