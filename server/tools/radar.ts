import { publicToolUrl } from "./public-url.ts";
import { hostnameOnly } from "./redact.ts";

const VENUE_QUERY = "90 S West Temple, Salt Lake City, UT";
const APP_HOSTS = new Set(["confxarm64.cnh.radarhq.io"]);

export type RadarLookup = {
  at: string;
  source: "browser-geolocation" | "venue-street-address";
  accuracyM: number | null;
  latitude: number;
  longitude: number;
  addresses: Array<{ formatted: string; city: string | null; state: string | null }>;
  geofences: Array<{ id: string; description: string; tag: string | null; meters: number | null }>;
  notice: string;
};

export type RadarSnapshot = {
  tool: "radar";
  state: "not_configured" | "ok" | "error" | "empty";
  configured: boolean;
  fetchedAt: string | null;
  source: string;
  window: string | null;
  error: string | null;
  missingEnv: string[];
  publishableClass: string | null;
  secretConfigured: boolean;
  apiHost: string | null;
  venue: {
    label: string;
    note: string;
  };
  lookup: RadarLookup | null;
  skyhook: {
    uiUrl: string | null;
    note: string;
  };
};

function skyhookUiUrl(): string | null {
  const url = publicToolUrl(process.env.RADAR_UI_URL);
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (APP_HOSTS.has(host)) return null;
  } catch {
    return null;
  }
  return url;
}

export function radarMissingEnv(): string[] {
  return [];
}

export function radarStatus(): RadarSnapshot {
  const uiUrl = skyhookUiUrl();
  const missing = radarMissingEnv();
  return {
    tool: "radar",
    state: "not_configured",
    configured: false,
    fetchedAt: new Date().toISOString(),
    source: "confXarm64 Tools → Radar (Skyhook Radar Kubernetes UI only)",
    window: "this tab does not locate you and does not call a geofencing vendor",
    error:
      "Skyhook Radar is not callable from this app. Tools will not call api.radar.io (a different company) or invent geofences.",
    missingEnv: missing,
    publishableClass: null,
    secretConfigured: false,
    apiHost: uiUrl ? hostnameOnly(uiUrl) : null,
    venue: {
      label: VENUE_QUERY,
      note: "Expo/venue PDF pins are image-relative, not GPS. They are never sent as lat/lng.",
    },
    lookup: null,
    skyhook: {
      uiUrl,
      note: uiUrl
        ? "Link to a Skyhook Radar Kubernetes UI. This is not geofence data and not the live app URL."
        : "The live app URL (https://confxarm64.cnh.radarhq.io) is not a Radar control plane. This tab does not call api.radar.io and does not invent geofences.",
    },
  };
}

export function parseCoords(lat: unknown, lng: unknown): { latitude: number; longitude: number } | null {
  const latitude = typeof lat === "number" ? lat : Number(lat);
  const longitude = typeof lng === "number" ? lng : Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export async function lookupCoords(
  _lat: number,
  _lng: number,
  _accuracyM: number | null,
): Promise<RadarSnapshot> {
  return radarStatus();
}

export async function geocodeVenueStreet(): Promise<RadarSnapshot> {
  return radarStatus();
}
