import type { Profile, Rank } from "./types";

export const RANK_LABEL: Record<Rank, string> = {
  must: "Must go",
  maybe: "Maybe",
  meh: "Meh",
};

export const DEFAULT_PROFILE: Profile = {
  name: "Alex Rivera",
  role: "Staff Platform Engineer",
  interests: ["Kubernetes", "observability", "platform engineering", "eBPF", "OpenTelemetry"],
};

export function rankWeight(rank: Rank): number {
  if (rank === "must") return 3;
  if (rank === "maybe") return 2;
  return 1;
}
