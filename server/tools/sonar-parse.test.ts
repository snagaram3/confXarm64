import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDash0Spans } from "./dash0.ts";
import { fetchJson } from "./http.ts";
import { measureValue } from "./sonar.ts";

describe("sonar measure parsing fixtures", () => {
  it("treats missing metric values as unavailable, not zero", () => {
    const measures = [
      { metric: "bugs", value: "3" },
      { metric: "coverage" },
    ];
    assert.equal(measureValue(measures, "bugs"), "3");
    assert.equal(measureValue(measures, "coverage"), null);
    assert.notEqual(measureValue(measures, "coverage"), "0");
    assert.equal(measureValue(measures, "vulnerabilities"), null);
  });
});

describe("Dash0 span fixtures", () => {
  it("counts OTLP resourceSpans from a success fixture", () => {
    const parsed = parseDash0Spans({
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [
                { traceId: "abc", name: "floorwise.hybridSearch", startTimeUnixNano: "1" },
                { name: "no-id" },
              ],
            },
          ],
        },
      ],
    });
    assert.equal(parsed.spanCount, 2);
    assert.equal(parsed.traces[0]?.name, "floorwise.hybridSearch");
  });

  it("maps 401 from a mocked provider as an error status", async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "nope" }), { status: 401, headers: { "content-type": "application/json" } });
    try {
      const { status } = await fetchJson("https://api.us-west-2.aws.dash0.com/api/spans", {
        method: "POST",
        headers: { Authorization: "Bearer secret-token-value" },
      });
      assert.equal(status, 401);
    } finally {
      globalThis.fetch = prev;
    }
  });
});

describe("provider timeout", () => {
  it("maps abort to a 504 provider error", async () => {
    const prevFetch = globalThis.fetch;
    globalThis.fetch = async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    };
    try {
      await fetchJson("https://example.invalid/slow", { timeoutMs: 20 });
      assert.fail("expected timeout");
    } catch (err) {
      assert.equal((err as { status?: number }).status, 504);
    } finally {
      globalThis.fetch = prevFetch;
    }
  });
});
