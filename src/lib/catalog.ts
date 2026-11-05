import boothAnchorsJson from "@/data/booth-anchors.json" with { type: "json" };
import catalogJson from "@/data/catalog.json" with { type: "json" };
import venueJson from "@/data/venue.json" with { type: "json" };
import wayfindingJson from "@/data/wayfinding.json" with { type: "json" };
import type { Booth, Catalog, Session, Space, Venue, WayfindingRoute } from "./types";

const raw = catalogJson as Catalog;
const anchors = boothAnchorsJson as {
  booths: Array<{
    id: string;
    placed: boolean;
    nx?: number;
    ny?: number;
    method?: string;
    boothNumber: string;
  }>;
};

export const catalog: Catalog = {
  ...raw,
  booths: raw.booths.map((booth) => {
    const pin = anchors.booths.find((a) => a.id === booth.id);
    return {
      ...booth,
      pinAvailable: Boolean(pin?.placed),
      pinNx: pin?.nx,
      pinNy: pin?.ny,
      pinMethod: pin?.method,
    } satisfies Booth;
  }),
};

export const venue = venueJson as unknown as Venue;
export const wayfinding = wayfindingJson as unknown as WayfindingRoute;
export const boothAnchors = anchors;

export const LATE_SESSION_ID = "ebpf-obs";
export const FEATURED_BOOTH_ID = "elastic";
export const OPENING_KEYNOTE_ID = "1302801";

export function spaceById(id: string): Space | undefined {
  return venue.spaces.find((s) => s.id === id);
}

export function sampleSessionById(id: string): Session | undefined {
  return catalog.sessions.find((s) => s.id === id);
}

export function sessionById(id: string): Session | undefined {
  return sampleSessionById(id);
}

export function sessionsInRoom(roomId: string): Session[] {
  return catalog.sessions.filter((s) => s.roomId === roomId);
}
