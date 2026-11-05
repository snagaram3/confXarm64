import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSuggestions } from "./suggestions.ts";
import type { Ranked, Session } from "./types.ts";

function session(partial: Partial<Session> & Pick<Session, "id" | "title" | "roomId">): Ranked<Session> {
  return {
    item: {
      speaker: "A",
      company: "B",
      floor: 2,
      start: "11:05",
      end: "11:40",
      track: "Observability",
      tags: ["eBPF"],
      abstract: "x",
      crowdTakes: [],
      ...partial,
    },
    engine: "elasticsearch",
    mode: "hybrid-bm25-knn",
    score: 40,
    rank: "must",
    matchedQueries: ["tag:eBPF"],
    matchedTags: ["eBPF"],
    highlights: [],
    why: "ES hybrid 40 · tag overlap eBPF",
  };
}

describe("buildSuggestions", () => {
  it("returns a retry status when search is down", () => {
    const tips = buildSuggestions({
      rankStatus: "error",
      navigating: false,
      mustSessions: [],
      lateSession: undefined,
      remainingSec: 200,
    });
    assert.equal(tips.length, 1);
    assert.equal(tips[0].kind, "status");
    assert.deepEqual(tips[0].actions, ["retry"]);
    assert.match(tips[0].body, /not a live venue feed/i);
  });

  it("recommends the top Must talk with functional actions", () => {
    const late = session({ id: "ebpf-obs", title: "eBPF Observability", roomId: "255" });
    const tips = buildSuggestions({
      rankStatus: "ready",
      navigating: false,
      mustSessions: [late],
      lateSession: late,
      remainingSec: 180,
    });
    assert.ok(tips.some((t) => t.kind === "recommendation" && t.actions.includes("navigate")));
    assert.match(
      tips.find((t) => t.kind === "recommendation")?.why ?? "",
      /Matches your interests/,
    );
    assert.ok(tips.some((t) => t.kind === "route" && t.title.includes("255")));
    assert.equal(tips.length, 2);
  });

  it("does not claim an AI engine in copy", () => {
    const talk = session({ id: "otel-prod", title: "OpenTelemetry", roomId: "251" });
    const tips = buildSuggestions({
      rankStatus: "ready",
      navigating: true,
      mustSessions: [talk],
      lateSession: talk,
      remainingSec: 0,
    });
    const blob = tips.map((t) => `${t.title} ${t.body} ${t.why}`).join(" ");
    assert.doesNotMatch(blob, /AI engine|powered by AI|language model/i);
    assert.ok(tips[0].actions.includes("view"));
    assert.ok(tips[0].actions.includes("save"));
  });
});
