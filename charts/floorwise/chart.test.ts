import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const dir = dirname(fileURLToPath(import.meta.url));

function read(name: string): string {
  return readFileSync(resolve(dir, name), "utf8");
}

describe("Floorwise Helm chart", () => {
  it("deploys ES StatefulSet+PVC, split web/api, seed Job, probes, and Ingress", () => {
    const es = read("templates/elasticsearch.yaml");
    assert.match(es, /kind: StatefulSet/);
    assert.match(es, /volumeClaimTemplates:/);
    assert.match(es, /cluster.name/);
    assert.match(es, /\{\{ \.Values\.elasticsearch\.clusterName/);

    const values = read("values.yaml");
    assert.match(values, /http:\/\/elasticsearch:9200/);
    assert.match(values, /clusterName: floorwise/);
    assert.doesNotMatch(values, /rhc_|sk-|AKIA|Bearer /);

    const api = read("templates/api.yaml");
    assert.match(api, /path: \/api\/health/);
    assert.match(api, /FLOORWISE_SKIP_SEED/);
    assert.match(api, /secretRef:/);

    const web = read("templates/web.yaml");
    assert.match(web, /path: \/healthz/);
    assert.match(web, /targetPort: 8080/);

    const seed = read("templates/seed-job.yaml");
    assert.match(seed, /kind: Job/);
    assert.match(seed, /server\/seed.ts/);
    assert.match(seed, /helm\.sh\/hook": post-install/);

    const ingress = read("templates/ingress.yaml");
    assert.match(ingress, /kind: Ingress/);
    assert.match(ingress, /ingressClassName/);
    assert.match(ingress, /name: web/);

    const secret = read("templates/secret.yaml");
    assert.match(secret, /DASH0_AUTH_TOKEN: ""/);
    assert.match(secret, /lookup "v1" "Secret"/);
    assert.doesNotMatch(secret, /sk-|rhc_|AKIA/);

    const cm = read("templates/configmap.yaml");
    assert.match(cm, /RADAR_UI_URL/);
    assert.match(cm, /DASH0_DASHBOARD_URL/);
    assert.match(cm, /SONAR_HOST_URL/);
    assert.match(cm, /FLOORWISE_SYNTHETIC_OTEL/);
  });
});
