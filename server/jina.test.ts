import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyJinaAssist,
  applyRerankOrder,
  defaultCloudRequest,
  jinaAssistQuery,
  parseEmbeddingResponse,
  parseRerankResponse,
  parseSemanticHits,
  type CloudRequestFn,
  type JinaRerankableHit,
} from "./jina.ts";

const configuredEnv = { ELASTIC_CLOUD_API_KEY: "unit-test-cloud-key" } as NodeJS.ProcessEnv;

function hit(id: string, why = "in-cluster score"): JinaRerankableHit {
  return { id, rerankText: `${id} talk`, explanation: { matchedQueries: ["bm25_keyword"], why } };
}

describe("Jina inference response parsing", () => {
  it("reads 1024-dim text_embedding vectors", () => {
    const vec = Array.from({ length: 1024 }, (_, i) => i * 0.001);
    assert.deepEqual(parseEmbeddingResponse({ text_embedding: [{ embedding: vec }] }), vec);
    assert.deepEqual(parseEmbeddingResponse({ inference_results: [{ predicted_value: [1, 2, 3] }] }), [1, 2, 3]);
    assert.equal(parseEmbeddingResponse({ text_embedding: [{ embedding: [] }] }), null);
    assert.equal(parseEmbeddingResponse({ nope: true }), null);
  });

  it("reads rerank rows from rerank and inference_results shapes", () => {
    assert.deepEqual(
      parseRerankResponse({
        rerank: [
          { index: 1, relevance_score: 0.9 },
          { index: 0, score: 0.1 },
        ],
      }),
      [
        { index: 1, relevance_score: 0.9 },
        { index: 0, relevance_score: 0.1 },
      ],
    );
    assert.deepEqual(parseRerankResponse({ inference_results: [{ index: 2, predicted_value: 0.4 }] }), [
      { index: 2, relevance_score: 0.4 },
    ]);
    assert.deepEqual(parseRerankResponse({ rerank: [{ index: "x", relevance_score: 1 }] }), []);
  });

  it("reads semantic_text hits including body.text objects", () => {
    const hits = parseSemanticHits({
      hits: {
        hits: [
          { _id: "jina-embed-test", _score: 1.2, _source: { body: "Jina embeddings live" } },
          { _id: "workflows-test", _score: 0.8, _source: { body: { text: "Workflows YAML" } } },
          { _source: { body: "missing id" } },
        ],
      },
    });
    assert.equal(hits.length, 2);
    assert.equal(hits[0]?.id, "jina-embed-test");
    assert.equal(hits[1]?.body, "Workflows YAML");
  });
});

describe("applyRerankOrder", () => {
  it("reorders by relevance and keeps leftover hits", () => {
    const docs = ["a", "b", "c"];
    assert.deepEqual(
      applyRerankOrder(docs, [
        { index: 2, relevance_score: 0.9 },
        { index: 0, relevance_score: 0.1 },
      ]),
      ["c", "a", "b"],
    );
  });
});

describe("applyJinaAssist", () => {
  it("is a no-op without credentials or query", async () => {
    const sessions = [hit("s1")];
    const none = await applyJinaAssist({
      query: "eBPF",
      sessionHits: sessions,
      boothHits: [],
      env: {},
    });
    assert.equal(none.cloud.state, "not_configured");
    assert.equal(none.sessionHits, sessions);
    const empty = await applyJinaAssist({
      query: "",
      sessionHits: sessions,
      boothHits: [],
      env: configuredEnv,
    });
    assert.equal(empty.sessionHits, sessions);
    assert.equal(jinaAssistQuery(" eBPF ", ["otel", ""]), "eBPF otel");
  });

  it("lets embeddings, semantic search, and rerank fail independently", async () => {
    const paths: string[] = [];
    const request: CloudRequestFn = async ({ path }) => {
      paths.push(path);
      if (path.includes("text_embedding")) throw new Error("embed down");
      if (path.includes("_search")) {
        return {
          hits: { hits: [{ _id: "jina-embed-test", _score: 1, _source: { body: "Jina embeddings" } }] },
        };
      }
      if (path.includes("rerank")) {
        return { rerank: [{ index: 1, relevance_score: 0.99 }, { index: 0, relevance_score: 0.1 }] };
      }
      throw new Error(`unexpected ${path}`);
    };
    const result = await applyJinaAssist({
      query: "Jina embeddings",
      sessionHits: [hit("first"), hit("second")],
      boothHits: [],
      request,
      env: configuredEnv,
    });
    assert.ok(paths.some((p) => p.includes("confxarm64-jina-embeddings")));
    assert.ok(paths.some((p) => p.includes("confxarm64-jina-demo")));
    assert.ok(paths.some((p) => p.includes("confxarm64-jina-rerank")));
    assert.equal(result.cloud.state, "ok");
    assert.equal(result.cloud.embeddings.used, false);
    assert.equal(result.cloud.rerank.used, true);
    assert.equal(result.cloud.demoIndex.hits, 1);
    assert.equal(result.cloud.error, null);
    assert.equal(result.sessionHits[0]?.id, "second");
    assert.ok(result.sessionHits[0]?.explanation.matchedQueries.includes("jina_rerank"));
    assert.match(result.sessionHits[0]?.explanation.why ?? "", /Jina rerank/);
  });

  it("does not block semantic search when rerank fails", async () => {
    const request: CloudRequestFn = async ({ path }) => {
      if (path.includes("text_embedding")) {
        return { text_embedding: [{ embedding: Array.from({ length: 1024 }, () => 0.01) }] };
      }
      if (path.includes("_search")) {
        return { hits: { hits: [{ _id: "workflows-test", _score: 0.5, _source: { title: "ok" } }] } };
      }
      throw new Error("rerank down");
    };
    const sessions = [hit("keep-me")];
    const result = await applyJinaAssist({
      query: "Jina embeddings",
      sessionHits: sessions,
      boothHits: [],
      request,
      env: configuredEnv,
    });
    assert.equal(result.cloud.state, "ok");
    assert.equal(result.cloud.embeddings.used, true);
    assert.equal(result.cloud.rerank.used, false);
    assert.equal(result.sessionHits[0]?.id, "keep-me");
    assert.equal(result.semanticHits[0]?.id, "workflows-test");
  });
});

describe("defaultCloudRequest", () => {
  it("sends ApiKey auth only to the allowlisted Cloud ES host", async () => {
    const calls: Array<{ url: string; auth: string | null }> = [];
    const prev = globalThis.fetch;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      calls.push({ url: String(input), auth: headers.get("Authorization") });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;
    try {
      await defaultCloudRequest({
        method: "POST",
        path: "/_inference/text_embedding/confxarm64-jina-embeddings",
        body: { input: "hi" },
        env: configuredEnv,
      });
      assert.match(calls[0]?.url ?? "", /confxarm64-f141cd\.es\.us-central1\.gcp\.elastic\.cloud/);
      assert.equal(calls[0]?.auth, "ApiKey unit-test-cloud-key");
    } finally {
      globalThis.fetch = prev;
    }
  });

  it("maps 401 to a rejected-key error without inventing hits", async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = (async () => new Response("nope", { status: 401 })) as typeof fetch;
    try {
      await assert.rejects(
        () =>
          defaultCloudRequest({
            method: "GET",
            path: "/",
            env: configuredEnv,
          }),
        /API key was rejected/,
      );
    } finally {
      globalThis.fetch = prev;
    }
  });
});
