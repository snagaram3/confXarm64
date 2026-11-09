import {
  allowlistedCloudEsUrl,
  cloudAssistState,
  cloudRankMetaBase,
  elasticCloudApiKey,
  elasticCloudConfigured,
  elasticCloudPublicConfig,
  type CloudRankMeta,
} from "./elastic-cloud.ts";
import { redactError } from "./tools/redact.ts";

const TIMEOUT_MS = 8_000;
const RERANK_LIMIT = 20;

export type CloudRequestFn = (opts: {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}) => Promise<unknown>;

export type CloudSemanticHit = {
  id: string;
  score: number;
  body: string;
};

/** Minimal hit shape for Jina rerank. Keep this here so jina.ts does not import RankHit from search.ts. */
export type JinaRerankableHit = {
  id: string;
  rerankText?: string;
  explanation: {
    matchedQueries: string[];
    why: string;
  };
};

function asNumberVector(value: unknown): number[] | null {
  if (Array.isArray(value) && value.length > 0 && value.every((n) => typeof n === "number")) {
    return value as number[];
  }
  if (value && typeof value === "object") {
    const nested = (value as { values?: unknown }).values;
    if (Array.isArray(nested) && nested.length > 0 && nested.every((n) => typeof n === "number")) {
      return nested as number[];
    }
  }
  return null;
}

export function parseEmbeddingResponse(json: unknown): number[] | null {
  if (!json || typeof json !== "object") return null;
  const body = json as {
    text_embedding?: Array<{ embedding?: unknown }>;
    inference_results?: Array<{ predicted_value?: unknown }>;
    embeddings?: unknown;
  };
  const candidates = [
    body.text_embedding?.[0]?.embedding,
    body.inference_results?.[0]?.predicted_value,
    Array.isArray(body.embeddings) ? body.embeddings[0] : body.embeddings,
  ];
  for (const value of candidates) {
    const vec = asNumberVector(value);
    if (vec) return vec;
  }
  return null;
}

type RerankRow = {
  index?: unknown;
  relevance_score?: unknown;
  score?: unknown;
  predicted_value?: unknown;
};

export function parseRerankResponse(json: unknown): Array<{ index: number; relevance_score: number }> {
  if (!json || typeof json !== "object") return [];
  const body = json as {
    rerank?: RerankRow[];
    inference_results?: RerankRow[];
  };
  const rows = body.rerank ?? body.inference_results ?? [];
  const out: Array<{ index: number; relevance_score: number }> = [];
  for (const row of rows) {
    const index = typeof row.index === "number" ? row.index : Number(row.index);
    const scoreRaw =
      typeof row.relevance_score === "number"
        ? row.relevance_score
        : typeof row.score === "number"
          ? row.score
          : typeof row.predicted_value === "number"
            ? row.predicted_value
            : NaN;
    if (!Number.isInteger(index) || !Number.isFinite(scoreRaw)) continue;
    out.push({ index, relevance_score: scoreRaw });
  }
  return out;
}

function semanticBody(source: { body?: unknown; title?: unknown } | undefined): string {
  const body = source?.body;
  if (typeof body === "string") return body;
  if (body && typeof body === "object" && typeof (body as { text?: unknown }).text === "string") {
    return (body as { text: string }).text;
  }
  if (typeof source?.title === "string") return source.title;
  return "";
}

export function parseSemanticHits(json: unknown): CloudSemanticHit[] {
  if (!json || typeof json !== "object") return [];
  const hits = (json as { hits?: { hits?: unknown[] } }).hits?.hits;
  if (!Array.isArray(hits)) return [];
  const out: CloudSemanticHit[] = [];
  for (const raw of hits) {
    if (!raw || typeof raw !== "object") continue;
    const hit = raw as { _id?: unknown; _score?: unknown; _source?: { body?: unknown; title?: unknown } };
    const id = typeof hit._id === "string" ? hit._id : "";
    if (!id) continue;
    out.push({
      id,
      score: typeof hit._score === "number" ? hit._score : 0,
      body: semanticBody(hit._source).slice(0, 280),
    });
  }
  return out;
}

/** Reorder hits from an inference rerank response. Original Must/Maybe scores stay on each hit. */
export function applyRerankOrder<T>(hits: T[], order: Array<{ index: number; relevance_score: number }>): T[] {
  if (!hits.length || !order.length) return hits;
  const ranked = [...order].sort((a, b) => b.relevance_score - a.relevance_score);
  const out: T[] = [];
  const seen = new Set<number>();
  for (const item of ranked) {
    if (!Number.isInteger(item.index) || item.index < 0 || item.index >= hits.length) continue;
    if (seen.has(item.index)) continue;
    seen.add(item.index);
    const hit = hits[item.index];
    if (hit !== undefined) out.push(hit);
  }
  for (let i = 0; i < hits.length; i++) {
    if (!seen.has(i) && hits[i] !== undefined) out.push(hits[i] as T);
  }
  return out;
}

export function annotateJinaRerank<T extends JinaRerankableHit>(hits: T[]): T[] {
  return hits.map((hit) => ({
    ...hit,
    explanation: {
      ...hit.explanation,
      matchedQueries: hit.explanation.matchedQueries.includes("jina_rerank")
        ? hit.explanation.matchedQueries
        : [...hit.explanation.matchedQueries, "jina_rerank"],
      why: hit.explanation.why.includes("Jina rerank")
        ? hit.explanation.why
        : `${hit.explanation.why} · Jina rerank (confxarm64-jina-rerank)`,
    },
  }));
}

export function jinaAssistQuery(textQuery: string, interests: string[]): string {
  return [textQuery, ...interests]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

export async function defaultCloudRequest(opts: {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  env?: NodeJS.ProcessEnv;
}): Promise<unknown> {
  const env = opts.env ?? process.env;
  const node = allowlistedCloudEsUrl(env);
  const apiKey = elasticCloudApiKey(env);
  if (!node || !apiKey) {
    throw new Error("Elastic Cloud is not configured");
  }
  const res = await fetch(`${node}${opts.path}`, {
    method: opts.method,
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      "content-type": "application/json",
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text().catch(() => "");
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = null;
    }
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("Elastic Cloud API key was rejected");
  }
  if (!res.ok) {
    throw new Error(`Elastic Cloud HTTP ${res.status}`);
  }
  return parsed;
}

async function embedQuery(
  query: string,
  inferenceId: string,
  expectedDims: number,
  request: CloudRequestFn,
): Promise<number[]> {
  const embeddingJson = await request({
    method: "POST",
    path: `/_inference/text_embedding/${encodeURIComponent(inferenceId)}`,
    body: { input: query },
  });
  const embedding = parseEmbeddingResponse(embeddingJson);
  if (!embedding) {
    throw new Error("Jina embedding response had no vector");
  }
  if (embedding.length !== expectedDims) {
    throw new Error(`Jina embedding dim ${embedding.length} (expected ${expectedDims})`);
  }
  return embedding;
}

async function semanticSearch(
  query: string,
  demoIndex: string,
  semanticField: string,
  request: CloudRequestFn,
): Promise<CloudSemanticHit[]> {
  const searchJson = await request({
    method: "POST",
    path: `/${encodeURIComponent(demoIndex)}/_search`,
    body: {
      size: 5,
      query: {
        semantic: {
          field: semanticField,
          query,
        },
      },
    },
  });
  return parseSemanticHits(searchJson);
}

async function rerankHits<T extends JinaRerankableHit>(
  hits: T[],
  query: string,
  inferenceId: string,
  request: CloudRequestFn,
): Promise<{ hits: T[]; used: boolean }> {
  const slice = hits.slice(0, RERANK_LIMIT);
  const input = slice.map((hit) => (hit.rerankText ?? hit.id).slice(0, 2000));
  if (!input.length) return { hits, used: false };
  const json = await request({
    method: "POST",
    path: `/_inference/rerank/${encodeURIComponent(inferenceId)}`,
    body: { query, input },
  });
  const order = parseRerankResponse(json);
  if (!order.length) return { hits, used: false };
  const rerankedHead = applyRerankOrder(slice, order);
  const next = hits.length > slice.length ? [...rerankedHead, ...hits.slice(RERANK_LIMIT)] : rerankedHead;
  return { hits: annotateJinaRerank(next), used: true };
}

export async function applyJinaAssist<T extends JinaRerankableHit>(opts: {
  query: string;
  sessionHits: T[];
  boothHits: T[];
  request?: CloudRequestFn;
  env?: NodeJS.ProcessEnv;
}): Promise<{ sessionHits: T[]; boothHits: T[]; cloud: CloudRankMeta; semanticHits: CloudSemanticHit[] }> {
  const env = opts.env ?? process.env;
  if (!elasticCloudConfigured(env) || !opts.query) {
    return {
      sessionHits: opts.sessionHits,
      boothHits: opts.boothHits,
      cloud: cloudRankMetaBase(env),
      semanticHits: [],
    };
  }

  const pub = elasticCloudPublicConfig(env);
  const request = opts.request ?? ((args) => defaultCloudRequest({ ...args, env }));
  const errors: string[] = [];

  const [embedSettled, searchSettled, sessionSettled, boothSettled] = await Promise.allSettled([
    embedQuery(opts.query, pub.embeddingsInferenceId, pub.embeddingsDims, request),
    semanticSearch(opts.query, pub.demoIndex, pub.demoSemanticField, request),
    rerankHits(opts.sessionHits, opts.query, pub.rerankInferenceId, request),
    rerankHits(opts.boothHits, opts.query, pub.rerankInferenceId, request),
  ]);

  let embeddingsUsed = false;
  if (embedSettled.status === "fulfilled") {
    embeddingsUsed = true;
  } else {
    errors.push(redactError(embedSettled.reason));
  }

  let semanticHits: CloudSemanticHit[] = [];
  if (searchSettled.status === "fulfilled") {
    semanticHits = searchSettled.value;
  } else {
    errors.push(redactError(searchSettled.reason));
  }

  let sessionHits = opts.sessionHits;
  let boothHits = opts.boothHits;
  let rerankUsed = false;
  if (sessionSettled.status === "fulfilled") {
    sessionHits = sessionSettled.value.hits;
    rerankUsed = rerankUsed || sessionSettled.value.used;
  } else {
    errors.push(redactError(sessionSettled.reason));
  }
  if (boothSettled.status === "fulfilled") {
    boothHits = boothSettled.value.hits;
    rerankUsed = rerankUsed || boothSettled.value.used;
  } else {
    errors.push(redactError(boothSettled.reason));
  }

  const state = cloudAssistState({
    configured: true,
    embeddingsUsed,
    rerankUsed,
    demoHits: semanticHits.length,
  });
  return {
    sessionHits,
    boothHits,
    semanticHits,
    cloud: cloudRankMetaBase(env, {
      state,
      embeddingsUsed,
      rerankUsed,
      demoHits: semanticHits.length,
      error: state === "error" ? (errors[0] ?? "Jina Cloud assist failed.") : null,
    }),
  };
}

export async function probeJinaCloud(
  opts: {
    request?: CloudRequestFn;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<{
  cloud: CloudRankMeta;
  semanticHits: CloudSemanticHit[];
}> {
  const env = opts.env ?? process.env;
  if (!elasticCloudConfigured(env)) {
    return { cloud: cloudRankMetaBase(env), semanticHits: [] };
  }
  const result = await applyJinaAssist({
    query: "Jina embeddings",
    sessionHits: [],
    boothHits: [],
    request: opts.request,
    env,
  });
  return { cloud: result.cloud, semanticHits: result.semanticHits };
}
