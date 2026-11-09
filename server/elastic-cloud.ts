import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Public project facts. API keys never belong in this object. */
export const ELASTIC_CLOUD_DEFAULTS = {
  projectName: "confXarm64",
  projectId: "f141cd752dcf402aade777317073039e",
  projectAlias: "confxarm64-f141cd",
  region: "gcp-us-central1",
  elasticsearchUrl: "https://confxarm64-f141cd.es.us-central1.gcp.elastic.cloud",
  ingestUrl: "https://confxarm64-f141cd.ingest.us-central1.gcp.elastic.cloud",
  kibanaUrl: "https://confxarm64-f141cd.kb.us-central1.gcp.elastic.cloud",
  mcpUrl: "https://confxarm64-f141cd.kb.us-central1.gcp.elastic.cloud/api/agent_builder/mcp",
  embeddingsInferenceId: "confxarm64-jina-embeddings",
  embeddingsModel: "jina-embeddings-v5-text-small",
  embeddingsDims: 1024,
  embeddingsSimilarity: "cosine" as const,
  rerankInferenceId: "confxarm64-jina-rerank",
  rerankModel: "jina-reranker-v3.5",
  demoIndex: "confxarm64-jina-demo",
  demoSemanticField: "body",
};

const ALLOWED_ES_HOSTS = new Set(["confxarm64-f141cd.es.us-central1.gcp.elastic.cloud"]);
const ALLOWED_KB_HOSTS = new Set(["confxarm64-f141cd.kb.us-central1.gcp.elastic.cloud"]);
const ALLOWED_INGEST_HOSTS = new Set(["confxarm64-f141cd.ingest.us-central1.gcp.elastic.cloud"]);
const BLOCKED_HOSTS = new Set(["169.254.169.254", "metadata.google.internal"]);

export const ELASTIC_CLOUD_API_KEY_ENV = "ELASTIC_CLOUD_API_KEY";

export type CloudToolState = "not_configured" | "ok" | "error" | "empty";

export type ElasticCloudPublicConfig = typeof ELASTIC_CLOUD_DEFAULTS;

export type CloudRankMeta = {
  state: CloudToolState;
  configured: boolean;
  missingEnv: string[];
  projectAlias: string;
  region: string;
  kibanaUrl: string;
  embeddings: {
    inferenceId: string;
    model: string;
    dims: number;
    similarity: "cosine";
    used: boolean;
  };
  rerank: {
    inferenceId: string;
    model: string;
    used: boolean;
  };
  demoIndex: {
    name: string;
    semanticField: string;
    hits: number;
  };
  error: string | null;
};

type CloudFile = {
  project?: { name?: string; id?: string; alias?: string; region?: string };
  endpoints?: { elasticsearch?: string; ingest?: string; kibana?: string; agentBuilderMcp?: string };
  inference?: {
    embeddings?: { id?: string; modelId?: string; dims?: number; similarity?: string };
    rerank?: { id?: string; modelId?: string };
  };
  demoIndex?: { name?: string; semanticField?: string };
};

function readCloudFile(): CloudFile | null {
  const file = resolve(root, "elastic/cloud.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as CloudFile;
  } catch {
    return null;
  }
}

function allowlistedHttpsUrl(
  raw: string | undefined,
  allowed: Set<string>,
  fallback: string,
  opts: { keepPath?: boolean } = {},
): string {
  const value = (raw ?? "").trim();
  if (!value) return fallback;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return fallback;
    if (url.username || url.password) return fallback;
    if (BLOCKED_HOSTS.has(url.hostname)) return fallback;
    if (!allowed.has(url.hostname)) return fallback;
    if (opts.keepPath) {
      const path = url.pathname.replace(/\/+$/, "");
      return `${url.origin}${path}`;
    }
    return url.origin;
  } catch {
    return fallback;
  }
}

/** Merge committed public facts with optional env overrides. Never reads the API key into URLs. */
export function elasticCloudPublicConfig(env: NodeJS.ProcessEnv = process.env): ElasticCloudPublicConfig {
  const file = readCloudFile();
  const fallback: ElasticCloudPublicConfig = {
    ...ELASTIC_CLOUD_DEFAULTS,
    projectName: file?.project?.name ?? ELASTIC_CLOUD_DEFAULTS.projectName,
    projectId: file?.project?.id ?? ELASTIC_CLOUD_DEFAULTS.projectId,
    projectAlias: file?.project?.alias ?? ELASTIC_CLOUD_DEFAULTS.projectAlias,
    region: file?.project?.region ?? ELASTIC_CLOUD_DEFAULTS.region,
    elasticsearchUrl: file?.endpoints?.elasticsearch ?? ELASTIC_CLOUD_DEFAULTS.elasticsearchUrl,
    ingestUrl: file?.endpoints?.ingest ?? ELASTIC_CLOUD_DEFAULTS.ingestUrl,
    kibanaUrl: file?.endpoints?.kibana ?? ELASTIC_CLOUD_DEFAULTS.kibanaUrl,
    mcpUrl: file?.endpoints?.agentBuilderMcp ?? ELASTIC_CLOUD_DEFAULTS.mcpUrl,
    embeddingsInferenceId: file?.inference?.embeddings?.id ?? ELASTIC_CLOUD_DEFAULTS.embeddingsInferenceId,
    embeddingsModel: file?.inference?.embeddings?.modelId ?? ELASTIC_CLOUD_DEFAULTS.embeddingsModel,
    embeddingsDims: file?.inference?.embeddings?.dims ?? ELASTIC_CLOUD_DEFAULTS.embeddingsDims,
    rerankInferenceId: file?.inference?.rerank?.id ?? ELASTIC_CLOUD_DEFAULTS.rerankInferenceId,
    rerankModel: file?.inference?.rerank?.modelId ?? ELASTIC_CLOUD_DEFAULTS.rerankModel,
    demoIndex: file?.demoIndex?.name ?? ELASTIC_CLOUD_DEFAULTS.demoIndex,
    demoSemanticField: file?.demoIndex?.semanticField ?? ELASTIC_CLOUD_DEFAULTS.demoSemanticField,
  };
  return {
    ...fallback,
    elasticsearchUrl: allowlistedHttpsUrl(
      env.ELASTIC_CLOUD_ELASTICSEARCH_URL,
      ALLOWED_ES_HOSTS,
      fallback.elasticsearchUrl,
    ),
    ingestUrl: allowlistedHttpsUrl(env.ELASTIC_CLOUD_INGEST_URL, ALLOWED_INGEST_HOSTS, fallback.ingestUrl),
    kibanaUrl: allowlistedHttpsUrl(env.ELASTIC_CLOUD_KIBANA_URL, ALLOWED_KB_HOSTS, fallback.kibanaUrl),
    mcpUrl: allowlistedHttpsUrl(env.ELASTIC_CLOUD_MCP_URL, ALLOWED_KB_HOSTS, fallback.mcpUrl, { keepPath: true }),
    projectAlias: (env.ELASTIC_CLOUD_PROJECT_ALIAS ?? fallback.projectAlias).trim() || fallback.projectAlias,
    projectId: (env.ELASTIC_CLOUD_PROJECT_ID ?? fallback.projectId).trim() || fallback.projectId,
    region: (env.ELASTIC_CLOUD_REGION ?? fallback.region).trim() || fallback.region,
    embeddingsInferenceId:
      (env.ELASTIC_CLOUD_EMBEDDINGS_INFERENCE_ID ?? fallback.embeddingsInferenceId).trim() ||
      fallback.embeddingsInferenceId,
    rerankInferenceId:
      (env.ELASTIC_CLOUD_RERANK_INFERENCE_ID ?? fallback.rerankInferenceId).trim() || fallback.rerankInferenceId,
    demoIndex: (env.ELASTIC_CLOUD_DEMO_INDEX ?? fallback.demoIndex).trim() || fallback.demoIndex,
  };
}

export function elasticCloudApiKey(env: NodeJS.ProcessEnv = process.env): string {
  return (env[ELASTIC_CLOUD_API_KEY_ENV] ?? "").trim();
}

export function elasticCloudMissingEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return elasticCloudApiKey(env) ? [] : [ELASTIC_CLOUD_API_KEY_ENV];
}

export function elasticCloudConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return elasticCloudMissingEnv(env).length === 0;
}

export function cloudRankMetaBase(
  env: NodeJS.ProcessEnv = process.env,
  extras: Partial<Pick<CloudRankMeta, "state" | "error">> & {
    embeddingsUsed?: boolean;
    rerankUsed?: boolean;
    demoHits?: number;
  } = {},
): CloudRankMeta {
  const pub = elasticCloudPublicConfig(env);
  const missing = elasticCloudMissingEnv(env);
  const configured = missing.length === 0;
  return {
    state: extras.state ?? (configured ? "ok" : "not_configured"),
    configured,
    missingEnv: missing,
    projectAlias: pub.projectAlias,
    region: pub.region,
    kibanaUrl: pub.kibanaUrl,
    embeddings: {
      inferenceId: pub.embeddingsInferenceId,
      model: pub.embeddingsModel,
      dims: pub.embeddingsDims,
      similarity: pub.embeddingsSimilarity,
      used: extras.embeddingsUsed ?? false,
    },
    rerank: {
      inferenceId: pub.rerankInferenceId,
      model: pub.rerankModel,
      used: extras.rerankUsed ?? false,
    },
    demoIndex: {
      name: pub.demoIndex,
      semanticField: pub.demoSemanticField,
      hits: extras.demoHits ?? 0,
    },
    error: extras.error ?? (configured ? null : `Needs setup. ${ELASTIC_CLOUD_API_KEY_ENV} is not set.`),
  };
}

export function elasticCloudHealth(env: NodeJS.ProcessEnv = process.env): {
  configured: boolean;
  state: CloudToolState;
  missingEnv: string[];
  projectAlias: string;
  region: string;
  kibanaUrl: string;
  embeddingsInferenceId: string;
  rerankInferenceId: string;
  demoIndex: string;
  notice: string;
} {
  const meta = cloudRankMetaBase(env);
  return {
    configured: meta.configured,
    state: meta.state,
    missingEnv: meta.missingEnv,
    projectAlias: meta.projectAlias,
    region: meta.region,
    kibanaUrl: meta.kibanaUrl,
    embeddingsInferenceId: meta.embeddings.inferenceId,
    rerankInferenceId: meta.rerank.inferenceId,
    demoIndex: meta.demoIndex.name,
    notice: meta.configured
      ? "Elastic Cloud Jina path is configured. In-cluster floorwise ranking still runs."
      : "Elastic Cloud Jina is disconnected until ELASTIC_CLOUD_API_KEY is set. In-cluster floorwise ranking still runs. No Jina hits are invented.",
  };
}

export function allowlistedCloudEsUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const url = elasticCloudPublicConfig(env).elasticsearchUrl;
  try {
    if (ALLOWED_ES_HOSTS.has(new URL(url).hostname)) return url;
  } catch {
    return null;
  }
  return null;
}

export function cloudAssistState(opts: {
  configured: boolean;
  embeddingsUsed: boolean;
  rerankUsed: boolean;
  demoHits: number;
}): CloudToolState {
  if (!opts.configured) return "not_configured";
  const succeeded = opts.embeddingsUsed || opts.rerankUsed || opts.demoHits > 0;
  if (!succeeded) return "error";
  if (opts.embeddingsUsed && opts.demoHits === 0 && !opts.rerankUsed) return "empty";
  return "ok";
}
