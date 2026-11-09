import { sessionStatus } from "./agenda";
import { CONFERENCE_TZ, dayKey } from "./timezone";
import type { Ranked, Session } from "./types";
import type { ConferenceDayId } from "./ask";

export function filterRankedSessions(
  rows: Ranked<Session>[],
  opts: {
    day: ConferenceDayId | "all";
    includeEnded: boolean;
    clock: Date;
    attendanceDays?: string[];
    track?: string | "all";
  },
): Ranked<Session>[] {
  return rows.filter((row) => {
    const iso = row.item.startIso;
    if (opts.day !== "all") {
      if (!iso) return false;
      if (dayKey(iso, CONFERENCE_TZ) !== opts.day) return false;
    } else if (opts.attendanceDays && opts.attendanceDays.length > 0) {
      if (!iso) return false;
      if (!opts.attendanceDays.includes(dayKey(iso, CONFERENCE_TZ))) return false;
    }
    if (opts.track && opts.track !== "all") {
      const labels = [row.item.track, ...(row.item.sessionTypeLabels ?? [])];
      if (!labels.some((label) => label === opts.track)) return false;
    }
    if (!opts.includeEnded && row.item.startIso && row.item.endIso) {
      if (sessionStatus({ id: row.item.id, title: row.item.title, startIso: row.item.startIso, endIso: row.item.endIso }, opts.clock) === "finished") {
        return false;
      }
    }
    return true;
  });
}

export function uniqueTracks(sessions: Session[]): string[] {
  const set = new Set<string>();
  for (const session of sessions) {
    if (session.track) set.add(session.track);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** True when ES named a tag or BM25 keyword — kNN-only neighbors are not a topic fit. */
export function hasInterestMatch(row: Ranked<Session>): boolean {
  if (row.matchedTags.length > 0) return true;
  const queries = row.matchedQueries ?? [];
  return queries.includes("bm25_keyword") || queries.some((q) => q.startsWith("tag:"));
}

export function matchContribution(row: Ranked<Session>): "hybrid" | "keyword" | "tag" | "semantic" {
  const queries = row.matchedQueries ?? [];
  const hasKeyword = queries.some((q) => q === "bm25_keyword" || q.startsWith("role"));
  const hasTag = queries.some((q) => q.startsWith("tag:"));
  const hasSemantic = queries.includes("semantic_knn") || row.mode === "semantic-knn";
  if (hasKeyword && hasTag) return "hybrid";
  if (hasKeyword && hasSemantic) return "hybrid";
  if (hasKeyword) return "keyword";
  if (hasTag) return "tag";
  if (hasSemantic) return "semantic";
  return row.mode === "hybrid-bm25-knn" ? "hybrid" : "keyword";
}
