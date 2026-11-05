import type { Rank, SpaceKind } from "@/lib/types";

export const RANK_FILL: Record<Rank, { fill: string; stroke: string; label: string }> = {
  must: { fill: "#14532d", stroke: "#34d399", label: "#ecfdf5" },
  maybe: { fill: "#78350f", stroke: "#fbbf24", label: "#fffbeb" },
  meh: { fill: "#1e293b", stroke: "#64748b", label: "#cbd5e1" },
};

export const KIND_FILL: Record<SpaceKind, { fill: string; stroke: string; label: string }> = {
  hall: { fill: "#152536", stroke: "#2a4a66", label: "#b8c9d9" },
  room: { fill: "#152536", stroke: "#2a4a66", label: "#d7e6f2" },
  lobby: { fill: "#0f1e2c", stroke: "#1e3a52", label: "#7c93a8" },
  vertical: { fill: "#0c2a3a", stroke: "#22d3ee", label: "#a5f3fc" },
  entrance: { fill: "#134e4a", stroke: "#5eead4", label: "#ccfbf1" },
};

export function spacePaint(kind: SpaceKind, rank?: Rank) {
  if (rank && (kind === "hall" || kind === "room")) return RANK_FILL[rank];
  return KIND_FILL[kind];
}
