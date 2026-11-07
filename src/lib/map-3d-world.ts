import { SCHEMATIC_FRAME, SHEETS, rectCenter, type Rect, type SchematicRoom, type SchematicSheetId } from "./venue-schematic";

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

/** Salt Palace levels share a footprint. Hyatt is a separate building — do not frame it with SP. */
export function relatedSheets(sheet: SchematicSheetId): SchematicSheetId[] {
  if (sheet === "hyatt") return ["hyatt"];
  return ["salt-l1", "salt-l2"];
}

export function sheetPlate(sheet: SchematicSheetId, rooms: SchematicRoom[]): { center: WorldPoint; width: number; depth: number } {
  const info = SHEETS.find((item) => item.id === sheet);
  const sheetRooms = rooms.filter((room) => room.sheet === sheet);
  const rects = [
    ...(info?.corridors ?? []),
    ...sheetRooms.map((room) => room.rect),
    ...(info?.zones.map((zone) => zone.rect) ?? []),
  ];
  return plateFromRects(sheet, rects.length ? rects : [SCHEMATIC_FRAME]);
}

export interface WorldBox {
  min: WorldPoint;
  max: WorldPoint;
  center: WorldPoint;
}

function expandBox(box: WorldBox, point: WorldPoint, hx = 0, hy = 0, hz = 0) {
  box.min.x = Math.min(box.min.x, point.x - hx);
  box.min.y = Math.min(box.min.y, point.y - hy);
  box.min.z = Math.min(box.min.z, point.z - hz);
  box.max.x = Math.max(box.max.x, point.x + hx);
  box.max.y = Math.max(box.max.y, point.y + hy);
  box.max.z = Math.max(box.max.z, point.z + hz);
}

/** Framing box for the active building/level. Hyatt is excluded from Salt Palace fits. */
export function focusWorldBox(input: {
  focusSheet: SchematicSheetId;
  rooms: SchematicRoom[];
  selectedId?: string | null;
}): WorldBox {
  const sheets = relatedSheets(input.focusSheet);
  const box: WorldBox = {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
    center: { x: 0, y: 0, z: 0 },
  };
  for (const sheet of sheets) {
    const plate = sheetPlate(sheet, input.rooms);
    expandBox(box, plate.center, plate.width / 2, 2.4, plate.depth / 2);
  }
  const selected = input.rooms.find((room) => room.id === input.selectedId);
  if (selected && sheets.includes(selected.sheet)) {
    expandBox(box, roomWorldCenter(selected, 2.2), 6, 3, 6);
  }
  box.center = {
    x: (box.min.x + box.max.x) / 2,
    y: (box.min.y + box.max.y) / 2,
    z: (box.min.z + box.max.z) / 2,
  };
  return box;
}

/** High-contrast 3D labels for the focused sheet only. */
export function labeledRoomIds(
  rooms: SchematicRoom[],
  focusSheet: SchematicSheetId,
  selectedId: string | null,
  recommendedId: string | null,
  compact = false,
): Set<string> {
  const onSheet = rooms.filter((room) => room.sheet === focusSheet);
  const ids = new Set<string>();
  for (const room of onSheet) {
    if (room.id === selectedId || room.id === recommendedId) ids.add(room.id);
    if (room.kind === "entrance" || room.kind === "hall" || room.kind === "lobby") ids.add(room.id);
  }
  if (compact) return ids;
  for (const room of onSheet) {
    if (room.kind === "showcase") continue;
    ids.add(room.id);
  }
  if (ids.size <= 16) return ids;
  const keep = new Set<string>();
  for (const room of onSheet) {
    if (room.id === selectedId || room.id === recommendedId) keep.add(room.id);
    if (room.kind === "entrance" || room.kind === "hall" || room.kind === "lobby") keep.add(room.id);
  }
  const rest = onSheet
    .filter((room) => !keep.has(room.id) && room.kind !== "showcase")
    .sort((a, b) => b.rect.w * b.rect.h - a.rect.w * a.rect.h);
  for (const room of rest.slice(0, 8)) keep.add(room.id);
  return keep;
}

export function isometricPose(
  box: WorldBox,
  aspect = 1.35,
  fov = 46,
  profile: "default" | "hero" = "default",
): { position: WorldPoint; target: WorldPoint } {
  const sizeX = Math.max(box.max.x - box.min.x, 8);
  const sizeY = Math.max(box.max.y - box.min.y, 4);
  const sizeZ = Math.max(box.max.z - box.min.z, 8);
  const vFov = (fov * Math.PI) / 180;
  const margin = profile === "hero" ? 1.22 : 1.16;
  const aspectSafe = Math.max(aspect, 0.95);
  const dist = Math.max(
    (sizeZ * margin) / (2 * Math.tan(vFov / 2)),
    (sizeX * margin) / (2 * Math.tan(vFov / 2) * aspectSafe),
    profile === "hero" ? 34 : 28,
  );
  const target = { x: box.center.x, y: box.center.y + sizeY * (profile === "hero" ? 0.12 : 0.15), z: box.center.z };
  if (profile === "hero") {
    return {
      position: {
        x: target.x + dist * 0.72,
        y: target.y + dist * 0.38,
        z: target.z + dist * 0.52,
      },
      target,
    };
  }
  return {
    position: {
      x: target.x + dist * 0.42,
      y: target.y + dist * 0.68,
      z: target.z + dist * 0.78,
    },
    target,
  };
}
