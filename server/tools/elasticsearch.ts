import { es, INDEX, pingCluster } from "../es.ts";
import { hybridSearch } from "../search.ts";
import { localStatsSnapshot } from "./local-stats.ts";
import { redactError } from "./redact.ts";

export type EsSnapshot = {
  tool: "elasticsearch";
  state: "not_configured" | "ok" | "error" | "empty";
  configured: boolean;
  fetchedAt: string | null;
  source: string;
  window: string | null;
  error: string | null;
  missingEnv: string[];
  cluster: {
    name: string | null;
    version: string | null;
    status: string | null;
    nodes: number | null;
    ok: boolean;
  };
  index: {
    name: string;
    docs: number | null;
    storeBytes: number | null;
  };
  rank: ReturnType<typeof localStatsSnapshot>["lastRank"];
  sampleHits: Array<{ id: string; score: number; rank: string; why: string }>;
  tookMs: number | null;
  notice: string;
};

export async function fetchElasticsearch(): Promise<EsSnapshot> {
  const indexName = INDEX;
  const base: EsSnapshot = {
    tool: "elasticsearch",
    state: "ok",
    configured: true,
    fetchedAt: new Date().toISOString(),
    source: "confXarm64 Elasticsearch client (ELASTICSEARCH_URL, default host :19200)",
    window: "live cluster health + index stats + last hybrid rank",
    error: null,
    missingEnv: [],
    cluster: { name: null, version: null, status: null, nodes: null, ok: false },
    index: { name: indexName, docs: null, storeBytes: null },
    rank: localStatsSnapshot().lastRank,
    sampleHits: [],
    tookMs: null,
    notice:
      "This is the confXarm64 cluster only (index name floorwise). Do not point this app at an unrelated host :9200 cluster.",
  };

  try {
    const health = await pingCluster();
    base.cluster = {
      name: health.cluster,
      version: health.version,
      status: health.status,
      nodes: health.numberOfNodes,
      ok: health.ok,
    };
    if (!health.ok) {
      base.state = "error";
      base.error = `Cluster status ${health.status}`;
    }

    try {
      const stats = await es.indices.stats({ index: indexName }, { maxRetries: 0, requestTimeout: 5000 });
      const idx = stats.indices?.[indexName];
      base.index.docs = idx?.primaries?.docs?.count ?? stats._all?.primaries?.docs?.count ?? null;
      base.index.storeBytes = idx?.primaries?.store?.size_in_bytes ?? null;
    } catch {
      base.index.docs = null;
    }

    try {
      const sample = await hybridSearch({
        kind: "session",
        interests: ["observability", "OpenTelemetry", "eBPF"],
        role: "Staff Platform Engineer",
        q: "",
      });
      base.tookMs = sample.took;
      base.sampleHits = sample.hits.slice(0, 6).map((h) => ({
        id: h.id,
        score: h.explanation.score,
        rank: h.explanation.rank,
        why: h.explanation.why,
      }));
      if (base.sampleHits.length === 0 && health.ok) base.state = "empty";
    } catch (err) {
      if (base.state === "ok") {
        base.state = "error";
        base.error = redactError(err);
      }
    }

    return base;
  } catch (err) {
    base.state = "error";
    base.configured = true;
    base.error = redactError(err);
    return base;
  }
}
