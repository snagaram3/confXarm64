import { LATE_SESSION_ID } from "./catalog";
import { isSample255Destination } from "./map-destination";
import type { Booth, Rank, Ranked, Session } from "./types";

export type SuggestionKind = "recommendation" | "route" | "status";
export type SuggestionAction = "view" | "navigate" | "save" | "retry";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  title: string;
  body: string;
  why: string;
  sessionId?: string;
  boothId?: string;
  rank?: Rank;
  actions: SuggestionAction[];
}

export interface SuggestionInput {
  rankStatus: "loading" | "ready" | "error";
  navigating: boolean;
  mustSessions: Ranked<Session>[];
  lateSession: Ranked<Session> | undefined;
  remainingSec: number;
  mustBooth?: { id: string; sponsor: string; boothNumber: string; pinAvailable?: boolean };
  mustBoothFromPref?: boolean;
  rankedBooths?: Ranked<Booth>[];
}

function boothWhy(row: Ranked<Booth>): string {
  if (row.matchedTags.length) {
    return `Catalog tags overlap your search/interests: ${row.matchedTags.join(", ")}. Elasticsearch booth ranking, not walking distance.`;
  }
  if (row.matchedQueries.length) {
    return `Matched ${row.matchedQueries.join(", ")}. Elasticsearch booth ranking, not walking distance.`;
  }
  return `${row.why} Not a proximity or crowd rank.`;
}

export function pickSponsorSuggestion(input: SuggestionInput): Suggestion | null {
  if (input.mustBooth && input.mustBoothFromPref) {
    const pinned = input.mustBooth.pinAvailable !== false;
    return {
      id: `booth-${input.mustBooth.id}`,
      kind: "recommendation",
      title: `Must go · ${input.mustBooth.sponsor}`,
      body: pinned
        ? `Booth ${input.mustBooth.boothNumber} on the official expo map. Your visit preference, not a crowd count.`
        : `Booth ${input.mustBooth.boothNumber} is in the exhibitor catalog but not a verified pin on expo.pdf.`,
      why: "You marked this exhibitor Must go. Visit preference, not walking distance or an endorsement.",
      boothId: input.mustBooth.id,
      rank: "must",
      actions: ["view"],
    };
  }
  const topical = (input.rankedBooths ?? []).find(
    (row) => row.matchedTags.length > 0 || row.matchedQueries.length > 0,
  );
  if (!topical) return null;
  return {
    id: `booth-${topical.item.id}`,
    kind: "recommendation",
    title: `Exhibitor match · ${topical.item.sponsor}`,
    body: topical.item.pinAvailable
      ? `Booth ${topical.item.boothNumber} on the official expo map.`
      : `Booth ${topical.item.boothNumber} is in the exhibitor catalog but not a verified pin on expo.pdf.`,
    why: boothWhy(topical),
    boothId: topical.item.id,
    rank: topical.rank,
    actions: ["view"],
  };
}

export function buildSuggestions(input: SuggestionInput): Suggestion[] {
  if (input.rankStatus === "error") {
    return [
      {
        id: "es-retry",
        kind: "status",
        title: "Search is still starting",
        body: "The expo map stays available. Ranks fill in when Elasticsearch is ready.",
        why: "Official schedule search. Retry when the search service answers.",
        actions: ["retry"],
      },
    ];
  }

  const out: Suggestion[] = [];
  const top = input.mustSessions[0];
  if (top) {
    const room = top.item.roomId;
    const sampleWalk = isSample255Destination(room) || top.item.id === LATE_SESSION_ID;
    out.push({
      id: `rec-${top.item.id}`,
      kind: "recommendation",
      title: sampleWalk ? `Start in room ${room}` : `Must: ${top.item.title}`,
      body:
        sampleWalk
          ? `${top.item.title} is your strongest tag match in the official or SAMPLE catalog.`
          : `${top.item.roomLabel ?? `Room ${room}`} · ${top.item.start}. Personal Elasticsearch fit, not a popularity rank.`,
      why: top.matchedTags.length
        ? `Matches your interests: ${top.matchedTags.join(", ")}.`
        : top.why,
      sessionId: top.item.id,
      rank: "must",
      actions: sampleWalk ? ["view", "navigate", "save"] : ["view", "save"],
    });
  }

  const sponsor = pickSponsorSuggestion(input);
  if (sponsor) out.push(sponsor);

  return out.slice(0, 3);
}

export function isMust(rank: Rank): boolean {
  return rank === "must";
}
