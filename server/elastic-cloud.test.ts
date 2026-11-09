import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  allowlistedCloudEsUrl,
  cloudAssistState,
  cloudRankMetaBase,
  ELASTIC_CLOUD_API_KEY_ENV,
  ELASTIC_CLOUD_DEFAULTS,
  elasticCloudConfigured,
  elasticCloudHealth,
  elasticCloudMissingEnv,
  elasticCloudPublicConfig,
} from "./elastic-cloud.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const emptyEnv = {} as NodeJS.ProcessEnv;

describe("elastic cloud public config", () => {
  it("exposes the verified Serverless project and named Jina inference ids", () => {
    const cfg = elasticCloudPublicConfig(emptyEnv);
    assert.equal(cfg.projectAlias, "confxarm64-f141cd");
    assert.equal(cfg.projectId, "f141cd752dcf402aade777317073039e");
    assert.equal(cfg.region, "gcp-us-central1");
    assert.equal(cfg.elasticsearchUrl, "https://confxarm64-f141cd.es.us-central1.gcp.elastic.cloud");
    assert.equal(cfg.ingestUrl, "https://confxarm64-f141cd.ingest.us-central1.gcp.elastic.cloud");
    assert.equal(cfg.kibanaUrl, "https://confxarm64-f141cd.kb.us-central1.gcp.elastic.cloud");
    assert.equal(cfg.mcpUrl, "https://confxarm64-f141cd.kb.us-central1.gcp.elastic.cloud/api/agent_builder/mcp");
    assert.equal(cfg.embeddingsInferenceId, "confxarm64-jina-embeddings");
    assert.equal(cfg.embeddingsModel, "jina-embeddings-v5-text-small");
    assert.equal(cfg.embeddingsDims, 1024);
    assert.equal(cfg.embeddingsSimilarity, "cosine");
    assert.equal(cfg.rerankInferenceId, "confxarm64-jina-rerank");
    assert.equal(cfg.rerankModel, "jina-reranker-v3.5");
    assert.equal(cfg.demoIndex, "confxarm64-jina-demo");
    assert.equal(cfg.demoSemanticField, "body");
  });

  it("does not treat Cloud as configured without the API key env name", () => {
    assert.equal(elasticCloudConfigured(emptyEnv), false);
    assert.deepEqual(elasticCloudMissingEnv(emptyEnv), [ELASTIC_CLOUD_API_KEY_ENV]);
    const health = elasticCloudHealth(emptyEnv);
    assert.equal(health.state, "not_configured");
    assert.equal(health.configured, false);
    assert.match(health.notice, /Needs setup|disconnected/i);
    assert.match(health.notice, /floorwise/);
    const meta = cloudRankMetaBase(emptyEnv);
    assert.equal(meta.state, "not_configured");
    assert.match(meta.error ?? "", /ELASTIC_CLOUD_API_KEY/);
  });

  it("ignores non-allowlisted Cloud URL overrides and keeps MCP path", () => {
    const cfg = elasticCloudPublicConfig({
      ELASTIC_CLOUD_ELASTICSEARCH_URL: "https://evil.example",
      ELASTIC_CLOUD_KIBANA_URL: "http://confxarm64-f141cd.kb.us-central1.gcp.elastic.cloud",
      ELASTIC_CLOUD_MCP_URL: "https://confxarm64-f141cd.kb.us-central1.gcp.elastic.cloud/api/agent_builder/mcp/",
    });
    assert.equal(cfg.elasticsearchUrl, ELASTIC_CLOUD_DEFAULTS.elasticsearchUrl);
    assert.equal(cfg.kibanaUrl, ELASTIC_CLOUD_DEFAULTS.kibanaUrl);
    assert.equal(cfg.mcpUrl, ELASTIC_CLOUD_DEFAULTS.mcpUrl);
    assert.equal(allowlistedCloudEsUrl(emptyEnv), ELASTIC_CLOUD_DEFAULTS.elasticsearchUrl);
  });

  it("committed cloud.json has public facts and no secret-like keys", () => {
    const raw = readFileSync(resolve(root, "elastic/cloud.json"), "utf8");
    const json = JSON.parse(raw) as {
      endpoints: { elasticsearch: string };
      inference: { embeddings: { id: string } };
    };
    assert.equal(json.endpoints.elasticsearch, ELASTIC_CLOUD_DEFAULTS.elasticsearchUrl);
    assert.equal(json.inference.embeddings.id, "confxarm64-jina-embeddings");
    assert.equal(
      JSON.stringify(json).includes('"apiKey"') || JSON.stringify(json).includes('"password"'),
      false,
    );
    assert.doesNotMatch(raw, /Bearer |Authorization:|sk-[A-Za-z0-9]|rhc_|AKIA/);
    const workflow = readFileSync(
      resolve(root, "elastic/workflows/confxarm64-jina-semantic-search.yaml"),
      "utf8",
    );
    assert.match(workflow, /index: "confxarm64-jina-demo"/);
    assert.match(workflow, /field: body/);
    assert.doesNotMatch(workflow, /Bearer |Authorization:|sk-[A-Za-z0-9]|rhc_|AKIA/);
  });
});

describe("cloudAssistState", () => {
  it("keeps embeddings, semantic hits, and rerank independent", () => {
    assert.equal(
      cloudAssistState({ configured: false, embeddingsUsed: false, rerankUsed: false, demoHits: 0 }),
      "not_configured",
    );
    assert.equal(
      cloudAssistState({ configured: true, embeddingsUsed: false, rerankUsed: false, demoHits: 0 }),
      "error",
    );
    assert.equal(
      cloudAssistState({ configured: true, embeddingsUsed: true, rerankUsed: false, demoHits: 0 }),
      "empty",
    );
    assert.equal(
      cloudAssistState({ configured: true, embeddingsUsed: false, rerankUsed: false, demoHits: 2 }),
      "ok",
    );
    assert.equal(
      cloudAssistState({ configured: true, embeddingsUsed: false, rerankUsed: true, demoHits: 0 }),
      "ok",
    );
  });
});
