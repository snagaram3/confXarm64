import { LATE_SESSION_ID } from "./catalog";
import type { Rank, Ranked, Session } from "./types";

export type SuggestionKind = "recommendation" | "route" | "status";
export type SuggestionAction = "view" | "navigate" | "save" | "retry";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  title: string;
  body: string;
  why: string;
  sessionId?: string;
  actions: SuggestionAction[];
}

export interface SuggestionInput {
  rankStatus: "loading" | "ready" | "error";
  navigating: boolean;
  mustSessions: Ranked<Session>[];
  lateSession: Ranked<Session> | undefined;
  remainingSec: number;
}

export function buildSuggestions(input: SuggestionInput): Suggestion[] {
  if (input.rankStatus === "error") {
    return [
      {
        id: "es-retry",
        kind: "status",
        title: "Search is still starting",
        body: "The sample floor plan stays available. Ranks fill in when Elasticsearch is ready — this is not a live venue feed.",
        why: "Seeded demo catalog. Retry when the search service answers.",
        actions: ["retry"],
      },
    ];
  }

  const out: Suggestion[] = [];
  const top = input.mustSessions[0];
  if (top) {
    const room = top.item.roomId;
    out.push({
      id: `rec-${top.item.id}`,
      kind: "recommendation",
      title: room === "255" ? `Start in room ${room}` : `Must: ${top.item.title}`,
      body:
        room === "255"
          ? `${top.item.title} is your strongest tag match in the sample catalog.`
          : `Room ${room} · ${top.item.start}. Ranked from your interests against the sample catalog.`,
      why: top.matchedTags.length
        ? `Matches your interests: ${top.matchedTags.join(", ")}.`
        : top.why,
      sessionId: top.item.id,
      actions: room === "255" ? ["view", "navigate", "save"] : ["view", "save"],
    });
  }

  if (!input.navigating && input.lateSession?.item.id === LATE_SESSION_ID) {
    const mins = Math.max(1, Math.round(input.remainingSec / 60));
    out.push({
      id: "route-255",
      kind: "route",
      title: `About ${mins} min to 255, one floor up`,
      body: "Scripted walk from West Temple. Not live indoor positioning.",
      why: "255 stacks over 155. Sample route only — no beacons or AR.",
      sessionId: LATE_SESSION_ID,
      actions: ["navigate", "view"],
    });
  }

  return out.slice(0, 2);
}

export function isMust(rank: Rank): boolean {
  return rank === "must";
}
