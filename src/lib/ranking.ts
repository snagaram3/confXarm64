import { EMPTY_PROFILE } from "./planner-profile";
import type { Rank } from "./types";

export const RANK_LABEL: Record<Rank, string> = {
  must: "Must go",
  maybe: "Maybe",
  meh: "Meh",
};

/** Empty visitor profile. The labeled Alex Rivera sample lives on DEMO_PROFILE. */
export const DEFAULT_PROFILE = EMPTY_PROFILE;

export function rankWeight(rank: Rank): number {
  if (rank === "must") return 3;
  if (rank === "maybe") return 2;
  return 1;
}
