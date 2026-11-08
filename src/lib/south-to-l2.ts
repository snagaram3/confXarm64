import { SOUTH_ENTRANCE_ID } from "./map-query";
import { WORLD_FLOOR_GAP, roomWorldCenter, worldPoint, type WorldBox, type WorldPoint } from "./map-3d-world";
import type { NavKeyframe } from "./nav-playback";
import type { Floor, MapSurface } from "./types";
import { SCHEMATIC_ROOMS, rectCenter, type SchematicRoom, type SchematicSheetId } from "./venue-schematic";

/** Official Salt Palace L2 named space (East Registration). Not SAMPLE 255. */
export const HERO_DESTINATION_ID = "87691";
/** Schematic-only marker. Not a venue.pdf STAIRS/ELEVATOR label and not a surveyed cab. */
export const HERO_SHAFT_ID = "demo-l1-l2-shaft";
export const HERO_ORIGIN_ID = SOUTH_ENTRANCE_ID;
export const HERO_PREVIEW_KEY = "floorwise.heroPreviewPlayed";
export const HERO_DURATION_SEC = 13;

/** Corridor point on the illustrative schematic — not a PDF connector coordinate. */
export const HERO_SHAFT_SCHEMATIC = { x: 360, y: 312 };

export const HERO_JOURNEY_TITLE = "200 South → Salt Palace L2";
export const HERO_JOURNEY_DISCLAIMER =
  "Illustrative journey — not verified onsite navigation. Official names for the start and floors; the corridor, DEMO floor change, and ribbon are a schematic drawing — not a surveyed elevator, walking path, GPS, travel time, or step-free route.";
export const HERO_JOURNEY_DISCLAIMER_SHORT = "Illustrative journey — not verified onsite navigation";
export const HERO_SHAFT_LABEL = "DEMO floor change — not a surveyed elevator";

export interface HeroStep {
  progress: number;
  sheet: SchematicSheetId;
  highlightId: string;
  label: string;
}

export const HERO_STEPS: HeroStep[] = [
  {
    progress: 0,
    sheet: "salt-l1",
    highlightId: HERO_ORIGIN_ID,
    label: "200 South Entrance · Salt Palace L1",
  },
  {
    progress: 0.28,
    sheet: "salt-l1",
    highlightId: HERO_ORIGIN_ID,
    label: "Illustrative L1 corridor",
  },
  {
    progress: 0.5,
    sheet: "salt-l1",
    highlightId: HERO_SHAFT_ID,
    label: "DEMO floor change — not a surveyed elevator",
  },
  {
    progress: 0.72,
    sheet: "salt-l2",
    highlightId: HERO_DESTINATION_ID,
    label: "Salt Palace Level 2",
  },
  {
    progress: 1,
    sheet: "salt-l2",
    highlightId: HERO_DESTINATION_ID,
    label: "East Registration · Salt Palace L2",
  },
];

export function isHeroDemoId(id: string | null | undefined): boolean {
  return id === HERO_ORIGIN_ID || id === HERO_DESTINATION_ID || id === HERO_SHAFT_ID;
}

export function readHeroPreviewPlayed(): boolean {
  try {
    return sessionStorage.getItem(HERO_PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHeroPreviewPlayed(): void {
  try {
    sessionStorage.setItem(HERO_PREVIEW_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function shouldAutoplayHero(input: {
  reducedMotion: boolean;
  webgl: boolean;
  storedProjection: "flat" | "3d" | null;
  requestedProjection: "flat" | "3d" | null;
  surface: MapSurface | null;
  originId: string | null;
  destinationId: string | null;
  alreadyPlayed: boolean;
  /** Only the explicit South→L2 share URL may autoplay. Ordinary Map/Home never does. */
  explicitShare?: boolean;
}): boolean {
  if (!input.explicitShare) return false;
  if (input.alreadyPlayed) return false;
  if (!input.webgl) return false;
  if (input.reducedMotion) return false;
  if (input.storedProjection === "flat") return false;
  if (input.requestedProjection === "flat") return false;
  if (input.surface && input.surface !== "venue") return false;
  if (input.originId && input.originId !== HERO_ORIGIN_ID) return false;
  if (input.destinationId && input.destinationId !== HERO_DESTINATION_ID) return false;
  return true;
}

function frame(
  sheet: SchematicSheetId,
  point: { x: number; y: number },
  floor: Floor,
  stepId: string,
  label: string,
  kind: "walk" | "vertical",
  lift: number,
): NavKeyframe {
  const w = worldPoint(sheet, point, lift);
  return { x: w.x, y: w.y, z: w.z, floor, stepId, label, kind };
}

/** Illustrative South Entrance → L2 ribbon on the Floorwise schematic. Not a routing graph. */
export function southToL2Keyframes(rooms: SchematicRoom[] = SCHEMATIC_ROOMS): NavKeyframe[] {
  const start = rooms.find((room) => room.id === HERO_ORIGIN_ID);
  const end = rooms.find((room) => room.id === HERO_DESTINATION_ID);
  if (!start || !end) return [];
  const s = rectCenter(start.rect);
  const e = rectCenter(end.rect);
  const corridorY = 312;
  const shaft = HERO_SHAFT_SCHEMATIC;
  const midLift = WORLD_FLOOR_GAP * 0.5;
  /** Drawn above schematic room masses so the DEMO ribbon stays readable. */
  const walkLift = 3.15;
  return [
    frame("salt-l1", { x: s.x, y: s.y }, 1, "south", "200 South Entrance · Salt Palace L1", "walk", walkLift),
    frame("salt-l1", { x: s.x, y: (s.y + corridorY) / 2 }, 1, "approach", "Illustrative L1 corridor", "walk", walkLift),
    frame("salt-l1", { x: s.x, y: corridorY }, 1, "corridor", "Illustrative L1 corridor", "walk", walkLift),
    frame("salt-l1", { x: (s.x + shaft.x) / 2, y: corridorY }, 1, "along", "Illustrative L1 corridor", "walk", walkLift),
    frame("salt-l1", shaft, 1, "shaft-base", HERO_SHAFT_LABEL, "walk", walkLift),
    frame("salt-l1", shaft, 1, "up", HERO_SHAFT_LABEL, "vertical", midLift),
    frame("salt-l2", shaft, 2, "arrive-l2", "Salt Palace Level 2", "walk", walkLift),
    frame("salt-l2", { x: shaft.x, y: (shaft.y + e.y) / 2 }, 2, "l2-drop", "Illustrative L2 corridor", "walk", walkLift),
    frame("salt-l2", { x: e.x, y: corridorY }, 2, "l2-corridor", "Illustrative L2 corridor", "walk", walkLift),
    frame("salt-l2", { x: e.x, y: e.y }, 2, "east-reg", "East Registration · Salt Palace L2", "walk", walkLift),
  ];
}

export function heroShaftWorld(): WorldPoint {
  return worldPoint("salt-l1", HERO_SHAFT_SCHEMATIC, 0);
}

/** Tight framing around the DEMO L1→L2 corridor so phone/desktop aren't wasted on empty plate. */
export function heroJourneyBox(rooms: SchematicRoom[] = SCHEMATIC_ROOMS, compact = false): WorldBox {
  const origin = rooms.find((room) => room.id === HERO_ORIGIN_ID);
  const dest = rooms.find((room) => room.id === HERO_DESTINATION_ID);
  const pad = compact ? 6.2 : 9;
  const points: WorldPoint[] = [
    worldPoint("salt-l1", HERO_SHAFT_SCHEMATIC, 0),
    worldPoint("salt-l1", HERO_SHAFT_SCHEMATIC, WORLD_FLOOR_GAP),
  ];
  if (origin) points.push(roomWorldCenter(origin, 1.4));
  if (dest) points.push(roomWorldCenter(dest, WORLD_FLOOR_GAP + 1.4));
  const min = { x: Infinity, y: -1.2, z: Infinity };
  const max = { x: -Infinity, y: WORLD_FLOOR_GAP + 4.2, z: -Infinity };
  for (const point of points) {
    min.x = Math.min(min.x, point.x - pad);
    min.z = Math.min(min.z, point.z - pad);
    max.x = Math.max(max.x, point.x + pad);
    max.z = Math.max(max.z, point.z + pad);
  }
  return {
    min,
    max,
    center: {
      x: (min.x + max.x) / 2,
      y: WORLD_FLOOR_GAP * 0.42,
      z: (min.z + max.z) / 2,
    },
  };
}

export function heroStepAt(progress: number): HeroStep {
  const t = Math.min(1, Math.max(0, progress));
  let current = HERO_STEPS[0]!;
  for (const step of HERO_STEPS) {
    if (t >= step.progress) current = step;
  }
  return current;
}

export function heroStepIndex(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  let index = 0;
  for (let i = 0; i < HERO_STEPS.length; i += 1) {
    if (t >= HERO_STEPS[i]!.progress) index = i;
  }
  return index;
}

export function sheetPointsForHero(sheet: SchematicSheetId, rooms: SchematicRoom[] = SCHEMATIC_ROOMS): { x: number; y: number }[] {
  const start = rooms.find((room) => room.id === HERO_ORIGIN_ID);
  const end = rooms.find((room) => room.id === HERO_DESTINATION_ID);
  if (!start || !end) return [];
  const s = rectCenter(start.rect);
  const e = rectCenter(end.rect);
  const corridorY = 312;
  const shaft = HERO_SHAFT_SCHEMATIC;
  if (sheet === "salt-l1") {
    return [
      { x: s.x, y: s.y },
      { x: s.x, y: corridorY },
      { x: shaft.x, y: shaft.y },
    ];
  }
  if (sheet === "salt-l2") {
    return [
      { x: shaft.x, y: shaft.y },
      { x: e.x, y: corridorY },
      { x: e.x, y: e.y },
    ];
  }
  return [];
}

export function heroHighlightId(progress: number): string {
  return progress < 0.5 ? HERO_ORIGIN_ID : HERO_DESTINATION_ID;
}
