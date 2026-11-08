import type { MapSurface } from "./types";
import { sheetForFocus, type SchematicSheetId } from "./venue-schematic";

export type MapProjection = "flat" | "3d";

/** 200 South entrance on the official venue room list. */
export const SOUTH_ENTRANCE_ID = "87690";
/** Salt Palace Level 2 · East Registration (official room id). */
export const EAST_REGISTRATION_ID = "87691";

/** CrowdCompass simulated node ids → Floorwise official room ids. Schematic layout, not GPS. */
const ORIGIN_ALIASES: Record<string, string> = {
  "entrance-south": SOUTH_ENTRANCE_ID,
  "entrance_south": SOUTH_ENTRANCE_ID,
  south: SOUTH_ENTRANCE_ID,
  "200-south": SOUTH_ENTRANCE_ID,
  "200south": SOUTH_ENTRANCE_ID,
  [SOUTH_ENTRANCE_ID]: SOUTH_ENTRANCE_ID,
  "east-registration": EAST_REGISTRATION_ID,
  eastregistration: EAST_REGISTRATION_ID,
  l2: EAST_REGISTRATION_ID,
  "salt-l2": EAST_REGISTRATION_ID,
  "level-2": EAST_REGISTRATION_ID,
  level2: EAST_REGISTRATION_ID,
  [EAST_REGISTRATION_ID]: EAST_REGISTRATION_ID,
  "hall-de": "82947",
  "room-250-ac": "87421",
  "room-250-df": "87422",
  "room-251-ac": "87423",
  "room-251-df": "87424",
  "room-254": "87425",
  "room-255-bc": "82953",
  "room-255-ef": "82954",
};

export interface MapQuery {
  projection: MapProjection | null;
  surface: MapSurface | null;
  origin: string | null;
  destination: string | null;
  stepFree: boolean | null;
  mapPath: boolean;
}

export function parseMapQuery(search: string, pathname: string): MapQuery {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const view = params.get("view");
  const surfaceRaw = params.get("surface");
  const surface =
    surfaceRaw === "expo" || surfaceRaw === "venue" || surfaceRaw === "sample" ? surfaceRaw : null;
  const step = params.get("stepFree");
  const path = pathname.replace(/\/+$/, "") || "/";
  return {
    projection: view === "3d" ? "3d" : view === "2d" ? "flat" : null,
    surface,
    origin: params.get("origin"),
    destination: params.get("destination"),
    stepFree: step == null ? null : step !== "false",
    mapPath: path === "/map",
  };
}

export function resolveOriginRoomId(origin: string | null | undefined): string | null {
  if (!origin) return null;
  const key = origin.trim().toLowerCase();
  return ORIGIN_ALIASES[key] ?? ORIGIN_ALIASES[origin.trim()] ?? (/^\d+$/.test(origin.trim()) ? origin.trim() : null);
}

export function originSheet(roomId: string | null): SchematicSheetId | null {
  if (!roomId) return null;
  if (roomId === SOUTH_ENTRANCE_ID || roomId === "82947") return "salt-l1";
  if (
    roomId === EAST_REGISTRATION_ID ||
    roomId === "90804" ||
    roomId.startsWith("874") ||
    roomId === "82953" ||
    roomId === "82954"
  ) {
    return "salt-l2";
  }
  return sheetForFocus(roomId);
}

export function detectWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export const MAP_PROJECTION_KEY = "floorwise.mapProjection";

export function readStoredProjection(): MapProjection | null {
  try {
    const raw = localStorage.getItem(MAP_PROJECTION_KEY);
    if (raw === "flat" || raw === "3d") return raw;
  } catch {
    /* private mode */
  }
  return null;
}

export function initialMapProjection(input: {
  requested: MapProjection | null;
  reducedMotion: boolean;
  webgl: boolean;
  stored?: MapProjection | null;
}): { projection: MapProjection; notice: string | null } {
  if (input.reducedMotion) {
    return {
      projection: "flat",
      notice: "Reduced motion is on, so the flat map is open. You can switch to 3D. Selection stays the same.",
    };
  }
  if (!input.webgl) {
    return {
      projection: "flat",
      notice:
        input.requested === "3d" || input.requested == null
          ? "This browser has no WebGL, so the flat map is showing. Selection is unchanged."
          : null,
    };
  }
  if (input.requested === "flat") return { projection: "flat", notice: null };
  if (input.requested === "3d") return { projection: "3d", notice: null };
  if (input.stored === "flat") return { projection: "flat", notice: null };
  return { projection: "3d", notice: null };
}

export function resolveMapProjection(requested: MapProjection, webgl: boolean): { projection: MapProjection; error: string | null } {
  if (requested === "3d" && !webgl) {
    return {
      projection: "flat",
      error: "3D needs WebGL, which this browser does not have. The flat map is showing and your place is unchanged.",
    };
  }
  return { projection: requested, error: null };
}

export function roomIdToShareParam(id: string): string {
  if (id === SOUTH_ENTRANCE_ID) return "entrance-south";
  if (id === EAST_REGISTRATION_ID) return "east-registration";
  return id;
}

export function serializeMapSearch(input: {
  projection: MapProjection;
  surface: MapSurface;
  originId: string | null;
  destinationId?: string | null;
  stepFree: boolean;
}): string {
  const params = new URLSearchParams();
  if (input.originId) params.set("origin", roomIdToShareParam(input.originId));
  if (input.destinationId && input.destinationId !== input.originId) {
    params.set("destination", roomIdToShareParam(input.destinationId));
  }
  params.set("stepFree", String(input.stepFree));
  params.set("view", input.projection === "3d" ? "3d" : "2d");
  if (input.surface !== "venue") params.set("surface", input.surface);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function mapSharePath(pathname: string): "/map" | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/tools") || path.startsWith("/sponsor") || path.startsWith("/connect")) return null;
  if (path === "/map") return "/map";
  return null;
}

export interface MapBootstrap {
  projectionRequested: MapProjection | null;
  surface: MapSurface | null;
  originId: string | null;
  destinationId: string | null;
  focusId: string | null;
  sheet: SchematicSheetId | null;
  stepFree: boolean | null;
  openMap: boolean;
  shareActive: boolean;
}

/** Apply CrowdCompass-style /map query onto Floorwise rooms. No A* route is implied. */
export function bootstrapMapState(search: string, pathname: string): MapBootstrap {
  const q = parseMapQuery(search, pathname);
  const originId = resolveOriginRoomId(q.origin);
  const destinationId = resolveOriginRoomId(q.destination);
  const focusId = destinationId ?? originId;
  const shareActive = Boolean(q.mapPath || q.projection || q.origin || q.destination || q.stepFree != null || q.surface);
  return {
    projectionRequested: q.projection,
    surface: q.surface ?? (originId || destinationId || q.mapPath || q.projection ? "venue" : null),
    originId,
    destinationId,
    focusId,
    sheet: focusId ? originSheet(focusId) : null,
    stepFree: q.stepFree,
    openMap: Boolean(q.mapPath || q.projection != null || originId || destinationId || q.surface),
    shareActive,
  };
}
