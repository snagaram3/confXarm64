import type { MapSurface } from "./types";
import type { SchematicSheetId } from "./venue-schematic";

export const CONFERENCE_DAYS = [
  { id: "2026-11-08", label: "Sun 8", weekday: "Sunday" },
  { id: "2026-11-09", label: "Mon 9", weekday: "Monday" },
  { id: "2026-11-10", label: "Tue 10", weekday: "Tuesday" },
  { id: "2026-11-11", label: "Wed 11", weekday: "Wednesday" },
  { id: "2026-11-12", label: "Thu 12", weekday: "Thursday" },
] as const;

export type ConferenceDayId = (typeof CONFERENCE_DAYS)[number]["id"];

export interface AskParse {
  raw: string;
  q: string;
  surface: MapSurface | null;
  sheet: SchematicSheetId | null;
  stepFree: boolean | null;
  day: ConferenceDayId | null;
  includeEnded: boolean | null;
  understood: string[];
}

const ORIGINS: Array<{
  pattern: RegExp;
  surface: MapSurface;
  sheet?: SchematicSheetId;
  chip: string;
}> = [
  { pattern: /\b(west temple|expo|showcase|booths?|exhibitor)\b/i, surface: "expo", chip: "Expo floor" },
  { pattern: /\b(hyatt|regency ballroom|capitol reef|park city|salt lake ballroom)\b/i, surface: "venue", sheet: "hyatt", chip: "Hyatt schematic" },
  { pattern: /\b(255|sample schematic|scripted walk)\b/i, surface: "sample", chip: "Sample 255 walk" },
  { pattern: /\b(level\s*2|mezzanine|250|251|254|east registration)\b/i, surface: "venue", sheet: "salt-l2", chip: "Salt Palace L2" },
  { pattern: /\b(level\s*1|salt palace|ballroom|hall de|grand ballroom|venue map)\b/i, surface: "venue", sheet: "salt-l1", chip: "Salt Palace L1" },
];

const DAY_PATTERNS: Array<{ pattern: RegExp; day: ConferenceDayId; chip: string }> = [
  { pattern: /\b(sun(day)?|nov\.?\s*8|11\/8|8th)\b/i, day: "2026-11-08", chip: "Sunday 8 Nov" },
  { pattern: /\b(mon(day)?|nov\.?\s*9|11\/9|9th)\b/i, day: "2026-11-09", chip: "Monday 9 Nov" },
  { pattern: /\b(tue(s(day)?)?|nov\.?\s*10|11\/10|10th)\b/i, day: "2026-11-10", chip: "Tuesday 10 Nov" },
  { pattern: /\b(wed(nesday)?|nov\.?\s*11|11\/11|11th)\b/i, day: "2026-11-11", chip: "Wednesday 11 Nov" },
  { pattern: /\b(thu(rs(day)?)?|nov\.?\s*12|11\/12|12th)\b/i, day: "2026-11-12", chip: "Thursday 12 Nov" },
];

/**
 * Floorwise Ask parser. Origins are Salt Palace / Hyatt / Expo / sample 255 —
 * not the reference app's simulated graph node ids.
 */
export function parseAsk(raw: string): AskParse {
  let text = raw.trim();
  const understood: string[] = [];
  let surface: MapSurface | null = null;
  let sheet: SchematicSheetId | null = null;
  let stepFree: boolean | null = null;
  let day: ConferenceDayId | null = null;
  let includeEnded: boolean | null = null;

  const take = (pattern: RegExp) => {
    if (!pattern.test(text)) return false;
    text = text.replace(pattern, " ").replace(/\s+/g, " ").trim();
    return true;
  };

  if (take(/\b(step[-\s]?free|elevator|no stairs|accessible)\b/i)) {
    stepFree = true;
    understood.push("Step-free (sample 255 only)");
  } else if (take(/\b(stairs ok|stairs allowed|escalator)\b/i)) {
    stepFree = false;
    understood.push("Stairs allowed on sample walk");
  }

  if (take(/\b(include ended|show ended|already ended)\b/i)) {
    includeEnded = true;
    understood.push("Include ended talks");
  }

  for (const row of DAY_PATTERNS) {
    if (take(row.pattern)) {
      day = row.day;
      understood.push(row.chip);
      break;
    }
  }

  for (const origin of ORIGINS) {
    if (origin.pattern.test(text)) {
      take(origin.pattern);
      surface = origin.surface;
      sheet = origin.sheet ?? null;
      understood.push(origin.chip);
      break;
    }
  }

  const q = text
    .replace(/\b(from|near|at|on|in|to|for|about|the|take me|show me|find|talks?)\b/gi, " ")
    .replace(/[?!,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { raw, q, surface, sheet, stepFree, day, includeEnded, understood };
}
