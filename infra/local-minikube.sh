#!/usr/bin/env bash
# OPTIONAL local fallback: minikube + Helm for confXarm64.
# Primary path is the CNH cluster: infra/bootstrap.sh
#
# Does NOT wipe Compose volumes, delete the minikube cluster, touch a foreign
# host :9200, commit tokens, or send synthetic OTEL (FLOORWISE_SYNTHETIC_OTEL stays 0).
set -euo pipefail

INFRA="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$INFRA/.." && pwd)"
cd "$ROOT"

MINIKUBE_CPUS="${MINIKUBE_CPUS:-4}"
MINIKUBE_MEMORY="${MINIKUBE_MEMORY:-8192}"
INSTALL_RADAR="${INSTALL_RADAR:-1}"
INSTALL_DASH0_OPERATOR="${INSTALL_DASH0_OPERATOR:-1}"
INSTALL_SONAR="${INSTALL_SONAR:-0}"
IMAGE_TAG="${IMAGE_TAG:-dev}"
NS="${LOCAL_NAMESPACE:-confxarm64}"
CHART="${INFRA}/charts/confxarm64"

for arg in "$@"; do
  case "$arg" in
    --with-sonar) INSTALL_SONAR=1 ;;
    --skip-radar) INSTALL_RADAR=0 ;;
    --skip-dash0) INSTALL_DASH0_OPERATOR=0 ;;
    --help|-h)
      echo "Usage: infra/local-minikube.sh [--with-sonar] [--skip-radar] [--skip-dash0]"
      echo "OPTIONAL fallback. Primary: infra/bootstrap.sh against the CNH cluster."
      echo "Env: MINIKUBE_CPUS=4 MINIKUBE_MEMORY=8192 IMAGE_TAG=dev"
      exit 0
      ;;
  esac
done

for bin in docker minikube helm kubectl; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "missing $bin. Install Docker, minikube, Helm 3, and kubectl, then re-run." >&2
    echo "This script will not invent a cluster. Prefer infra/bootstrap.sh on CNH." >&2
    exit 1
  fi
done

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop / the daemon, then re-run." >&2
  exit 1
fi

echo "==> minikube start (cpus=${MINIKUBE_CPUS} memory=${MINIKUBE_MEMORY}Mi) [LOCAL FALLBACK]"
echo "    CNH cluster (https://confxarm64.cnh.radarhq.io) is the primary path."
echo "    Add --with-sonar only if you can spare ~2Gi more."
minikube start --cpus="$MINIKUBE_CPUS" --memory="$MINIKUBE_MEMORY"
minikube addons enable ingress
kubectl -n ingress-nginx wait --for=condition=ready pod -l app.kubernetes.io/component=controller --timeout=180s || \
  echo "ingress controller not ready yet — nip.io URLs may 404 until it is"

IP="$(minikube ip)"
APP_HOST="confxarm64.${IP}.nip.io"
RADAR_HOST="radar.${IP}.nip.io"
SONAR_HOST="sonarqube.${IP}.nip.io"

echo "==> build + load images into minikube"
docker build -f docker/api.Dockerfile -t "floorwise-api:${IMAGE_TAG}" .
docker build -f docker/web.Dockerfile -t "floorwise-web:${IMAGE_TAG}" .
minikube image load "floorwise-api:${IMAGE_TAG}"
minikube image load "floorwise-web:${IMAGE_TAG}"

HELM_SET=(
  --set "image.api=floorwise-api:${IMAGE_TAG}"
  --set "image.web=floorwise-web:${IMAGE_TAG}"
  --set "ingress.enabled=true"
  --set "ingress.className=nginx"
  --set "ingress.host=${APP_HOST}"
  --set "appService.enabled=true"
  --set "elasticsearch.url=http://elasticsearch:9200"
  --set "elasticsearch.clusterName=floorwise"
  --set "config.dash0.dashboardUrl=https://app.dash0.com"
  --set "config.sonar.projectKey=floorwise"
  --set "config.syntheticOtel=0"
  --set "config.radarUiUrl=http://${RADAR_HOST}"
)

if [[ "${INSTALL_SONAR}" == "1" ]]; then
  HELM_SET+=(--set "config.sonar.hostUrl=http://${SONAR_HOST}")
fi
if [[ -n "${DASH0_API_ENDPOINT:-}" ]]; then
  HELM_SET+=(--set "config.dash0.apiBaseUrl=${DASH0_API_ENDPOINT}")
fi
if [[ -n "${DASH0_OTLP_HTTP_ENDPOINT:-}" ]]; then
  HELM_SET+=(--set "config.otelExporterEndpoint=${DASH0_OTLP_HTTP_ENDPOINT}")
fi

echo "==> helm upgrade --install confxarm64"
helm upgrade --install confxarm64 "${CHART}" \
  --namespace "${NS}" \
  --create-namespace \
  --timeout 8m \
  "${HELM_SET[@]}"

echo "==> wait for Elasticsearch + web"
kubectl -n "${NS}" rollout status statefulset/elasticsearch --timeout=240s
kubectl -n "${NS}" rollout status deploy/web --timeout=180s || true
kubectl -n "${NS}" rollout status deploy/api --timeout=180s || true
kubectl -n "${NS}" wait --for=condition=complete job/confxarm64-seed --timeout=240s || \
  echo "seed Job still running or already cleaned up — check kubectl -n ${NS} get jobs"

if [[ "${INSTALL_RADAR}" == "1" ]]; then
  echo "==> Skyhook Radar (official chart; Cloud AI SRE off by default) [LOCAL ONLY]"
  helm repo add skyhook https://skyhook-io.github.io/helm-charts
  helm repo update skyhook
  RADAR_ARGS=(
    --namespace radar --create-namespace
    --values "${INFRA}/overlays/local/values-radar.yaml"
    --set "ingress.enabled=true"
    --set "ingress.className=nginx"
    --set "ingress.hosts[0].host=${RADAR_HOST}"
    --set "ingress.hosts[0].paths[0].path=/"
    --set "ingress.hosts[0].paths[0].pathType=Prefix"
    --set "cloud.enabled=false"
  )
  if kubectl -n radar get secret radar-cloud-config >/dev/null 2>&1; then
    echo "    found radar/radar-cloud-config — enabling Radar Cloud (token not printed)"
    RADAR_ARGS+=(
      --set "cloud.enabled=true"
      --set "cloud.url=wss://api.radarhq.io/agent"
      --set "cloud.existingSecret=radar-cloud-config"
    )
  fi
  helm upgrade --install radar skyhook/radar "${RADAR_ARGS[@]}"
fi

if [[ "${INSTALL_DASH0_OPERATOR}" == "1" ]]; then
  echo "==> Dash0 operator (official chart)"
  helm repo add dash0-operator https://dash0hq.github.io/dash0-operator
  helm repo update dash0-operator
  kubectl create namespace dash0-system --dry-run=client -o yaml | kubectl apply -f -
  DASH0_ARGS=(--namespace dash0-system --create-namespace)
  if kubectl -n dash0-system get secret dash0-auth >/dev/null 2>&1 \
    && [[ -n "${DASH0_OTLP_GRPC_ENDPOINT:-}" && -n "${DASH0_API_ENDPOINT:-}" ]]; then
    echo "    found dash0-system/dash0-auth and endpoints — enabling export"
    DASH0_ARGS+=(
      --set "operator.dash0Export.enabled=true"
      --set "operator.dash0Export.endpoint=${DASH0_OTLP_GRPC_ENDPOINT}"
      --set "operator.dash0Export.apiEndpoint=${DASH0_API_ENDPOINT}"
      --set "operator.dash0Export.secretRef.name=dash0-auth"
      --set "operator.dash0Export.secretRef.key=token"
      --set "operator.clusterName=confxarm64-minikube"
    )
  else
    echo "    no dash0-auth secret (or missing DASH0_OTLP_GRPC_ENDPOINT / DASH0_API_ENDPOINT)"
    echo "    installing operator without backend export"
  fi
  helm upgrade --install dash0-operator dash0-operator/dash0-operator \
    --values "${INFRA}/overlays/local/values-dash0-operator.yaml" \
    "${DASH0_ARGS[@]}"
fi

if [[ "${INSTALL_SONAR}" == "1" ]]; then
  echo "==> SonarQube (official chart, Community) — optional and heavy"
  helm repo add sonarqube https://SonarSource.github.io/helm-chart-sonarqube
  helm repo update sonarqube
  helm upgrade --install sonarqube sonarqube/sonarqube \
    --namespace sonarqube \
    --create-namespace \
    --values "${INFRA}/overlays/local/values-sonarqube.yaml" \
    --set "ingress.enabled=true" \
    --set "ingress.ingressClassName=nginx" \
    --set "ingress.hosts[0].name=${SONAR_HOST}"
fi

echo
echo "=== LOCAL fallback URLs (nginx ingress + nip.io) ==="
echo "Planner home:     http://${APP_HOST}/"
echo "Tools / Dash0:    http://${APP_HOST}/tools/dash0"
echo "Tools / Radar:    http://${APP_HOST}/tools/radar"
echo "Tools / Sonar:    http://${APP_HOST}/tools/sonar"
echo "Dash0 product UI: https://app.dash0.com  (needs a Dash0 account; not self-hosted)"
if [[ "${INSTALL_RADAR}" == "1" ]]; then
  echo "Skyhook Radar UI: http://${RADAR_HOST}/"
  echo "Radar fallback:   kubectl -n radar port-forward svc/radar 9280:9280   → http://127.0.0.1:9280"
fi
if [[ "${INSTALL_SONAR}" == "1" ]]; then
  echo "SonarQube UI:     http://${SONAR_HOST}/"
fi
echo "Web fallback:     kubectl -n ${NS} port-forward svc/web 43180:80   → http://127.0.0.1:43180"
echo
echo "kubectl -n ${NS} get pods,svc,ingress"
kubectl -n "${NS}" get pods,svc,ingress || true
if [[ "${INSTALL_RADAR}" == "1" ]]; then
  kubectl -n radar get pods,svc,ingress || true
fi
echo
echo "=== Secrets still needed (never commit) ==="
echo "${NS}/confxarm64-secrets keys: DASH0_AUTH_TOKEN, OTEL_EXPORTER_OTLP_HEADERS, SONAR_TOKEN, ELASTIC_CLOUD_API_KEY,"
echo "  RADAR_SECRET_KEY / RADAR_PUBLISHABLE_KEY (api.radar.io only)"
echo "dash0-system/dash0-auth key: token + DASH0_OTLP_GRPC_ENDPOINT=ingress.<region>.aws.dash0.com:4317"
echo "radar/radar-cloud-config key: token (rhc_… from https://app.radarhq.io) — optional"
echo "Do not wipe Compose volumes or floorwise_esdata. Do not retarget host :9200."
