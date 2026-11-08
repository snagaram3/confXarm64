import type { Booth, Rank } from "./types";

export type ExpoPinRecord = {
  id: string;
  nx: number;
  ny: number;
  label: string;
  booth: Booth;
  pref?: Rank;
  mustGo: boolean;
};

/** Official PDF-text anchors only. Never invent a pin for an unplaced booth. */
export function placedExpoPins(
  booths: Booth[],
  prefs: Record<string, Rank> = {},
): ExpoPinRecord[] {
  return booths
    .filter((booth) => booth.pinAvailable && booth.pinNx != null && booth.pinNy != null)
    .map((booth) => ({
      id: booth.id,
      nx: booth.pinNx as number,
      ny: booth.pinNy as number,
      label: `${booth.sponsor}, booth ${booth.boothNumber}`,
      booth,
      pref: prefs[booth.id],
      mustGo: prefs[booth.id] === "must",
    }));
}

export function pinCoordinateKey(nx: number, ny: number): string {
  return `${nx.toFixed(5)},${ny.toFixed(5)}`;
}

export function mustGoBooths(booths: Booth[], prefs: Record<string, Rank>): Booth[] {
  return booths.filter((booth) => prefs[booth.id] === "must");
}

export function canPinOnExpo(booth: Pick<Booth, "pinAvailable" | "pinNx" | "pinNy">): boolean {
  return Boolean(booth.pinAvailable && booth.pinNx != null && booth.pinNy != null);
}
