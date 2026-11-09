import type { AmenityRecord } from "./amenities-data";
import { OFFICIAL_AMENITIES } from "./amenities-data";

export type { AmenityRecord };

/** Official inclusion/accessibility rooms from amenities.json. Coordinates are null. */
export function inclusionAmenities(items: AmenityRecord[] = OFFICIAL_AMENITIES): AmenityRecord[] {
  return items.filter((item) => item.source_id === "attend-inclusion-accessibility");
}

export function amenityLabel(item: AmenityRecord): string {
  const level = item.level != null ? `L${item.level}` : "level unpublished";
  return `${item.name} · ${item.building} ${level} · ${item.location_label}`;
}

export const STEP_FREE_MAP_NOTICE =
  "This map is a schematic of official labels. It is not verified step-free or accessible navigation. Ask event staff at registration or an info desk for elevators and onsite help.";

export const STEP_FREE_MAP_NOTICE_SHORT =
  "Not verified step-free navigation. Ask staff at an info desk for elevators.";
