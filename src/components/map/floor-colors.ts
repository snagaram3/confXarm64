import { PALETTE } from "@/theme/tokens";
import type { Rank, SpaceKind } from "@/lib/types";

export const RANK_FILL: Record<Rank, { fill: string; stroke: string; label: string }> = {
  must: { fill: PALETTE.mustWash, stroke: PALETTE.must, label: PALETTE.foreground },
  maybe: { fill: PALETTE.maybeWash, stroke: PALETTE.maybe, label: PALETTE.foreground },
  meh: { fill: PALETTE.mehWash, stroke: PALETTE.meh, label: PALETTE.foreground },
};

export const KIND_FILL: Record<SpaceKind, { fill: string; stroke: string; label: string }> = {
  hall: { fill: PALETTE.mapCanvas, stroke: PALETTE.border, label: PALETTE.mutedForeground },
  room: { fill: PALETTE.card, stroke: PALETTE.border, label: PALETTE.foreground },
  lobby: { fill: PALETTE.secondary, stroke: PALETTE.mapGrid, label: PALETTE.mutedForeground },
  vertical: { fill: PALETTE.accent, stroke: PALETTE.primary, label: PALETTE.primary },
  entrance: { fill: PALETTE.secondary, stroke: PALETTE.primary, label: PALETTE.primary },
};

export function spacePaint(kind: SpaceKind, rank?: Rank) {
  if (rank && (kind === "hall" || kind === "room")) return RANK_FILL[rank];
  return KIND_FILL[kind];
}
