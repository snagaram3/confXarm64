import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DRAG_THRESHOLD_PX,
  fitContain,
  focusOn,
  isDrag,
  zoomAtPoint,
} from "./pan-zoom-math.ts";

describe("fitContain", () => {
  it("fits a portrait floorplan into a landscape pane without stretching", () => {
    const cam = fitContain(1000, 600, 1230, 1710, 0);
    assert.ok(Math.abs(cam.scale - 600 / 1710) < 1e-9);
    assert.ok(cam.tx > 0);
    assert.equal(cam.ty, 0);
  });

  it("fits a landscape venue map into a tall pane", () => {
    const cam = fitContain(390, 500, 1531, 1245, 0);
    assert.ok(Math.abs(cam.scale - 390 / 1531) < 1e-9);
    assert.ok(cam.ty > 0);
  });
});

describe("zoomAtPoint", () => {
  it("keeps the cursor world point stationary", () => {
    const cam = { scale: 1, tx: 10, ty: 20 };
    const next = zoomAtPoint(cam, 100, 80, 2);
    const worldX = (100 - cam.tx) / cam.scale;
    const worldY = (80 - cam.ty) / cam.scale;
    assert.equal((100 - next.tx) / next.scale, worldX);
    assert.equal((80 - next.ty) / next.scale, worldY);
  });
});

describe("focusOn", () => {
  it("places a booth at the requested bias", () => {
    const cam = focusOn(0.5, 0.5, 200, 200, 400, 400, 2, 0.5, 0.5);
    assert.equal(cam.tx, 0);
    assert.equal(cam.ty, 0);
  });
});

describe("isDrag", () => {
  it("ignores taps under the threshold and counts pans", () => {
    assert.equal(isDrag(2, 2), false);
    assert.equal(isDrag(DRAG_THRESHOLD_PX, 0), true);
  });
});
