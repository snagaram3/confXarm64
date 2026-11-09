import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reportedMatchedQueries } from "./search.ts";
import { explainMode, parseTopicWeights, topicWeightShould } from "./search-query.ts";

describe("reportedMatchedQueries", () => {
  it("does not stamp semantic_knn onto keyword or hybrid hits", () => {
    assert.deepEqual(reportedMatchedQueries({}), []);
    assert.deepEqual(reportedMatchedQueries({ matched_queries: ["tag:eBPF", "bm25_keyword"] }), [
      "tag:eBPF",
      "bm25_keyword",
    ]);
    assert.equal(reportedMatchedQueries({ matched_queries: ["bm25_keyword"] }).includes("semantic_knn"), false);
  });
});

describe("explainMode vector claims", () => {
  it("does not claim a vector match unless Elasticsearch named semantic_knn", () => {
    const hybrid = explainMode("hybrid", 12.4, ["bm25_keyword", "tag:eBPF"], [], ["eBPF"], ["eBPF"], "function_score");
    assert.equal(hybrid.matchedQueries.includes("semantic_knn"), false);
    assert.doesNotMatch(hybrid.why, /hosted embedding|semantic_knn|Jina/i);
    const named = explainMode("hybrid", 0.021, ["semantic_knn"], [], [], [], "rrf");
    assert.match(named.why, /lexical dense_vector/);
    assert.match(named.why, /0\.021/);
  });
});

describe("topicWeightShould", () => {
  it("turns positive taste weights into named Elasticsearch boosts", () => {
    const weights = parseTopicWeights({ eBPF: 1.2, skipme: 0.1, Security: "1" });
    const should = topicWeightShould(weights);
    assert.equal(should.length, 2);
    const names = should.map((clause) => {
      const match = clause.multi_match as { _name: string; query: string; boost: number };
      return match._name;
    });
    assert.ok(names.includes("topic:eBPF"));
    assert.ok(names.includes("topic:Security"));
  });
});
