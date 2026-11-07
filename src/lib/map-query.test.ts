import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EAST_REGISTRATION_ID,
  SOUTH_ENTRANCE_ID,
  bootstrapMapState,
  initialMapProjection,
  mapSharePath,
  originSheet,
  parseMapQuery,
  resolveMapProjection,
  resolveOriginRoomId,
  serializeMapSearch,
} from "./map-query.ts";

describe("parseMapQuery", () => {
  it("reads the CrowdCompass-style 3D share URL onto Floorwise rooms", () => {
    const q = parseMapQuery("origin=entrance-south&stepFree=true&view=3d", "/map");
    assert.equal(q.projection, "3d");
    assert.equal(q.stepFree, true);
    assert.equal(q.mapPath, true);
    assert.equal(resolveOriginRoomId(q.origin), SOUTH_ENTRANCE_ID);
  });

  it("reads view=2d as an explicit flat preference", () => {
    const q = parseMapQuery("view=2d", "/map");
    assert.equal(q.projection, "flat");
  });

  it("does not treat missing view as 3D and leaves tools paths alone", () => {
    const q = parseMapQuery("", "/tools/dash0");
    assert.equal(q.projection, null);
    assert.equal(q.mapPath, false);
    assert.equal(mapSharePath("/tools/dash0"), null);
  });

  it("maps a destination alias onto a Floorwise room without inventing a route", () => {
    const q = parseMapQuery("origin=entrance-south&destination=room-251-ac&stepFree=true&view=3d", "/map");
    assert.equal(resolveOriginRoomId(q.destination), "87423");
    assert.equal(originSheet(SOUTH_ENTRANCE_ID), "salt-l1");
    assert.equal(originSheet("87423"), "salt-l2");
    assert.equal(resolveOriginRoomId("east-registration"), EAST_REGISTRATION_ID);
    assert.equal(originSheet(EAST_REGISTRATION_ID), "salt-l2");
  });
});

describe("bootstrapMapState", () => {
  it("opens venue 3D on the reference share URL and keeps step-free as a preference", () => {
    const boot = bootstrapMapState("origin=entrance-south&stepFree=true&view=3d", "/map");
    assert.equal(boot.projectionRequested, "3d");
    assert.equal(boot.surface, "venue");
    assert.equal(boot.originId, SOUTH_ENTRANCE_ID);
    assert.equal(boot.focusId, SOUTH_ENTRANCE_ID);
    assert.equal(boot.sheet, "salt-l1");
    assert.equal(boot.stepFree, true);
    assert.equal(boot.openMap, true);
    assert.equal(boot.shareActive, true);
  });

  it("opens venue when the share asks for 3D at /map, and leaves tools alone", () => {
    const boot = bootstrapMapState("view=3d", "/");
    assert.equal(boot.surface, "venue");
    assert.equal(boot.projectionRequested, "3d");
    assert.equal(boot.originId, null);
  });
});

describe("map projection fallback", () => {
  it("defaults to 3D when WebGL is available, and honors flat / reduced-motion / no-WebGL", () => {
    assert.equal(initialMapProjection({ requested: null, reducedMotion: false, webgl: true }).projection, "3d");
    assert.equal(initialMapProjection({ requested: "flat", reducedMotion: false, webgl: true }).projection, "flat");
    assert.equal(initialMapProjection({ requested: null, reducedMotion: false, webgl: true, stored: "flat" }).projection, "flat");
    assert.equal(initialMapProjection({ requested: "3d", reducedMotion: true, webgl: true }).projection, "flat");
    assert.equal(initialMapProjection({ requested: "3d", reducedMotion: false, webgl: false }).projection, "flat");
    assert.equal(initialMapProjection({ requested: "3d", reducedMotion: false, webgl: true }).projection, "3d");
    assert.equal(resolveMapProjection("3d", false).projection, "flat");
    assert.equal(resolveMapProjection("3d", true).projection, "3d");
  });
});

describe("serializeMapSearch", () => {
  it("keeps entrance-south and view=3d in the share query", () => {
    const q = serializeMapSearch({
      projection: "3d",
      surface: "venue",
      originId: SOUTH_ENTRANCE_ID,
      stepFree: true,
    });
    assert.match(q, /view=3d/);
    assert.match(q, /origin=entrance-south/);
    assert.match(q, /stepFree=true/);
    assert.doesNotMatch(q, /surface=/);
  });

  it("keeps destination when it differs from origin", () => {
    const q = serializeMapSearch({
      projection: "3d",
      surface: "venue",
      originId: SOUTH_ENTRANCE_ID,
      destinationId: "87423",
      stepFree: true,
    });
    assert.match(q, /destination=87423/);
    assert.match(q, /origin=entrance-south/);
  });

  it("uses east-registration for the L2 hero destination", () => {
    const q = serializeMapSearch({
      projection: "3d",
      surface: "venue",
      originId: SOUTH_ENTRANCE_ID,
      destinationId: EAST_REGISTRATION_ID,
      stepFree: false,
    });
    assert.match(q, /origin=entrance-south/);
    assert.match(q, /destination=east-registration/);
    assert.match(q, /view=3d/);
  });
});
