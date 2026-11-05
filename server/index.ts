import "./otel.ts";

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { pingCluster, waitForElasticsearch } from "./es.ts";
import { otelStatus } from "./otel.ts";
import { seedIndex } from "./seed.ts";
import { hybridSearch } from "./search.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "src/data/catalog.json"), "utf8")) as {
  sessions: Array<{ id: string }>;
  booths: Array<{ id: string; visitors: Array<{ id: string; metersAway: number }> }>;
};

const PORT = Number(process.env.PORT ?? 43181);
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

let indexReady = false;
let lastSeedError: string | null = null;

app.get("/api/health", async (_req, res) => {
  try {
    const esHealth = await pingCluster();
    res.json({
      ok: esHealth.ok && indexReady,
      elasticsearch: esHealth,
      otel: otelStatus,
      indexReady,
      lastSeedError,
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      otel: otelStatus,
      indexReady,
      lastSeedError,
    });
  }
});

app.post("/api/rank", async (req, res) => {
  if (!indexReady) {
    res.status(503).json({
      code: "es_not_ready",
      error: "Elasticsearch is still starting",
      hint: "The sample map still works. Retry shortly, or run docker compose up -d / npm run es.",
    });
    return;
  }
  try {
    const interests = asStringArray(req.body?.interests);
    const role = String(req.body?.role ?? "");
    const q = String(req.body?.q ?? "");
    const [sessions, booths] = await Promise.all([
      hybridSearch({ kind: "session", interests, role, q }),
      hybridSearch({ kind: "booth", interests, role, q }),
    ]);
    const sessionById = new Map(catalog.sessions.map((s) => [s.id, s]));
    const boothById = new Map(catalog.booths.map((b) => [b.id, b]));
    res.json({
      meta: {
        engine: "elasticsearch",
        mode: "hybrid-bm25-knn",
        tookMs: sessions.took + booths.took,
      },
      sessions: sessions.hits
        .map((hit) => {
          const item = sessionById.get(hit.id);
          if (!item) return null;
          return { item, ...hit.explanation };
        })
        .filter(Boolean),
      booths: booths.hits
        .map((hit) => {
          const item = boothById.get(hit.id);
          if (!item) return null;
          return { item, ...hit.explanation };
        })
        .filter(Boolean),
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : String(err),
      hint: "Start Elasticsearch with docker compose up -d, then retry.",
    });
  }
});

app.post("/api/sponsor/:boothId/visitors", async (req, res) => {
  if (!indexReady) {
    res.status(503).json({
      code: "es_not_ready",
      error: "Elasticsearch is still starting",
      hint: "Seeded booth visitors will appear after search is ready.",
    });
    return;
  }
  try {
    const booth = catalog.booths.find((b) => b.id === req.params.boothId);
    if (!booth) {
      res.status(404).json({ error: "Unknown booth" });
      return;
    }
    const result = await hybridSearch({
      kind: "visitor",
      boothId: booth.id,
      interests: booth.tags,
      role: "sponsor",
      q: booth.tags.join(" "),
    });
    const visitorById = new Map(booth.visitors.map((v) => [v.id, v]));
    res.json({
      meta: {
        engine: "elasticsearch",
        mode: "hybrid-bm25-knn",
        tookMs: result.took,
        boothId: booth.id,
      },
      visitors: result.hits
        .map((hit) => {
          const item = visitorById.get(hit.id);
          if (!item) return null;
          return { item, ...hit.explanation };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if (!a || !b) return 0;
          const order = { must: 0, maybe: 1, meh: 2 } as const;
          const diff = order[a.rank] - order[b.rank];
          if (diff !== 0) return diff;
          return a.item.metersAway - b.item.metersAway;
        }),
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

app.post("/api/otlp/v1/traces", async (req, res) => {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, "");
  if (!endpoint) {
    res.status(204).end();
    return;
  }
  const url = endpoint.endsWith("/v1/traces") ? endpoint : `${endpoint}/v1/traces`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  const raw = process.env.OTEL_EXPORTER_OTLP_HEADERS;
  if (raw) {
    for (const part of raw.split(",")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      headers[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }
  }
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(req.body),
    });
    res.status(upstream.status).end();
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

const dist = resolve(root, "dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(resolve(dist, "index.html"));
  });
}

async function ensureIndex() {
  if (indexReady) return;
  await waitForElasticsearch(20_000);
  const seeded = await seedIndex();
  indexReady = true;
  lastSeedError = null;
  console.log(`[floorwise] seeded ${seeded.documents} docs`);
  await hybridSearch({
    kind: "session",
    interests: ["Kubernetes", "observability", "eBPF"],
    role: "Staff Platform Engineer",
  });
}

async function boot() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[floorwise] API on http://127.0.0.1:${PORT}`);
  });
  while (!indexReady) {
    try {
      await ensureIndex();
    } catch (err) {
      lastSeedError = err instanceof Error ? err.message : String(err);
      console.error(`[floorwise] Elasticsearch not ready: ${lastSeedError}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

boot().catch((err) => {
  console.error(err);
  process.exit(1);
});

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}
