import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastRatio } from "../theme/contrast.ts";
import { applyA11yPrefs, HIGH_CONTRAST } from "./a11y-prefs.ts";
import { amenityLabel, inclusionAmenities } from "./amenities.ts";
import { OFFICIAL_AMENITIES } from "./amenities-data.ts";

describe("applyA11yPrefs", () => {
  it("writes contrast and text size onto the root dataset", () => {
    const root = { dataset: {} as Record<string, string> };
    applyA11yPrefs(root as unknown as HTMLElement, { contrast: "high", textSize: "large" });
    assert.equal(root.dataset.contrast, "high");
    assert.equal(root.dataset.textSize, "large");
  });
});

describe("high-contrast WCAG AA", () => {
  it("keeps body, primary, CTA, and rank fills readable on black", () => {
    const { background, foreground, mutedForeground, primary, primaryForeground, cta, ctaForeground, must, mustForeground, maybe, maybeForeground, destructive, card } =
      HIGH_CONTRAST;
    assert.ok(contrastRatio(foreground, background) >= 7);
    assert.ok(contrastRatio(mutedForeground, background) >= 4.5);
    assert.ok(contrastRatio(primaryForeground, primary) >= 4.5);
    assert.ok(contrastRatio(ctaForeground, cta) >= 4.5);
    assert.ok(contrastRatio(mustForeground, must) >= 4.5);
    assert.ok(contrastRatio(maybeForeground, maybe) >= 4.5);
    assert.ok(contrastRatio(destructive, card) >= 4.5);
    assert.ok(contrastRatio(primary, background) >= 4.5);
  });
});

describe("official inclusion amenities", () => {
  it("lists quiet and prayer rooms from source data and never claims a step-free pin", () => {
    const rooms = inclusionAmenities();
    assert.ok(rooms.some((r) => /quiet/i.test(r.name)));
    assert.ok(rooms.some((r) => /prayer/i.test(r.name)));
    assert.ok(rooms.every((r) => r.coordinates === null));
    assert.ok(rooms.every((r) => r.step_free_route_verified === false));
    assert.ok(OFFICIAL_AMENITIES.every((r) => r.step_free_route_verified === false));
    assert.match(amenityLabel(rooms[0]!), /·/);
  });
});
