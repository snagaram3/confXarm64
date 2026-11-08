import type { Rank } from "./types";

export const PREF_STORAGE_KEY = "floorwise.sponsorPrefs";

export function prefStorageKey(attendeeId: string): string {
  return `${PREF_STORAGE_KEY}.${attendeeId}`;
}

export const PREF_OPTIONS = ["must", "maybe", "meh"] as const;

export const PREF_LABEL: Record<Rank | "unrated", string> = {
  must: "Must go",
  maybe: "Maybe",
  meh: "Meh",
  unrated: "Unrated",
};

export function isSponsorPref(value: unknown): value is Rank {
  return value === "must" || value === "maybe" || value === "meh";
}

export function parseSponsorPrefs(raw: string | null): Record<string, Rank> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, Rank> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (isSponsorPref(value) && id.trim()) out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

type PrefStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/**
 * Attendee-scoped Must/Maybe/Meh. An empty scoped bag wins over the legacy
 * global key so clearing Must go survives refresh and does not leak to another UUID.
 */
export function readAttendeeSponsorPrefs(storage: PrefStorage, attendeeId: string): Record<string, Rank> {
  const scopedRaw = storage.getItem(prefStorageKey(attendeeId));
  if (scopedRaw !== null) return parseSponsorPrefs(scopedRaw);
  const legacy = parseSponsorPrefs(storage.getItem(PREF_STORAGE_KEY));
  if (Object.keys(legacy).length) {
    storage.setItem(prefStorageKey(attendeeId), JSON.stringify(legacy));
    storage.removeItem(PREF_STORAGE_KEY);
  }
  return legacy;
}

/** Clicking the same rank again clears it so Unrated stays distinct from Meh. */
export function cycleSponsorPref(current: Rank | undefined, chosen: Rank): Rank | undefined {
  return current === chosen ? undefined : chosen;
}

export function prefLabel(pref: Rank | undefined): string {
  return pref ? PREF_LABEL[pref] : PREF_LABEL.unrated;
}
