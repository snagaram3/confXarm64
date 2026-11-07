import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Express, NextFunction, Request, Response } from "express";
import { fetchDash0 } from "./tools/dash0.ts";
import { fetchElasticsearch } from "./tools/elasticsearch.ts";
import { geocodeVenueStreet, lookupCoords, parseCoords, radarStatus } from "./tools/radar.ts";
import { fetchSonar } from "./tools/sonar.ts";
import { liveEngagementUnavailable, syntheticEngagement } from "./tools/synthetic-engagement.ts";
import { maybeStartSyntheticMetrics } from "./tools/synthetic-otel.ts";

const BANNED = new Set(["url", "endpoint", "host", "hostname", "token", "authorization", "baseurl", "base_url"]);

export const syntheticOtel = maybeStartSyntheticMetrics();

function rejectClientUpstream(req: Request, res: Response, next: NextFunction): void {
  const bag: Record<string, unknown> = { ...(req.query as Record<string, unknown>) };
  if (req.body && typeof req.body === "object") Object.assign(bag, req.body as Record<string, unknown>);
  for (const key of Object.keys(bag)) {
    if (BANNED.has(key.toLowerCase())) {
      res.status(400).json({
        error: "Client-supplied upstream URLs, hosts, and credentials are rejected. Floorwise uses server env only.",
      });
      return;
    }
  }
  next();
}

export function mountToolRoutes(app: Express): void {
  app.use("/api/tools", rejectClientUpstream);

  app.get("/api/tools", async (_req, res) => {
    const [sonar, dash0, radar, elasticsearch] = await Promise.all([
      fetchSonar(),
      fetchDash0(),
      Promise.resolve(radarStatus()),
      fetchElasticsearch(),
    ]);
    res.json({ sonar, dash0, radar, elasticsearch, access: accessNote() });
  });

  app.get("/api/tools/sonar", async (_req, res) => {
    res.json(await fetchSonar());
  });
  app.get("/api/tools/dash0", async (_req, res) => {
    const snap = await fetchDash0();
    res.json({ ...snap, syntheticOtel, engagement: { live: liveEngagementUnavailable(), syntheticPath: "/api/tools/dash0/engagement" } });
  });
  app.get("/api/tools/radar", (_req, res) => {
    res.json(radarStatus());
  });
  app.get("/api/tools/elasticsearch", async (_req, res) => {
    res.json(await fetchElasticsearch());
  });

  app.get("/api/tools/dash0/engagement", (req, res) => {
    const mode = String(req.query.mode ?? "synthetic");
    if (mode === "live") {
      res.json(liveEngagementUnavailable());
      return;
    }
    const topic = typeof req.query.topic === "string" ? req.query.topic : null;
    const sessionId = typeof req.query.session === "string" ? req.query.session : null;
    res.json(syntheticEngagement({ topic, sessionId }));
  });

  app.get("/api/tools/dash0/dashboard.json", (_req, res) => {
    const file = resolve(dirname(fileURLToPath(import.meta.url)), "../dash0/floorwise-synthetic-engagement.json");
    const body = readFileSync(file, "utf8");
    res.type("application/json").send(body);
  });

  app.post("/api/tools/radar/lookup", async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      consent?: unknown;
      action?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      accuracyM?: unknown;
    };
    if (body.consent !== true) {
      res.status(400).json({
        error: "Consent is required. Floorwise does not locate you just by opening Radar.",
      });
      return;
    }
    if (body.action === "geocode_venue") {
      res.json(await geocodeVenueStreet());
      return;
    }
    const coords = parseCoords(body.latitude, body.longitude);
    if (!coords) {
      res.status(400).json({ error: "Valid latitude and longitude are required." });
      return;
    }
    const accuracy =
      typeof body.accuracyM === "number" && Number.isFinite(body.accuracyM) ? body.accuracyM : null;
    res.json(await lookupCoords(coords.latitude, coords.longitude, accuracy));
  });
}

function accessNote() {
  return {
    boundary:
      "Companion API on this Floorwise process. Credentials come only from gitignored .env. Hosts are allowlisted (Dash0 API regions, api.radar.io). Sonar and Elasticsearch queries are scoped to SONAR_PROJECT_KEY / ELASTICSEARCH_INDEX. Clients cannot supply upstream URLs. Radar lookup requires consent:true. No lead PII is included.",
  };
}
