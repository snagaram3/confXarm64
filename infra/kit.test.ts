import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(dir, "..");

function read(rel: string): string {
  return readFileSync(resolve(dir, rel), "utf8");
}

describe("infra bootstrap kit", () => {
  it("treats the CNH cluster as primary and never wipes volumes or host :9200", () => {
    const boot = read("bootstrap.sh");
    assert.match(boot, /team-confxarm64/);
    assert.match(boot, /confxarm64\.cnh\.radarhq\.io/);
    assert.match(boot, /api\.radarhq\.io\/mcp/);
    assert.match(boot, /charts\/confxarm64/);
    assert.match(boot, /values-cnh\.yaml/);
    assert.match(boot, /elasticsearch:9200/);
    assert.match(boot, /clusterName=floorwise/);
    assert.match(boot, /appService.enabled=true/);
    assert.doesNotMatch(boot, /minikube start/);
    assert.doesNotMatch(boot, /docker compose down -v/);
    assert.match(boot, /helm-install skyhook\/radar/);
    assert.match(boot, /DASH0_AUTH_TOKEN/);
    assert.match(boot, /SONAR_TOKEN/);
    assert.match(boot, /rhc_/);
  });

  it("keeps minikube as an optional labeled fallback", () => {
    const local = read("local-minikube.sh");
    assert.match(local, /LOCAL FALLBACK/);
    assert.match(local, /minikube start/);
    assert.match(local, /charts\/confxarm64/);
    assert.match(local, /skyhook\/radar/);
    assert.match(local, /dash0-operator/);
    assert.doesNotMatch(local, /docker compose down -v/);
    assert.doesNotMatch(local, /minikube delete/);
  });

  it("refuses to upload source without SONAR_TOKEN and documents Origin", () => {
    const scan = read("sonar-scan.sh");
    assert.match(scan, /SONAR_TOKEN is empty/);
    assert.match(scan, /will not upload source/);
    assert.doesNotMatch(scan, /sk_|rhc_/);

    const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
    assert.match(ci, /Origin will not execute/);
    assert.match(ci, /SonarSource\/sonarqube-scan-action@v5/);
    assert.match(ci, /secrets\.SONAR_TOKEN/);
    assert.match(ci, /public GitHub/);

    const gitar = readFileSync(resolve(root, ".gitar/review/README.md"), "utf8");
    assert.match(gitar, /public GitHub repository/);
    assert.match(gitar, /infra\/sonar-scan\.sh/);
  });

  it("points Argo CD at the CNH namespace and Helm chart without tokens", () => {
    const app = read("argocd/application.yaml");
    assert.match(app, /namespace: team-confxarm64/);
    assert.match(app, /path: infra\/charts\/confxarm64/);
    assert.match(app, /values-cnh\.yaml/);
    assert.doesNotMatch(app, /rhc_|sk-|AKIA/);
  });
});
