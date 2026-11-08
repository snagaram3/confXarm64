import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEMO_PROFILE,
  EMPTY_PROFILE,
  canFinishOnboarding,
  composeRankQuery,
  parsePlannerProfile,
  profileDisplayName,
} from "./planner-profile.ts";

describe("planner profile", () => {
  it("keeps an already onboarded visitor onboarded when topics are edited empty", () => {
    const stored = parsePlannerProfile(
      JSON.stringify({
        name: "Jordan",
        role: "Security Engineer",
        interests: [],
        goals: ["talks"],
        attendanceDays: ["2026-11-10"],
        onboarded: true,
        demoPersona: false,
      }),
    );
    assert.equal(stored.onboarded, true);
    assert.equal(stored.name, "Jordan");
    assert.equal(stored.demoPersona, false);
  });

  it("does not treat a missing store as Alex Rivera", () => {
    const empty = parsePlannerProfile(null);
    assert.equal(empty.onboarded, false);
    assert.equal(empty.demoPersona, false);
    assert.equal(empty.name, "");
    assert.deepEqual(empty.interests, []);
    assert.notEqual(empty.name, DEMO_PROFILE.name);
    assert.equal(profileDisplayName(EMPTY_PROFILE), "Your trip");
  });

  it("keeps the labeled demo persona opt-in and distinct from an empty visitor", () => {
    assert.equal(DEMO_PROFILE.demoPersona, true);
    assert.equal(DEMO_PROFILE.onboarded, true);
    assert.ok(DEMO_PROFILE.interests.includes("eBPF"));
    const roundTrip = parsePlannerProfile(JSON.stringify(DEMO_PROFILE));
    assert.equal(roundTrip.demoPersona, true);
    assert.deepEqual(roundTrip.interests, DEMO_PROFILE.interests);
  });

  it("requires topics and attendance days before finish", () => {
    assert.equal(canFinishOnboarding(EMPTY_PROFILE).ok, false);
    assert.equal(
      canFinishOnboarding({ ...EMPTY_PROFILE, interests: ["security"] }).ok,
      false,
    );
    assert.equal(
      canFinishOnboarding({
        ...EMPTY_PROFILE,
        interests: ["security"],
        attendanceDays: ["2026-11-10"],
      }).ok,
      true,
    );
  });

  it("two interest sets produce different ranking queries and do not invent match percents", () => {
    const platform = composeRankQuery(
      { ...DEMO_PROFILE, goals: ["talks", "keynotes"] },
      "",
    );
    const security = composeRankQuery(
      {
        ...EMPTY_PROFILE,
        interests: ["security"],
        goals: ["talks"],
        attendanceDays: ["2026-11-10"],
      },
      "",
    );
    assert.match(platform, /keynote/i);
    assert.doesNotMatch(security, /keynote/i);
    assert.notEqual(platform, security);
    assert.ok(!DEMO_PROFILE.interests.includes("security"));
  });
});
