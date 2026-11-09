import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pingCluster } from "./es.ts";
import { hybridSearch } from "./search.ts";

const LIVE = process.env.FLOORWISE_LIVE_SEARCH === "1";

describe("live Elasticsearch hybrid search", { skip: !LIVE }, () => {
  it("finds eBPF/security talks from a natural-language query", async () => {
    const health = await pingCluster();
    assert.equal(health.cluster, "floorwise");
    const result = await hybridSearch({
      kind: "session",
      interests: [],
      q: "something on eBPF and security",
      mode: "hybrid",
      size: 10,
    });
    assert.ok(result.hits.length > 0, "hybrid search returned no hits");
    assert.ok(result.took >= 0);
    const blob = result.hits
      .slice(0, 8)
      .map((hit) => `${hit.explanation.why} ${hit.explanation.highlights.join(" ")}`)
      .join(" ")
      .toLowerCase();
    assert.ok(
      /ebpf|bpf|security|cilium|tetragon/.test(blob),
      `expected eBPF/security evidence in why/highlights, got: ${blob.slice(0, 400)}`,
    );
  });
});
