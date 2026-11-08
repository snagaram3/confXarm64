import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalog } from "./catalog.ts";
import { canPinOnExpo, mustGoBooths, pinCoordinateKey, placedExpoPins } from "./expo-pins.ts";

describe("placedExpoPins", () => {
  it("anchors each catalog exhibitor on a distinct official PDF position", () => {
    const pins = placedExpoPins(catalog.booths, { elastic: "must" });
    assert.ok(pins.length >= 8);
    const ids = new Set(pins.map((pin) => pin.id));
    assert.equal(ids.size, pins.length);
    const coords = new Set(pins.map((pin) => pinCoordinateKey(pin.nx, pin.ny)));
    assert.equal(coords.size, pins.length, "two companies must not share one pin");
    const grafana = pins.find((pin) => pin.id === "grafana");
    const hashicorp = pins.find((pin) => pin.id === "hashicorp");
    assert.ok(grafana && hashicorp);
    assert.notEqual(pinCoordinateKey(grafana.nx, grafana.ny), pinCoordinateKey(hashicorp.nx, hashicorp.ny));
    const elastic = pins.find((pin) => pin.id === "elastic");
    assert.equal(elastic?.mustGo, true);
    assert.equal(grafana.mustGo, false);
  });

  it("does not invent a pin for an unplaced booth", () => {
    const fake: (typeof catalog.booths)[number] = {
      ...catalog.booths[0]!,
      id: "ghost-exhibitor",
      pinAvailable: false,
      pinNx: undefined,
      pinNy: undefined,
    };
    const pins = placedExpoPins([...catalog.booths, fake], { "ghost-exhibitor": "must" });
    assert.equal(pins.some((pin) => pin.id === "ghost-exhibitor"), false);
    assert.equal(mustGoBooths([...catalog.booths, fake], { "ghost-exhibitor": "must" })[0]?.id, "ghost-exhibitor");
    assert.equal(canPinOnExpo(fake), false);
    const grafana = catalog.booths.find((booth) => booth.id === "grafana");
    assert.equal(canPinOnExpo(grafana!), true);
  });
});
