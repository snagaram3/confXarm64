import { LATE_SESSION_ID, wayfinding } from "./catalog";

export type MapTargetKind = "booth" | "room" | "space" | "connector" | "session";

export interface MapTarget {
  kind: MapTargetKind;
  id: string;
  label: string;
  placed?: boolean;
}

export interface DestinationAdvice {
  playable: boolean;
  title: string;
  body: string;
}

const SAMPLE_WALK_IDS = new Set([
  wayfinding.destinationRoomId,
  "255",
  LATE_SESSION_ID,
  "ent-west-temple",
]);

/** Official 255 BC/EF pins are schedule rooms, not the SAMPLE schematic polyline. */
export function isSample255Destination(id: string | null | undefined): boolean {
  if (!id) return false;
  return SAMPLE_WALK_IDS.has(id);
}

export function destinationAdvice(target: MapTarget): DestinationAdvice {
  if (target.kind === "connector") {
    return {
      playable: false,
      title: "Not a walkable destination",
      body: "This is an official printed label on venue.pdf, not a surveyed machine. amenities.json has coordinates: null. No indoor route is attached.",
    };
  }
  if (target.kind === "booth") {
    return {
      playable: false,
      title: "No verified indoor walk",
      body: `${target.label} is an image-relative PDF booth pin, not GPS. The only animated path is the SAMPLE walk to room 255 on the sample schematic — not a route to this booth.`,
    };
  }
  if (isSample255Destination(target.id)) {
    return {
      playable: true,
      title: "SAMPLE walk to 255",
      body: "This is the labeled SAMPLE schematic walk (West Temple → 255). Not indoor GPS, walking time, or a surveyed Salt Palace path.",
    };
  }
  if (target.placed === false) {
    return {
      playable: false,
      title: "No map pin for this destination",
      body: `${target.label} is in the official catalog but is not a verified pin on venue.pdf / expo.pdf. No indoor walk is attached.`,
    };
  }
  return {
    playable: false,
    title: "No verified indoor walk",
    body: `${target.label} is labeled from the official schedule or SAMPLE drawing. Block positions are not surveyed walking paths. The only animated path is the SAMPLE walk to room 255 — not a route to this selection.`,
  };
}
