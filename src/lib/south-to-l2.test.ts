import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { interpolateNav } from "./nav-playback.ts";
import { WORLD_FLOOR_GAP } from "./map-3d-world.ts";
import { SOUTH_ENTRANCE_ID } from "./map-query.ts";
import { VENUE_CONNECTORS } from "./venue-connectors.ts";
import { SCHEMATIC_ROOMS, rectCenter } from "./venue-schematic.ts";
import {
  HERO_DESTINATION_ID,
  HERO_JOURNEY_DISCLAIMER,
  HERO_ORIGIN_ID,
  HERO_SHAFT_ID,
  HERO_SHAFT_LABEL,
  HERO_SHAFT_SCHEMATIC,
  heroHighlightId,
  heroStepAt,
  isHeroDemoId,
  shouldAutoplayHero,
  heroJourneyBox,
  southToL2Keyframes,
} from "./south-to-l2.ts";

describe("South Entrance → L2 illustrative journey", () => {
  it("starts at official 200 South and ends on named Salt Palace L2", () => {
    const frames = southToL2Keyframes();
    const start = SCHEMATIC_ROOMS.find((r) => r.id === SOUTH_ENTRANCE_ID);
    const end = SCHEMATIC_ROOMS.find((r) => r.id === HERO_DESTINATION_ID);
    assert.ok(start && end);
    assert.equal(start.sheet, "salt-l1");
    assert.equal(end.sheet, "salt-l2");
    assert.equal(end.roomOrArea, "East Registration");
    assert.ok(frames.length >= 8);
    assert.equal(frames[0]?.floor, 1);
    assert.equal(frames[frames.length - 1]?.floor, 2);
    for (const frame of frames.filter((item) => item.kind === "walk")) {
      const floorBase = (frame.floor - 1) * WORLD_FLOOR_GAP;
      assert.ok(frame.y - floorBase >= 3, `walk ribbon y=${frame.y} must sit above schematic room masses`);
    }
    assert.ok(frames.some((f) => f.kind === "vertical"));
    assert.match(frames.find((f) => f.kind === "vertical")!.label, /DEMO floor change/i);
    assert.match(HERO_JOURNEY_DISCLAIMER, /not verified onsite navigation/i);
    assert.match(HERO_SHAFT_LABEL, /not a surveyed elevator/i);
    assert.equal(isHeroDemoId(HERO_ORIGIN_ID), true);
    assert.equal(isHeroDemoId("255"), false);
  });

  it("does not use venue.pdf STAIRS/ELEVATOR label coordinates as the DEMO shaft", () => {
    for (const connector of VENUE_CONNECTORS) {
      const nx = HERO_SHAFT_SCHEMATIC.x / 1180;
      const ny = HERO_SHAFT_SCHEMATIC.y / 640;
      assert.ok(Math.hypot(connector.nx - nx, connector.ny - ny) > 0.08);
    }
    const start = SCHEMATIC_ROOMS.find((r) => r.id === SOUTH_ENTRANCE_ID)!;
    assert.notEqual(rectCenter(start.rect).x, HERO_SHAFT_SCHEMATIC.x);
  });

  it("interpolates L1 → vertical → L2 without looping, and never claims GPS", () => {
    const frames = southToL2Keyframes();
    const a = interpolateNav(frames, 0);
    const samples = [0.35, 0.45, 0.55, 0.65].map((t) => interpolateNav(frames, t));
    const mid = samples.find((pose) => pose?.kind === "vertical") ?? samples[1];
    const b = interpolateNav(frames, 1);
    const past = interpolateNav(frames, 2);
    assert.ok(a && mid && b && past);
    assert.equal(a.floor, 1);
    assert.equal(b.floor, 2);
    assert.ok(samples.some((pose) => pose?.kind === "vertical"));
    assert.equal(past.position.y, b.position.y);
    assert.ok(b.position.y > a.position.y);
    assert.match(mid.label, /DEMO/);
    assert.doesNotMatch(HERO_JOURNEY_DISCLAIMER, /step-free success|indoor GPS|walking time/i);
    assert.equal(heroHighlightId(0.2), HERO_ORIGIN_ID);
    assert.equal(heroHighlightId(0.8), HERO_DESTINATION_ID);
    assert.equal(heroStepAt(0.5).highlightId, HERO_SHAFT_ID);
    const phoneBox = heroJourneyBox(SCHEMATIC_ROOMS, true);
    const wideBox = heroJourneyBox(SCHEMATIC_ROOMS, false);
    assert.ok(phoneBox.max.x - phoneBox.min.x < 40);
    assert.ok(phoneBox.max.y - phoneBox.min.y > WORLD_FLOOR_GAP);
    assert.ok(wideBox.max.x - wideBox.min.x >= phoneBox.max.x - phoneBox.min.x);
  });

  it("autoplays only on a fresh normal-motion 3D venue visit", () => {
    const base = {
      reducedMotion: false,
      webgl: true,
      storedProjection: null,
      requestedProjection: null,
      surface: null,
      originId: null,
      destinationId: null,
      alreadyPlayed: false,
    } as const;
    assert.equal(shouldAutoplayHero(base), true);
    assert.equal(shouldAutoplayHero({ ...base, originId: SOUTH_ENTRANCE_ID, destinationId: HERO_DESTINATION_ID }), true);
    assert.equal(shouldAutoplayHero({ ...base, reducedMotion: true }), false);
    assert.equal(shouldAutoplayHero({ ...base, webgl: false }), false);
    assert.equal(shouldAutoplayHero({ ...base, storedProjection: "flat" }), false);
    assert.equal(shouldAutoplayHero({ ...base, requestedProjection: "flat" }), false);
    assert.equal(shouldAutoplayHero({ ...base, surface: "sample" }), false);
    assert.equal(shouldAutoplayHero({ ...base, destinationId: "87423" }), false);
    assert.equal(shouldAutoplayHero({ ...base, alreadyPlayed: true }), false);
  });
});
