import amenities from "../../official/amenities.json";

export interface AmenityRecord {
  id: string;
  name: string;
  building: string;
  level: number | null;
  location_label: string;
  source_id: string;
  coordinates: null;
  step_free_route_verified: boolean;
}

export const OFFICIAL_AMENITIES = amenities as AmenityRecord[];
