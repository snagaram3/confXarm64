import { fetchJson, ProviderHttpError, readCache, writeCache, type CacheEntry } from "./http.ts";
import { publicToolUrl } from "./public-url.ts";
import { hostnameOnly, redactError } from "./redact.ts";

const cache = new Map<string, CacheEntry<RadarSnapshot>>();
const TTL = 20_000;
const RADAR_API = "https://api.radar.io";
const VENUE_QUERY = "90 S West Temple, Salt Lake City, UT";

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
  apiHost: string;
  venue: {
    label: string;
    note: string;
  };
  lookup: RadarLookup | null;
  /** Skyhook Radar in-cluster UI. Independent of api.radar.io. */
  skyhook: {
    uiUrl: string | null;
    note: string;
  };
};

function keyClass(key: string | undefined, kind: "pk" | "sk"): string | null {
  if (!key) return null;
  const m = key.match(new RegExp(`^(prj_(?:live|test)_${kind})_`));
  return m ? m[1] : kind === "pk" ? "publishable" : "secret";
}

export function radarMissingEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.RADAR_SECRET_KEY && !process.env.RADAR_PUBLISHABLE_KEY) {
    missing.push("RADAR_SECRET_KEY");
    missing.push("RADAR_PUBLISHABLE_KEY");
  }
  return missing;
}

function radarAuth(): string | null {
  return process.env.RADAR_SECRET_KEY || process.env.RADAR_PUBLISHABLE_KEY || null;
}

export function radarStatus(): RadarSnapshot {
  const missing = radarMissingEnv();
  const pk = process.env.RADAR_PUBLISHABLE_KEY;
  const sk = process.env.RADAR_SECRET_KEY;
  return {
    tool: "radar",
    state: missing.length ? "not_configured" : "ok",
    configured: missing.length === 0,
    fetchedAt: new Date().toISOString(),
    source: "Radar HTTP API (api.radar.io) from Floorwise server",
    window: "on-demand lookup only — opening this tab does not locate you",
    error: missing.length ? `Needs setup. Set ${missing.join(" or ")} in gitignored .env.` : null,
    missingEnv: missing,
    publishableClass: keyClass(pk, "pk"),
    secretConfigured: Boolean(sk),
    apiHost: hostnameOnly(RADAR_API) ?? "api.radar.io",
    venue: {
      label: VENUE_QUERY,
      note: "Expo/venue PDF pins are image-relative, not GPS. Floorwise never sends those nx/ny values to Radar as lat/lng.",
    },
    lookup: cachedLookup(),
    skyhook: {
      uiUrl: publicToolUrl(process.env.RADAR_UI_URL),
      note: "Skyhook Radar Kubernetes UI (helm chart skyhook/radar). Not the api.radar.io geofence adapter below.",
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

async function reverseAndGeofences(lat: number, lng: number): Promise<Pick<RadarLookup, "addresses" | "geofences">> {
  const auth = radarAuth();
  if (!auth) throw new ProviderHttpError(503, "Radar key missing");
  const headers = { Authorization: auth };
  const coord = `${lat},${lng}`;
  const [rev, geo] = await Promise.all([
    fetchJson(`${RADAR_API}/v1/geocode/reverse?coordinates=${encodeURIComponent(coord)}`, { headers }),
    fetchJson(
      `${RADAR_API}/v1/search/geofences?near=${encodeURIComponent(coord)}&radius=2000&limit=8&includeGeometry=false`,
      { headers },
    ),
  ]);
  if (rev.status === 401 || geo.status === 401) {
    throw new ProviderHttpError(401, "Radar rejected the key");
  }
  if (rev.status >= 400) throw new ProviderHttpError(rev.status, `Radar reverse geocode HTTP ${rev.status}`);
  const revJson = rev.json as {
    addresses?: Array<{ formattedAddress?: string; city?: string; state?: string }>;
  };
  const geoJson = geo.status < 400
    ? (geo.json as {
        geofences?: Array<{ _id?: string; description?: string; tag?: string; geometryCenter?: unknown }>;
      })
    : { geofences: [] };
  return {
    addresses: (revJson.addresses ?? []).slice(0, 5).map((a) => ({
      formatted: a.formattedAddress ?? "unlabeled",
      city: a.city ?? null,
      state: a.state ?? null,
    })),
    geofences: (geoJson.geofences ?? []).slice(0, 8).map((g) => ({
      id: String(g._id ?? ""),
      description: g.description ?? "geofence",
      tag: g.tag ?? null,
      meters: null,
    })),
  };
}

export async function lookupCoords(
  lat: number,
  lng: number,
  accuracyM: number | null,
): Promise<RadarSnapshot> {
  const status = radarStatus();
  if (!status.configured) return status;
  try {
    const extra = await reverseAndGeofences(lat, lng);
    status.lookup = {
      at: new Date().toISOString(),
      source: "browser-geolocation",
      accuracyM,
      latitude: lat,
      longitude: lng,
      ...extra,
      notice:
        "This is outdoor GPS/Wi-Fi location from the browser, reverse-geocoded by Radar. It is not indoor wayfinding and not a PDF booth pin.",
    };
    status.state = extra.addresses.length || extra.geofences.length ? "ok" : "empty";
    return writeCache(cache, "lookup", status);
  } catch (err) {
    status.state = "error";
    status.error = redactError(err);
    return status;
  }
}

export async function geocodeVenueStreet(): Promise<RadarSnapshot> {
  const status = radarStatus();
  if (!status.configured) return status;
  const auth = radarAuth()!;
  try {
    const { status: httpStatus, json } = await fetchJson(
      `${RADAR_API}/v1/geocode/forward?query=${encodeURIComponent(VENUE_QUERY)}`,
      { headers: { Authorization: auth } },
    );
    if (httpStatus === 401) throw new ProviderHttpError(401, "Radar rejected the key");
    if (httpStatus >= 400) throw new ProviderHttpError(httpStatus, `Radar forward geocode HTTP ${httpStatus}`);
    const body = json as {
      addresses?: Array<{ latitude?: number; longitude?: number; formattedAddress?: string; city?: string; state?: string }>;
    };
    const first = body.addresses?.[0];
    if (first?.latitude == null || first.longitude == null) {
      status.state = "empty";
      status.error = "Radar returned no street-level coordinate for the published Salt Palace address.";
      return status;
    }
    const extra = await reverseAndGeofences(first.latitude, first.longitude);
    status.lookup = {
      at: new Date().toISOString(),
      source: "venue-street-address",
      accuracyM: null,
      latitude: first.latitude,
      longitude: first.longitude,
      addresses: extra.addresses.length
        ? extra.addresses
        : [
            {
              formatted: first.formattedAddress ?? VENUE_QUERY,
              city: first.city ?? null,
              state: first.state ?? null,
            },
          ],
      geofences: extra.geofences,
      notice:
        "Street-address geocode of the published Salt Palace address via Radar. Not an indoor map pin and not a claim of booth GPS.",
    };
    status.state = "ok";
    return writeCache(cache, "venue", status);
  } catch (err) {
    status.state = "error";
    status.error = redactError(err);
    return status;
  }
}

export function cachedLookup(): RadarLookup | null {
  return readCache(cache, "lookup", TTL)?.lookup ?? readCache(cache, "venue", TTL)?.lookup ?? null;
}
