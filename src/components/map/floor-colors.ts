import type { Rank, SpaceKind } from "@/lib/types";

export const RANK_FILL: Record<Rank, { fill: string; stroke: string; label: string }> = {
  must: { fill: "#d7eadc", stroke: "#246b45", label: "#1c1917" },
  maybe: { fill: "#f3e4c4", stroke: "#9a6b16", label: "#1c1917" },
  meh: { fill: "#e8e4dc", stroke: "#8a847a", label: "#3f3a34" },
};

export const KIND_FILL: Record<SpaceKind, { fill: string; stroke: string; label: string }> = {
  hall: { fill: "#efeae1", stroke: "#cfc6b8", label: "#3f3a34" },
  room: { fill: "#f7f3ec", stroke: "#cfc6b8", label: "#1c1917" },
  lobby: { fill: "#f3eee6", stroke: "#ddd4c6", label: "#6f6a62" },
  vertical: { fill: "#e4eee9", stroke: "#21554c", label: "#21554c" },
  entrance: { fill: "#dce8e4", stroke: "#21554c", label: "#21554c" },
};

export function spacePaint(kind: SpaceKind, rank?: Rank) {
  if (rank && (kind === "hall" || kind === "room")) return RANK_FILL[rank];
  return KIND_FILL[kind];
}
