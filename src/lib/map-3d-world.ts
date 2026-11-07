import { rectCenter, type Rect, type SchematicRoom, type SchematicSheetId } from "./venue-schematic";

/** Schematic units → world units. Illustrative extrusion, not surveyed meters. */
export const WORLD_SCALE = 0.08;
export const WORLD_FLOOR_GAP = 16;
export const HYATT_OFFSET_X = 1180;

export type WorldPoint = { x: number; y: number; z: number };

export function sheetFloor(sheet: SchematicSheetId): number {
  if (sheet === "salt-l2") return 2;
  if (sheet === "hyatt") return 2;
  return 1;
}

export function sheetOffsetX(sheet: SchematicSheetId): number {
  return sheet === "hyatt" ? HYATT_OFFSET_X : 0;
}

export function worldPoint(sheet: SchematicSheetId, point: { x: number; y: number }, lift = 0): WorldPoint {
  return {
    x: (point.x + sheetOffsetX(sheet)) * WORLD_SCALE,
    y: (sheetFloor(sheet) - 1) * WORLD_FLOOR_GAP + lift,
    z: point.y * WORLD_SCALE,
  };
}

export function roomWorldCenter(room: SchematicRoom, lift = 0): WorldPoint {
  return worldPoint(room.sheet, rectCenter(room.rect), lift);
}

export function plateFromRects(sheet: SchematicSheetId, rects: Rect[], pad = 18): { center: WorldPoint; width: number; depth: number } {
  const minX = Math.min(...rects.map((r) => r.x)) - pad;
  const minY = Math.min(...rects.map((r) => r.y)) - pad;
  const maxX = Math.max(...rects.map((r) => r.x + r.w)) + pad;
  const maxY = Math.max(...rects.map((r) => r.y + r.h)) + pad;
  return {
    center: worldPoint(sheet, { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, -0.25),
    width: (maxX - minX) * WORLD_SCALE,
    depth: (maxY - minY) * WORLD_SCALE,
  };
}
