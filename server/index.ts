import "./load-env.ts";
import "./otel.ts";

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { es, INDEX, pingCluster, waitForElasticsearch } from "./es.ts";
import { noteRequest } from "./tools/local-stats.ts";
import { mountToolRoutes } from "./tools-http.ts";
import { mountLeadRoutes, sqlitePath } from "./leads-http.ts";
import { dataDir, LeadsStore } from "./leads-store.ts";
import { otelStatus } from "./otel.ts";
import { mountReminderRoutes } from "./reminders-http.ts";
import { ReminderStore, remindersPath } from "./reminders-store.ts";
import { seedIndex } from "./seed.ts";
import { askScheduleStatus, livenessBody, readinessOk, readinessStatusCode } from "./health.ts";
import { cloudRankMetaBase, elasticCloudConfigured, elasticCloudHealth } from "./elastic-cloud.ts";
import { applyJinaAssist, jinaAssistQuery } from "./jina.ts";
import { hybridSearch, parseQueryMode } from "./search.ts";
import { redactError } from "./tools/redact.ts";
import { parseTopicWeights } from "./search-query.ts";
import { mountScheduleRoutes } from "./schedule-http.ts";
import { scheduleMeta, sessionById as officialSessionById } from "./schedule.ts";
import { isAuthConfigured } from "./sponsor-auth.ts";
import { isPushConfigured } from "./vapid.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "src/data/catalog.json"), "utf8")) as {
  sessions: Array<{ id: string }>;
  booths: Array<{
    id: string;
    sponsor: string;
    tagline: string;
    boothNumber: string;
    logo: string | null;
    logoOnDark?: boolean;
    tags: string[];
    visitors: Array<{ id: string; metersAway: number }>;
  }>;
};
const leadDataDir = dataDir(root);
const leadStore = new LeadsStore(sqlitePath(leadDataDir));
const reminderStore = new ReminderStore(remindersPath(leadDataDir));

const PORT = Number(process.env.PORT ?? 43181);
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) noteRequest(res.statusCode, Date.now() - start);
  });
  next();
});

let indexReady = false;
let lastSeedError: string | null = null;

app.get("/api/live", (_req, res) => {
  res.json(livenessBody());
});

app.get("/api/health", async (_req, res) => {
  const payload = {
    otel: otelStatus,
    indexReady,
    lastSeedError,
    sponsorPortal: {
      configured: isAuthConfigured(leadDataDir),
      store: "sqlite",
    },
    schedule: scheduleMeta,
    reminders: {
      webPushConfigured: isPushConfigured(leadDataDir),
      store: "sqlite",
    },
    askSchedule: askScheduleStatus(),
    elasticCloud: elasticCloudHealth(),
  };
  try {
    const esHealth = await pingCluster();
    const ok = readinessOk(true, esHealth.ok, indexReady);
    res.status(readinessStatusCode(ok)).json({
      ok,
      elasticsearch: esHealth,
      ...payload,
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ...payload,
    });
  }
});

app.post("/api/rank", async (req, res) => {
  if (!indexReady) {
    res.status(503).json({
      code: "es_not_ready",
      error: "Elasticsearch is still starting",
      hint: "The sample map still works. Retry shortly, or run docker compose up -d elasticsearch (host :19200) / npm run es.",
    });
    return;
  }
  try {
    const interests = asStringArray(req.body?.interests);
    const role = String(req.body?.role ?? "");
    const q = String(req.body?.q ?? "");
    const mode = parseQueryMode(req.body?.mode);
    const track = String(req.body?.track ?? "").trim();
    const topicWeights = parseTopicWeights(req.body?.topicWeights);
    const [sessions, booths] = await Promise.all([
      hybridSearch({ kind: "session", interests, role, q, mode, track: track || undefined, topicWeights }),
      hybridSearch({ kind: "booth", interests, role, q, mode, topicWeights }),
    ]);
    let sessionHits = sessions.hits;
    let boothHits = booths.hits;
    let cloud = cloudRankMetaBase();
    try {
      const assisted = await applyJinaAssist({
        query: jinaAssistQuery(q, interests),
        sessionHits,
        boothHits,
      });
      sessionHits = assisted.sessionHits;
      boothHits = assisted.boothHits;
      cloud = assisted.cloud;
    } catch (err) {
      cloud = cloudRankMetaBase(process.env, {
        state: elasticCloudConfigured() ? "error" : "not_configured",
        error: redactError(err),
      });
    }
    const boothById = new Map(catalog.booths.map((b) => [b.id, b]));
    res.json({
      meta: {
        engine: "elasticsearch",
        mode: sessions.mode,
        queryMode: mode,
        retriever: sessions.retriever,
        tookMs: sessions.took + booths.took,
        cloud,
      },
      sessions: sessionHits
        .map((hit) => {
          const item = officialSessionById.get(hit.id);
          if (!item) return null;
          const { descriptionHtml: _omit, ...rest } = item;
          void _omit;
          return { item: rest, ...hit.explanation };
        })
        .filter(Boolean),
      booths: boothHits
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
      hint: "Start confXarm64 Elasticsearch with docker compose up -d elasticsearch (published on :19200), then retry. Do not use an unrelated cluster on :9200.",
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

mountScheduleRoutes(app);
mountReminderRoutes(app, { store: reminderStore, dataDir: leadDataDir });
mountToolRoutes(app);

mountLeadRoutes(app, {
  store: leadStore,
  dataDir: leadDataDir,
  booths: catalog.booths,
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
  await waitForElasticsearch();
  const exists = await es.indices.exists({ index: INDEX });
  const skip = process.env.FLOORWISE_SKIP_SEED === "1";
  const force = process.env.FLOORWISE_FORCE_SEED === "1";
  if (exists && !force) {
    indexReady = true;
    lastSeedError = null;
    console.log(`[confxarm64] using existing ${INDEX} index (will not reseed)`);
    return;
  }
  if (skip) {
    throw new Error(`FLOORWISE_SKIP_SEED=1 and index ${INDEX} is missing — wait for the seed Job`);
  }
  const seeded = await seedIndex();
  indexReady = true;
  lastSeedError = null;
  console.log(`[confxarm64] seeded ${seeded.documents} docs`);
  await hybridSearch({
    kind: "session",
    interests: ["Kubernetes", "observability", "eBPF"],
    role: "Staff Platform Engineer",
  });
}

async function boot() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[confxarm64] API on http://127.0.0.1:${PORT}`);
  });
  while (!indexReady) {
    try {
      await ensureIndex();
    } catch (err) {
      lastSeedError = err instanceof Error ? err.message : String(err);
      console.error(`[confxarm64] Elasticsearch not ready: ${lastSeedError}`);
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

