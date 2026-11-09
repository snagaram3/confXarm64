import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const dir = dirname(fileURLToPath(import.meta.url));

function read(name: string): string {
  return readFileSync(resolve(dir, name), "utf8");
}

describe("confXarm64 Helm chart", () => {
  it("deploys ES StatefulSet+PVC, split web/api, seed Job, probes, and CNH Service app", () => {
    const es = read("templates/elasticsearch.yaml");
    assert.match(es, /kind: StatefulSet/);
    assert.match(es, /volumeClaimTemplates:/);
    assert.match(es, /cluster.name/);
    assert.match(es, /\{\{ \.Values\.elasticsearch\.clusterName/);
    assert.doesNotMatch(es, /privileged:\s*true/);
    assert.doesNotMatch(es, /hostNetwork:\s*true/);
    assert.doesNotMatch(es, /hostPID:\s*true/);
    assert.doesNotMatch(es, /hostPath:/);

    const values = read("values.yaml");
    assert.match(values, /http:\/\/elasticsearch:9200/);
    assert.match(values, /clusterName: floorwise/);
    assert.doesNotMatch(values, /rhc_|sk-|AKIA|Bearer /);

    const cnh = read("values-cnh.yaml");
    assert.match(cnh, /appService:/);
    assert.match(cnh, /enabled: true/);
    assert.match(cnh, /confxarm64\.cnh\.radarhq\.io/);
    assert.match(cnh, /enabled: false/);

    const images = read("values-images.yaml");
    assert.match(images, /ghcr\.io\/snagaram3\/confxarm64-api/);
    assert.match(images, /ghcr\.io\/snagaram3\/confxarm64:/);
    assert.doesNotMatch(images, /ghcr\.io\/snagaram3\/confXarm64/);

    const api = read("templates/api.yaml");
    assert.match(api, /path: \/api\/health/);
    assert.match(api, /FLOORWISE_SKIP_SEED/);
    assert.match(api, /secretRef:/);

    const web = read("templates/web.yaml");
    assert.match(web, /path: \/healthz/);
    assert.match(web, /targetPort: 8080/);

    const app = read("templates/app-service.yaml");
    assert.match(app, /name: app/);
    assert.match(app, /port: 80/);

    const seed = read("templates/seed-job.yaml");
    assert.match(seed, /kind: Job/);
    assert.match(seed, /server\/seed.ts/);
    assert.match(seed, /helm\.sh\/hook": post-install/);

    const ingress = read("templates/ingress.yaml");
    assert.match(ingress, /kind: Ingress/);
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
