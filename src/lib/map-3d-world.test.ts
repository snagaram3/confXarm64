import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SCHEMATIC_ROOMS } from "./venue-schematic.ts";
import {
  HYATT_OFFSET_X,
  WORLD_FLOOR_GAP,
  focusWorldBox,
  isometricPose,
  labeledRoomIds,
  relatedSheets,
  roomWorldCenter,
  sheetFloor,
} from "./map-3d-world.ts";

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

describe("3D camera framing", () => {
  it("keeps Hyatt out of a Salt Palace L1 fit so the selected floor is not cropped", () => {
    assert.deepEqual(relatedSheets("salt-l1"), ["salt-l1", "salt-l2"]);
    assert.deepEqual(relatedSheets("hyatt"), ["hyatt"]);
    const sp = focusWorldBox({ focusSheet: "salt-l1", rooms: SCHEMATIC_ROOMS, selectedId: "87690" });
    const hyatt = SCHEMATIC_ROOMS.find((r) => r.roomOrArea === "Regency Ballroom B");
    assert.ok(hyatt);
    const hx = roomWorldCenter(hyatt).x;
    assert.ok(sp.max.x < hx - 8);
    assert.ok(sp.max.x - sp.min.x < 140);
    const pose = isometricPose(sp, 1.6, 46);
    assert.ok(Number.isFinite(pose.position.y) && pose.position.y > pose.target.y);
    const phoneHero = isometricPose(sp, 0.46, 42, "hero", true);
    const desktopHero = isometricPose(sp, 1.6, 42, "hero", false);
    assert.ok(phoneHero.position.y - phoneHero.target.y > desktopHero.position.y - desktopHero.target.y);
  });

  it("frames Hyatt on its own sheet without pulling Salt Palace into the box", () => {
    const hyattBox = focusWorldBox({ focusSheet: "hyatt", rooms: SCHEMATIC_ROOMS });
    const l1 = SCHEMATIC_ROOMS.find((r) => r.roomOrArea === "Hall DE");
    assert.ok(l1);
    assert.ok(hyattBox.min.x > roomWorldCenter(l1).x + 20);
  });

  it("labels 200 South on L1 and a 255 breakout on L2", () => {
    const l1 = labeledRoomIds(SCHEMATIC_ROOMS, "salt-l1", "87690", null);
    const l2 = labeledRoomIds(SCHEMATIC_ROOMS, "salt-l2", null, null);
    assert.equal(l1.has("87690"), true);
    const twoFiftyFive = SCHEMATIC_ROOMS.find((r) => r.roomOrArea === "255 BC");
    assert.ok(twoFiftyFive);
    assert.equal(l2.has(twoFiftyFive.id), true);
    const phone = labeledRoomIds(SCHEMATIC_ROOMS, "salt-l1", "87690", null, true);
    assert.equal(phone.has("87690"), true);
  });
});
