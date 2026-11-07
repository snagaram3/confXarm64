import { otelStatus } from "../otel.ts";
import { fetchJson, ProviderHttpError, readCache, writeCache, type CacheEntry } from "./http.ts";
import { localStatsSnapshot } from "./local-stats.ts";
import { hostnameOnly, redactError } from "./redact.ts";

const cache = new Map<string, CacheEntry<Dash0Snapshot>>();
const TTL = 30_000;

const ALLOWED = new Set([
  "api.eu-west-1.aws.dash0.com",
  "api.eu-central-1.aws.dash0.com",
  "api.us-east-1.aws.dash0.com",
  "api.us-west-2.aws.dash0.com",
  "api.europe-west4.gcp.dash0.com",
]);

export type Dash0Snapshot = {
  tool: "dash0";
  state: "not_configured" | "ok" | "error" | "empty";
  configured: boolean;
  fetchedAt: string | null;
  source: string;
  window: string | null;
  error: string | null;
  missingEnv: string[];
  exporter: {
    configured: boolean;
    kind: string;
    ingestHost: string | null;
    serviceName: string;
    note: string;
  };
  local: ReturnType<typeof localStatsSnapshot>;
  remote: {
    queried: boolean;
    apiHost: string | null;
    dataset: string | null;
    spanCount: number | null;
    traces: Array<{ traceId: string; name: string; start: string | null }>;
    note: string;
  };
};

export function dash0ApiBase(): string | null {
  const raw = (process.env.DASH0_API_BASE_URL ?? "").replace(/\/$/, "");
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!ALLOWED.has(url.hostname)) return null;
  return url.origin;
}

export function parseDash0Spans(json: unknown): {
  spanCount: number;
  traces: Array<{ traceId: string; name: string; start: string | null }>;
} {
  const body = json as {
    resourceSpans?: Array<{
      scopeSpans?: Array<{
        spans?: Array<{ traceId?: string; name?: string; startTimeUnixNano?: string }>;
      }>;
    }>;
  };
  const traces: Array<{ traceId: string; name: string; start: string | null }> = [];
  let spanCount = 0;
  for (const rs of body.resourceSpans ?? []) {
    for (const ss of rs.scopeSpans ?? []) {
      for (const span of ss.spans ?? []) {
        spanCount += 1;
        if (traces.length < 8 && span.traceId) {
          traces.push({
            traceId: span.traceId,
            name: span.name ?? "span",
            start: span.startTimeUnixNano ?? null,
          });
        }
      }
    }
  }
  return { spanCount, traces };
}

export function dash0MissingQueryEnv(): string[] {
  const missing: string[] = [];
  if (!dash0ApiBase()) missing.push("DASH0_API_BASE_URL");
  if (!process.env.DASH0_AUTH_TOKEN) missing.push("DASH0_AUTH_TOKEN");
  return missing;
}

export async function fetchDash0(): Promise<Dash0Snapshot> {
  const queryMissing = dash0MissingQueryEnv();
  const exporterOn = otelStatus.enabled;
  const ingestHost = hostnameOnly(otelStatus.endpoint);
  const base: Dash0Snapshot = {
    tool: "dash0",
    state: queryMissing.length === 0 ? "ok" : exporterOn ? "empty" : "not_configured",
    configured: exporterOn || queryMissing.length === 0,
    fetchedAt: new Date().toISOString(),
    source: "Local OTel SDK + optional Dash0 Query API POST /api/spans",
    window: "remote spans: last 15 minutes; local counters since process start",
    error: null,
    missingEnv: queryMissing,
    exporter: {
      configured: exporterOn,
      kind: otelStatus.exporter,
      ingestHost,
      serviceName: otelStatus.serviceName,
      note: exporterOn
        ? "Export attempted from this process. That does not confirm Dash0 stored the spans."
        : "OTLP export is off. Set OTEL_EXPORTER_OTLP_ENDPOINT to a Dash0 ingest URL.",
    },
    local: localStatsSnapshot(),
    remote: {
      queried: false,
      apiHost: hostnameOnly(dash0ApiBase()),
      dataset: process.env.DASH0_DATASET ?? "default",
      spanCount: null,
      traces: [],
      note: queryMissing.length
        ? `Remote Dash0 query needs ${queryMissing.join(", ")}. Local stats are not remote results.`
        : "Querying Dash0 /api/spans for this service name.",
    },
  };

  if (queryMissing.length) {
    if (!exporterOn) {
      base.state = "not_configured";
      base.error = `Needs setup. Exporter: OTEL_EXPORTER_OTLP_ENDPOINT. Query: ${queryMissing.join(", ")}.`;
    }
    return base;
  }

  const cached = readCache(cache, "dash0", TTL);
  if (cached) return cached;

  const api = dash0ApiBase()!;
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${process.env.DASH0_AUTH_TOKEN}`,
      "Content-Type": "application/json",
      "Dash0-Dataset": process.env.DASH0_DATASET ?? "default",
    };
    const { status, json } = await fetchJson(`${api}/api/spans`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        timeRange: { from: "now-15m", to: "now" },
        filter: [{ key: "service.name", operator: "is", value: otelStatus.serviceName }],
        pagination: { limit: 20 },
      }),
    });
    if (status === 401 || status === 403) {
      throw new ProviderHttpError(status, "Dash0 query token was rejected");
    }
    if (status >= 400) {
      throw new ProviderHttpError(status, `Dash0 spans HTTP ${status}`);
    }
    const { spanCount, traces } = parseDash0Spans(json);
    base.remote = {
      queried: true,
      apiHost: hostnameOnly(api),
      dataset: process.env.DASH0_DATASET ?? "default",
      spanCount,
      traces,
      note:
        spanCount === 0
          ? "Dash0 answered; no spans for this service in the last 15 minutes. Export may still be in flight."
          : `Dash0 returned ${spanCount} span(s) for service ${otelStatus.serviceName}.`,
    };
    base.state = spanCount === 0 ? "empty" : "ok";
    return writeCache(cache, "dash0", base);
  } catch (err) {
    base.state = "error";
    base.error = redactError(err);
    base.remote.note = "Remote query failed. Local counters below are still only this process.";
    return base;
  }
}
