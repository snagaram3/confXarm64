import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const dir = dirname(fileURLToPath(import.meta.url));

function read(name: string): string {
  return readFileSync(resolve(dir, name), "utf8");
}

describe("Kubernetes manifests", () => {
  it("ships a single-node ES StatefulSet with a PVC, split web/api, seed Job, and probes", () => {
    const es = read("elasticsearch.yaml");
    assert.match(es, /kind: StatefulSet/);
    assert.match(es, /volumeClaimTemplates:/);
    assert.match(es, /readinessProbe:/);
    assert.match(es, /cluster.name/);
    assert.match(es, /floorwise/);

    const api = read("api.yaml");
    assert.match(api, /kind: Deployment/);
    assert.match(api, /FLOORWISE_SKIP_SEED/);
    assert.match(api, /path: \/api\/health/);
    assert.match(api, /limits:/);

    const web = read("web.yaml");
    assert.match(web, /path: \/healthz/);
    assert.match(web, /targetPort: 8080/);

    const seed = read("seed-job.yaml");
    assert.match(seed, /kind: Job/);
    assert.match(seed, /server\/seed.ts/);

    const secret = read("secret.yaml");
    assert.doesNotMatch(secret, /sk-|rhc_|AKIA/);
    assert.match(secret, /OTEL_EXPORTER_OTLP_HEADERS: ""/);

    const kust = read("kustomization.yaml");
    assert.match(kust, /seed-job.yaml/);
    assert.match(kust, /api.yaml/);
    assert.match(kust, /web.yaml/);
  });
});
