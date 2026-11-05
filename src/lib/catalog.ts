import catalogJson from "@/data/catalog.json" with { type: "json" };
import venueJson from "@/data/venue.json" with { type: "json" };
import wayfindingJson from "@/data/wayfinding.json" with { type: "json" };
import type { Catalog, Session, Space, Venue, WayfindingRoute } from "./types";

export const catalog = catalogJson as Catalog;
export const venue = venueJson as unknown as Venue;
export const wayfinding = wayfindingJson as unknown as WayfindingRoute;

export const LATE_SESSION_ID = "ebpf-obs";
export const FEATURED_BOOTH_ID = "elastic";

export function spaceById(id: string): Space | undefined {
  return venue.spaces.find((s) => s.id === id);
}

export function sessionById(id: string): Session | undefined {
  return catalog.sessions.find((s) => s.id === id);
}

export function sessionsInRoom(roomId: string): Session[] {
  return catalog.sessions.filter((s) => s.roomId === roomId);
}
