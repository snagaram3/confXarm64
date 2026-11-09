import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cloudRankMetaBase } from "../elastic-cloud.ts";
import { cloudToolFields } from "./elasticsearch.ts";

describe("elasticsearch tools cloud slice", () => {
  it("shows needs-setup for Elastic Cloud without inventing Jina hits", () => {
    const env = {} as NodeJS.ProcessEnv;
    const slice = cloudToolFields(cloudRankMetaBase(env), [], env);
    assert.equal(slice.state, "not_configured");
    assert.equal(slice.configured, false);
    assert.deepEqual(slice.missingEnv, ["ELASTIC_CLOUD_API_KEY"]);
    assert.equal(slice.embeddings.inferenceId, "confxarm64-jina-embeddings");
    assert.equal(slice.rerank.inferenceId, "confxarm64-jina-rerank");
    assert.equal(slice.demoIndex, "confxarm64-jina-demo");
    assert.equal(slice.semanticHits.length, 0);
    assert.equal(slice.embeddings.used, false);
    assert.match(slice.notice, /disconnected|Needs setup/i);
  });

  it("keeps in-cluster floorwise notice when Cloud is configured", () => {
    const env = { ELASTIC_CLOUD_API_KEY: "unit-test-cloud-key" } as NodeJS.ProcessEnv;
    const meta = cloudRankMetaBase(env, { embeddingsUsed: true, demoHits: 1, state: "ok" });
    const slice = cloudToolFields(meta, [{ id: "jina-embed-test", score: 1, body: "ok" }], env);
    assert.equal(slice.state, "ok");
    assert.equal(slice.configured, true);
    assert.equal(slice.semanticHits[0]?.id, "jina-embed-test");
    assert.match(slice.notice, /floorwise/);
  });
});
