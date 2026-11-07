import roomAnchorsJson from "@/data/room-anchors.json" with { type: "json" };

/** Illustrative sheet ids. Not surveyed floors and not GPS. */
export type SchematicSheetId = "salt-l1" | "salt-l2" | "hyatt";

export type SchematicKind = "room" | "hall" | "entrance" | "lobby" | "showcase";

export type Rect = { x: number; y: number; w: number; h: number };

export interface RoomAnchorLite {
  id: string;
  label: string;
  building: string | null;
  level: number | null;
  placed: boolean;
  nx?: number;
  ny?: number;
  reason?: string;
  roomOrArea?: string;
  isOffsite?: boolean;
  isTbd?: boolean;
}

export interface SchematicRoom {
  id: string;
  sheet: SchematicSheetId;
  kind: SchematicKind;
  labelLines: string[];
  roomOrArea: string;
  building: string | null;
  level: number | null;
  placedOnOfficial: boolean;
  unplacedReason?: string;
  rect: Rect;
}

export interface SchematicSheet {
  id: SchematicSheetId;
  title: string;
  subtitle: string;
  building: string;
  corridors: Rect[];
  zones: Array<{ rect: Rect; label: string }>;
}

export interface SchematicPortal {
  sheet: SchematicSheetId;
  toSheet: SchematicSheetId;
  point: { x: number; y: number };
  direction: "east" | "west";
  label: string;
}

export const SCHEMATIC_DISCLAIMER =
  "Illustrative schematic — not to scale. Room names and floor assignments come from the official schedule. Block positions are a readable layout, not surveyed coordinates, indoor GPS, or walking distances.";

export const SCHEMATIC_FRAME: Rect = { x: 0, y: 0, w: 1180, h: 640 };

export const SHEETS: SchematicSheet[] = [
  {
    id: "salt-l1",
    title: "Salt Palace L1",
    subtitle: "Ballrooms, Hall DE, 151, showcase labels",
    building: "Salt Palace",
    corridors: [
      { x: 72, y: 292, w: 1020, h: 40 },
      { x: 72, y: 292, w: 40, h: 168 },
    ],
    zones: [{ rect: { x: 96, y: 86, w: 520, h: 188 }, label: "Showcase labels · booths on Expo map" }],
  },
  {
    id: "salt-l2",
    title: "Salt Palace L2",
    subtitle: "Breakouts 250–255 · mezzanine",
    building: "Salt Palace",
    corridors: [
      { x: 72, y: 292, w: 1020, h: 40 },
      { x: 72, y: 180, w: 40, h: 230 },
    ],
    zones: [],
  },
  {
    id: "hyatt",
    title: "Hyatt",
    subtitle: "Official levels 2–5 grouped on one sheet · not stacked to scale",
    building: "Hyatt Regency",
    corridors: [{ x: 96, y: 292, w: 980, h: 40 }],
    zones: [],
  },
];

export const PORTALS: SchematicPortal[] = [
  { sheet: "salt-l1", toSheet: "salt-l2", point: { x: 1088, y: 312 }, direction: "east", label: "L2 schematic" },
  { sheet: "salt-l2", toSheet: "salt-l1", point: { x: 92, y: 312 }, direction: "west", label: "L1 schematic" },
  { sheet: "salt-l2", toSheet: "hyatt", point: { x: 1088, y: 312 }, direction: "east", label: "Hyatt schematic" },
  { sheet: "hyatt", toSheet: "salt-l2", point: { x: 92, y: 312 }, direction: "west", label: "Salt Palace" },
];

const SHOWCASE_RE = /cosmic|pavilion|demo theater|network nook|starlight|halls a-c/i;
const ENTRANCE_RE = /entrance/i;
const LOBBY_RE = /foyer|lobby|mezzanine|registration/i;
const HALL_RE = /^hall(\s|$)/i;

const rawRooms = (roomAnchorsJson as { rooms: RoomAnchorLite[] }).rooms;

export function sheetForRoom(room: RoomAnchorLite): SchematicSheetId | "unmapped" {
  if (room.isOffsite || room.isTbd) return "unmapped";
  const area = `${room.roomOrArea ?? ""} ${room.label}`;
  if (/off-site|room tbd/i.test(area) && !room.building) return "unmapped";
  if (room.building === "Hyatt Regency" || /hyatt/i.test(room.label)) return "hyatt";
  if (room.building === "Salt Palace") {
    if (room.level === 2) return "salt-l2";
    return "salt-l1";
  }
  if (/hyatt/i.test(area)) return "hyatt";
  return "unmapped";
}

export function kindForRoom(room: RoomAnchorLite): SchematicKind {
  const name = room.roomOrArea ?? room.label;
  if (SHOWCASE_RE.test(name) || SHOWCASE_RE.test(room.label)) return "showcase";
  if (ENTRANCE_RE.test(name) || ENTRANCE_RE.test(room.label)) return "entrance";
  if (LOBBY_RE.test(name) || LOBBY_RE.test(room.label)) return "lobby";
  if (HALL_RE.test(name)) return "hall";
  return "room";
}

function labelLines(room: RoomAnchorLite): string[] {
  const name = (room.roomOrArea ?? room.label).trim();
  if (room.building === "Hyatt Regency" && room.level != null) {
    const wrapped = wrapLabel(name, 14);
    return wrapped[0] ? [`L${room.level} · ${wrapped[0]}`, ...wrapped.slice(1)] : [`L${room.level}`];
  }
  return wrapLabel(name, 16);
}

function wrapLabel(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const parts = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const part of parts) {
    const next = cur ? `${cur} ${part}` : part;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = part;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function sortKey(room: RoomAnchorLite): number {
  if (typeof room.nx === "number") return room.nx;
  return 0.92;
}

function placeRow(rooms: RoomAnchorLite[], y: number, startX: number, size: number, gap: number): SchematicRoom[] {
  let x = startX;
  return rooms.map((room) => {
    const wide = kindForRoom(room) === "hall" || (room.roomOrArea ?? "").length > 18;
    const w = Math.min(wide ? size + 36 : size, 168);
    const placed = toPlaced(room, { x, y, w, h: size });
    x += w + gap;
    return placed;
  });
}

function toPlaced(room: RoomAnchorLite, rect: Rect): SchematicRoom {
  const sheet = sheetForRoom(room);
  if (sheet === "unmapped") {
    throw new Error(`Cannot place unmapped room ${room.id}`);
  }
  return {
    id: room.id,
    sheet,
    kind: kindForRoom(room),
    labelLines: labelLines(room),
    roomOrArea: (room.roomOrArea ?? room.label).trim(),
    building: room.building,
    level: room.level,
    placedOnOfficial: Boolean(room.placed),
    unplacedReason: room.placed ? undefined : room.reason,
    rect,
  };
}

function layoutSheet(sheet: SchematicSheetId, rooms: RoomAnchorLite[]): SchematicRoom[] {
  const sorted = [...rooms].sort((a, b) => sortKey(a) - sortKey(b) || a.id.localeCompare(b.id));
  if (sheet === "salt-l1") {
    const showcase = sorted.filter((r) => kindForRoom(r) === "showcase");
    const rest = sorted.filter((r) => kindForRoom(r) !== "showcase");
    const north = rest.filter((r) => kindForRoom(r) === "lobby" || /ballroom/i.test(r.roomOrArea ?? r.label));
    const south = rest.filter((r) => !north.includes(r));
    const showPlaced = showcase.map((room, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return toPlaced(room, { x: 112 + col * 164, y: 102 + row * 78, w: 150, h: 68 });
    });
    const northTop = north.slice(0, Math.ceil(north.length / 2));
    const northBot = north.slice(Math.ceil(north.length / 2));
    return [
      ...showPlaced,
      ...placeRow(northTop, 102, 548, 92, 10),
      ...placeRow(northBot, 188, 548, 92, 10),
      ...placeRow(south, 360, 168, 110, 16),
    ];
  }
  if (sheet === "salt-l2") {
    const north = sorted.filter((r) => !/^255|east registration/i.test(r.roomOrArea ?? ""));
    const south = sorted.filter((r) => /^255|east registration/i.test(r.roomOrArea ?? ""));
    return [...placeRow(north, 118, 168, 110, 16), ...placeRow(south, 360, 168, 118, 16)];
  }
  const north = sorted.filter((r) => (r.level ?? 0) >= 4);
  const south = sorted.filter((r) => (r.level ?? 0) < 4);
  return [...placeRow(north, 118, 140, 118, 14), ...placeRow(south, 360, 140, 118, 14)];
}

export function unmappedRooms(rooms: RoomAnchorLite[] = rawRooms): RoomAnchorLite[] {
  return rooms.filter((room) => sheetForRoom(room) === "unmapped");
}

export function buildSchematic(rooms: RoomAnchorLite[] = rawRooms): {
  rooms: SchematicRoom[];
  unmapped: RoomAnchorLite[];
} {
  const grouped: Record<SchematicSheetId, RoomAnchorLite[]> = {
    "salt-l1": [],
    "salt-l2": [],
    hyatt: [],
  };
  const unmapped: RoomAnchorLite[] = [];
  for (const room of rooms) {
    const sheet = sheetForRoom(room);
    if (sheet === "unmapped") unmapped.push(room);
    else grouped[sheet].push(room);
  }
  return {
    rooms: [
      ...layoutSheet("salt-l1", grouped["salt-l1"]),
      ...layoutSheet("salt-l2", grouped["salt-l2"]),
      ...layoutSheet("hyatt", grouped.hyatt),
    ],
    unmapped,
  };
}

export function sheetById(id: SchematicSheetId): SchematicSheet {
  return SHEETS.find((sheet) => sheet.id === id) ?? SHEETS[0]!;
}

export function sheetForFocus(roomId: string | null | undefined, rooms: RoomAnchorLite[] = rawRooms): SchematicSheetId | null {
  if (!roomId) return null;
  const room = rooms.find((r) => r.id === roomId);
  if (!room) return null;
  const sheet = sheetForRoom(room);
  return sheet === "unmapped" ? null : sheet;
}

export function rectCenter(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

const built = buildSchematic();
export const SCHEMATIC_ROOMS = built.rooms;
export const SCHEMATIC_UNMAPPED = built.unmapped;
export const OFFICIAL_ROOM_ANCHORS = rawRooms;
