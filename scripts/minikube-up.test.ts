import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const dir = dirname(fileURLToPath(import.meta.url));

describe("minikube-up script", () => {
  it("installs via Helm, prints nip.io URLs, and never wipes volumes or host :9200", () => {
    const script = readFileSync(resolve(dir, "minikube-up.sh"), "utf8");
    assert.match(script, /minikube start/);
    assert.match(script, /addons enable ingress/);
    assert.match(script, /helm upgrade --install floorwise/);
    assert.match(script, /charts\/floorwise/);
    assert.match(script, /--timeout 8m/);
    assert.match(script, /nip\.io/);
    assert.match(script, /skyhook\/radar/);
    assert.match(script, /dash0-operator/);
    assert.match(script, /values-dash0-operator.yaml/);
    assert.match(script, /--with-sonar/);
    assert.match(script, /elasticsearch:9200/);
    assert.match(script, /clusterName=floorwise/);
    assert.doesNotMatch(script, /docker compose down -v/);
    assert.doesNotMatch(script, /minikube delete/);
    assert.match(script, /DASH0_AUTH_TOKEN/);
    assert.match(script, /rhc_/);
    assert.match(script, /SONAR_TOKEN/);
  });
});

describe("sonar-scan + GitHub Actions", () => {
  it("refuses to upload source without SONAR_TOKEN and documents Origin", () => {
    const scan = readFileSync(resolve(dir, "sonar-scan.sh"), "utf8");
    assert.match(scan, /SONAR_TOKEN is empty/);
    assert.match(scan, /will not upload source/);
    assert.doesNotMatch(scan, /sk_|rhc_/);

    const ci = readFileSync(resolve(dir, "../.github/workflows/ci.yml"), "utf8");
    assert.match(ci, /Origin will not execute this workflow/);
    assert.match(ci, /SonarSource\/sonarqube-scan-action@v5/);
    assert.match(ci, /secrets\.SONAR_TOKEN/);
    assert.match(ci, /secrets\.SONAR_HOST_URL/);
  });
});
