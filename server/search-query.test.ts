import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  engineModeFor,
  explainMode,
  keywordQuery,
  matchedFieldsFromHighlight,
  parseQueryMode,
  plainHighlight,
  queryVector,
  rrfRetriever,
} from "./search-query.ts";

describe("parseQueryMode", () => {
  it("defaults unknown values to hybrid", () => {
    assert.equal(parseQueryMode("hybrid"), "hybrid");
    assert.equal(parseQueryMode("keyword"), "keyword");
    assert.equal(parseQueryMode("semantic"), "semantic");
    assert.equal(parseQueryMode("nope"), "hybrid");
    assert.equal(parseQueryMode(undefined), "hybrid");
  });
});

describe("engineModeFor", () => {
  it("maps UI modes to ES engine labels", () => {
    assert.equal(engineModeFor("keyword"), "keyword-bm25");
    assert.equal(engineModeFor("semantic"), "semantic-knn");
    assert.equal(engineModeFor("hybrid"), "hybrid-bm25-knn");
  });
});

describe("keywordQuery", () => {
  it("builds a named multi_match and ignores blank text", () => {
    assert.equal(keywordQuery("  "), null);
    const q = keywordQuery("eBPF security");
    assert.ok(q && "multi_match" in q);
    assert.equal((q as { multi_match: { _name: string } }).multi_match._name, "bm25_keyword");
  });
});

describe("rrfRetriever", () => {
  it("combines a BM25 standard retriever with kNN", () => {
    const body = rrfRetriever({
      kind: "session",
      qvec: [0.1, 0.2],
      keyword: keywordQuery("ebpf"),
      filters: [{ term: { kind: "session" } }],
    });
    const rrf = body.rrf as { retrievers: unknown[] };
    assert.equal(rrf.retrievers.length, 2);
    assert.ok("standard" in (rrf.retrievers[0] as object));
    assert.ok("knn" in (rrf.retrievers[1] as object));
  });
});

describe("explainMode", () => {
  it("says why a hybrid hit matched without leaking HTML", () => {
    const explanation = explainMode(
      "hybrid",
      12.4,
      ["bm25_keyword", "semantic_knn"],
      ["runtime <em>security</em> with eBPF"],
      ["eBPF", "Security"],
      ["eBPF"],
      "rrf",
    );
    assert.equal(explanation.mode, "hybrid-bm25-knn");
    assert.ok(explanation.why.includes("RRF"));
    assert.ok(explanation.why.includes("BM25"));
    assert.ok(explanation.why.includes("kNN"));
    assert.equal(explanation.highlights[0]?.includes("<em>"), false);
    assert.deepEqual(explanation.matchedTags, ["eBPF"]);
  });
});

describe("plainHighlight / matchedFields", () => {
  it("strips em tags and lists highlighted fields", () => {
    assert.equal(plainHighlight("  foo <em>bar</em>  "), "foo bar");
    assert.deepEqual(matchedFieldsFromHighlight({ abstract: ["x"], title: [], tags: ["eBPF"] }), [
      "abstract",
      "tags",
    ]);
  });
});

describe("queryVector", () => {
  it("embeds eBPF and security into a 48-dim unit vector", () => {
    const vec = queryVector("something on eBPF and security", "", []);
    assert.equal(vec.length, 48);
    const mag = Math.sqrt(vec.reduce((sum, n) => sum + n * n, 0));
    assert.ok(Math.abs(mag - 1) < 1e-6);
    assert.ok(vec.some((n) => n > 0));
  });
});
