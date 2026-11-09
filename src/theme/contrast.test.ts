import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastRatio } from "./contrast.ts";
import { ADJUSTED, EDITORIAL, PALETTE, PREFERENCE, SOURCE } from "./tokens.ts";

describe("KCNA-inspired palette contrast", () => {
  it("keeps white on event navy well above AA", () => {
    assert.ok(contrastRatio(SOURCE.white, SOURCE.navy) >= 7);
  });

  it("keeps body text readable on the adjusted background", () => {
    assert.ok(contrastRatio(ADJUSTED.foreground, ADJUSTED.background) >= 10);
    assert.ok(contrastRatio(ADJUSTED.mutedForeground, ADJUSTED.background) >= 4.5);
    assert.ok(contrastRatio(ADJUSTED.mutedForeground, ADJUSTED.card) >= 4.5);
  });

  it("keeps CTA pink with white at least AA for buttons", () => {
    assert.ok(contrastRatio(SOURCE.white, SOURCE.pink) >= 4.5);
  });

  it("keeps black-on-gold schedule highlight readable", () => {
    assert.ok(contrastRatio(ADJUSTED.goldFg, SOURCE.gold) >= 7);
  });

  it("keeps preference fills distinct and readable, not navy", () => {
    assert.notEqual(PREFERENCE.must.toLowerCase(), SOURCE.navy.toLowerCase());
    assert.notEqual(PREFERENCE.maybe.toLowerCase(), SOURCE.navy.toLowerCase());
    assert.ok(contrastRatio(PREFERENCE.mustFg, PREFERENCE.must) >= 4.5);
    assert.ok(contrastRatio(PREFERENCE.maybeFg, PREFERENCE.maybe) >= 4.5);
    assert.ok(contrastRatio(PREFERENCE.mehFg, PREFERENCE.meh) >= 4.5);
  });

  it("keeps destructive red readable on white cards", () => {
    assert.ok(contrastRatio(PALETTE.destructive, ADJUSTED.card) >= 4.5);
  });

  it("keeps Field Guide editorial ink, teal, coral, and gold readable", () => {
    assert.ok(contrastRatio(EDITORIAL.ink, EDITORIAL.paper) >= 10);
    assert.ok(contrastRatio(EDITORIAL.teal, EDITORIAL.tealBg) >= 4.5);
    assert.ok(contrastRatio(EDITORIAL.coral, EDITORIAL.coralBg) >= 4.5);
    assert.ok(contrastRatio(EDITORIAL.gold, ADJUSTED.card) >= 4.5);
  });
});
