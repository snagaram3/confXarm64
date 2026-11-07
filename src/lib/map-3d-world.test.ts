import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SCHEMATIC_ROOMS } from "./venue-schematic.ts";
import { HYATT_OFFSET_X, WORLD_FLOOR_GAP, roomWorldCenter, sheetFloor } from "./map-3d-world.ts";

describe("3D world from Floorwise schematic", () => {
  it("stacks Salt Palace L2 above L1 and offsets Hyatt, without occupancy or meters", () => {
    const l1 = SCHEMATIC_ROOMS.find((r) => r.roomOrArea === "Hall DE");
    const l2 = SCHEMATIC_ROOMS.find((r) => r.roomOrArea === "255 BC");
    const hyatt = SCHEMATIC_ROOMS.find((r) => r.roomOrArea === "Regency Ballroom B");
    assert.ok(l1 && l2 && hyatt);
    const a = roomWorldCenter(l1);
    const b = roomWorldCenter(l2);
    const h = roomWorldCenter(hyatt);
    assert.equal(sheetFloor("salt-l1"), 1);
    assert.equal(sheetFloor("salt-l2"), 2);
    assert.equal(b.y - a.y, WORLD_FLOOR_GAP);
    assert.ok(h.x - a.x > HYATT_OFFSET_X * 0.05);
    assert.equal(typeof a.x, "number");
  });

  it("places the official 200 South entrance on Salt Palace L1", () => {
    const south = SCHEMATIC_ROOMS.find((r) => r.id === "87690");
    assert.ok(south);
    assert.equal(south.sheet, "salt-l1");
    assert.equal(south.kind, "entrance");
    assert.equal(sheetFloor(south.sheet), 1);
  });
});
