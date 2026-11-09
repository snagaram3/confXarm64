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
    assert.match(boot, /ELASTIC_CLOUD_API_KEY/);
    assert.match(boot, /rhc_/);
    assert.match(boot, /github\.com\/snagaram3\/confXarm64/);
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

  it("refuses to upload source without SONAR_TOKEN and keeps CI Gitar-only", () => {
    const scan = read("sonar-scan.sh");
    assert.match(scan, /SONAR_TOKEN is empty/);
    assert.match(scan, /will not upload source/);
    assert.doesNotMatch(scan, /sk_|rhc_/);

    const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
    assert.match(ci, /npm test/);
    assert.match(ci, /npm run build/);
    assert.doesNotMatch(ci, /SonarSource\/sonarqube-scan-action/);
    assert.doesNotMatch(ci, /SONAR_TOKEN/);
    assert.doesNotMatch(ci, /sonar-project\.properties/);

    const gitar = readFileSync(resolve(root, ".gitar/review/README.md"), "utf8");
    assert.match(gitar, /planner-first/);
    assert.match(gitar, /Elasticsearch/);
    assert.doesNotMatch(gitar, /Gitar \/ Sonar/);
    assert.doesNotMatch(gitar, /optional Sonar scan/);

    const apply = readFileSync(resolve(root, ".gitar/config/apply.md"), "utf8");
    assert.match(apply, /Skip/);
    assert.match(apply, /secrets/i);
  });

  it("points Argo CD at this public GitHub repo and Helm chart without tokens", () => {
    const app = read("argocd/application.yaml");
    assert.match(app, /namespace: team-confxarm64/);
    assert.match(app, /path: infra\/charts\/confxarm64/);
    assert.match(app, /values-cnh\.yaml/);
    assert.match(app, /values-images\.yaml/);
    assert.match(app, /repoURL: https:\/\/github\.com\/snagaram3\/confXarm64\.git/);
    assert.match(app, /targetRevision: main/);
    assert.match(app, /kind: Secret/);
    assert.match(app, /name: confxarm64-secrets/);
    assert.match(app, /jsonPointers:/);
    assert.match(app, /\/data/);
    assert.match(app, /\/stringData/);
    assert.match(app, /RespectIgnoreDifferences=true/);
    assert.match(app, /prune: true/);
    assert.match(app, /selfHeal: true/);
    assert.doesNotMatch(app, /kind: ConfigMap/);
    assert.doesNotMatch(app, /OWNER\/REPO/);
    assert.doesNotMatch(app, /rhc_|sk-|AKIA|Bearer |Authorization/);
  });

  it("builds lowercase GHCR images on push to main", () => {
    const wf = readFileSync(resolve(root, ".github/workflows/deploy.yaml"), "utf8");
    assert.match(wf, /name: build-and-deploy/);
    assert.match(wf, /GITHUB_REPOSITORY,,/);
    assert.match(wf, /docker\/web\.Dockerfile/);
    assert.match(wf, /docker\/api\.Dockerfile/);
    assert.match(wf, /values-images\.yaml/);
    assert.doesNotMatch(wf, /privileged/);

    const apiDocker = readFileSync(resolve(root, "docker/api.Dockerfile"), "utf8");
    assert.match(apiDocker, /COPY elastic \.\/elastic/);
    assert.match(apiDocker, /COPY server \.\/server/);

    const webDocker = readFileSync(resolve(root, "docker/web.Dockerfile"), "utf8");
    assert.match(webDocker, /FROM nginxinc\/nginx-unprivileged:1\.27-alpine/);
    assert.match(webDocker, /USER nginx/);
    assert.match(webDocker, /nginx-main\.conf/);
    assert.match(webDocker, /EXPOSE 8080/);

    const nginxMain = readFileSync(resolve(root, "docker/nginx-main.conf"), "utf8");
    assert.match(nginxMain, /pid \/tmp\/nginx\.pid;/);
    assert.doesNotMatch(nginxMain, /^\s*user /m);

    const images = read("charts/confxarm64/values-images.yaml");
    assert.match(images, /ghcr\.io\/snagaram3\/confxarm64/);
    assert.doesNotMatch(images, /ghcr\.io\/snagaram3\/confXarm64/);
    assert.doesNotMatch(images, /rhc_|sk-|AKIA/);
  });
});
