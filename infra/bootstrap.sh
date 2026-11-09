#!/usr/bin/env bash
# confXarm64 infra entrypoint.
# Primary: Cloud Native Hackathon cluster (team confxarm64, ns team-confxarm64,
# URL https://confxarm64.cnh.radarhq.io).
# Secondary: ./infra/local-minikube.sh (minikube / kind / k3d).
#
# Does NOT start minikube unless --local. Does NOT wipe Compose volumes.
# Does NOT wipe host :19200 Compose ES. Does NOT commit tokens or kubeconfigs.
# Does NOT helm-install skyhook/radar on CNH (Radar is already in the cluster).
set -euo pipefail

INFRA="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$INFRA/.." && pwd)"
cd "$ROOT"

TEAM="${CNH_TEAM:-confxarm64}"
NS="${CNH_NAMESPACE:-team-${TEAM}}"
APP_URL="${CNH_APP_URL:-https://${TEAM}.cnh.radarhq.io}"
RADAR_URL="${CNH_RADAR_URL:-https://${TEAM}.cnh.radarhq.io}"
CHART="${INFRA}/charts/confxarm64"
RELEASE="${HELM_RELEASE:-confxarm64}"

WITH_DASH0_OPERATOR=0
MODE="cnh"

usage() {
  cat <<EOF
Usage: infra/bootstrap.sh [--print-plan] [--local] [--with-dash0-operator]

Primary (CNH Radar cluster — team already exists, do not create another):
  Team slug:     ${TEAM}
  Namespace:     ${NS}
  App / Radar:   ${APP_URL}
  Starter notes: https://github.com/skyhook-io/cnh-starter
  MCP:           https://api.radarhq.io/mcp  (pick Cloud Native Hackathon)

  infra/bootstrap.sh
  infra/bootstrap.sh --print-plan

Optional local fallback (not the judged CNH path):
  infra/bootstrap.sh --local
  infra/local-minikube.sh

Budget on CNH: 2 CPU / 4 GiB requests, 4 CPU / 8 GiB limits, 4 PVCs / 20 GiB.
Host refuses privileged / hostNetwork / hostPath / hostPID.
Service \`app\` port 80 is required for ${APP_URL}.
EOF
}

print_plan() {
  cat <<EOF
=== confXarm64 bootstrap plan ===

Radar (primary — already created, do not make a new team):
  Cloud UI / app URL:  ${RADAR_URL}
  Namespace:           ${NS}
  MCP:                 https://api.radarhq.io/mcp → Cloud Native Hackathon
  kubectl kubeconfig:  copy Secret default/kubeconfig key config OUTSIDE git
                       (token lasts ~12–24h). Never commit it or an rhc_ token.

Dash0:
  Tools path:          ${APP_URL}/tools/dash0
  Product UI:          https://app.dash0.com  (not self-hosted)
  Operator (optional): helm in dash0-system, export OFF until secret exists
  App env:             OTEL_EXPORTER_OTLP_ENDPOINT / HEADERS, DASH0_*
  gRPC ingest:         ingress.<region>.aws.dash0.com:4317

Gitar (Never Merge Broken — no Sonar CI):
  Review brief:        .gitar/review/README.md
  Auto-apply:          .gitar/config/apply.md
  GitHub Actions:      .github/workflows/ci.yml (npm test && npm run build)
  Image build:         .github/workflows/deploy.yaml → ghcr.io/snagaram3/confxarm64
  Connect Gitar:       Settings → Configuration while signed in (not Marketplace signed out)

Elasticsearch:
  In-cluster:          http://elasticsearch:9200  cluster.name=floorwise
  Compose on laptops:  loopback :19200 volume floorwise_esdata — do not wipe
  Never wipe Compose volumes. Never invent live search hits.

Sponsor portal (local keys, gitignored):
  npm run sponsor:provision -- <exhibitor-id>

Helm (CNH):
  helm upgrade --install ${RELEASE} ${CHART} \\
    --namespace ${NS} --timeout 8m \\
    -f ${CHART}/values.yaml -f ${CHART}/values-cnh.yaml \\
    --set config.radarUiUrl=${RADAR_URL} \\
    --set config.syntheticOtel=0

Argo CD: apply infra/argocd/application.yaml through Radar MCP only if
list_clusters shows confxarm64. Repo is https://github.com/snagaram3/confXarm64.git.
HTTP 403: ask the Radar table to add your email. Never commit kubeconfigs.

Secrets still needed (never commit):
  ${NS}/confxarm64-secrets:
    DASH0_AUTH_TOKEN
    OTEL_EXPORTER_OTLP_HEADERS     Authorization=Bearer <token>
    SONAR_TOKEN
    ELASTIC_CLOUD_API_KEY
    RADAR_SECRET_KEY / RADAR_PUBLISHABLE_KEY   (api.radar.io adapter only)
  dash0-system/dash0-auth:
    token
    plus DASH0_OTLP_GRPC_ENDPOINT=ingress.<region>.aws.dash0.com:4317
    plus DASH0_API_ENDPOINT=https://api.<region>.aws.dash0.com
    plus DASH0_OTLP_HTTP_ENDPOINT=https://ingress.<region>.aws.dash0.com
EOF
}

for arg in "$@"; do
  case "$arg" in
    --print-plan) print_plan; exit 0 ;;
    --local) MODE="local" ;;
    --with-dash0-operator) WITH_DASH0_OPERATOR=1 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown flag: $arg" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ "${MODE}" == "local" ]]; then
  echo "==> local fallback (minikube). CNH cluster is the primary path."
  exec "$INFRA/local-minikube.sh"
fi

if ! command -v kubectl >/dev/null 2>&1 || ! command -v helm >/dev/null 2>&1; then
  echo "kubectl and Helm 3 are required to apply to the CNH cluster." >&2
  echo "This script will not start minikube or Docker, and will not invent a cluster." >&2
  echo
  print_plan
  echo
  echo "Copy the CNH kubeconfig from Radar (Secret default/kubeconfig, key config)"
  echo "to a file outside this repo, then: export KUBECONFIG=~/cnh-kubeconfig"
  exit 1
fi

echo "==> helm upgrade --install ${RELEASE} into ${NS} (CNH values)"
HELM_SET=(
  --set "config.radarUiUrl=${RADAR_URL}"
  --set "config.syntheticOtel=0"
  --set "elasticsearch.url=http://elasticsearch:9200"
  --set "elasticsearch.clusterName=floorwise"
  --set "appService.enabled=true"
  --set "ingress.enabled=false"
)
if [[ -n "${IMAGE_API:-}" ]]; then HELM_SET+=(--set "image.api=${IMAGE_API}"); fi
if [[ -n "${IMAGE_WEB:-}" ]]; then HELM_SET+=(--set "image.web=${IMAGE_WEB}"); fi
if [[ -n "${DASH0_API_ENDPOINT:-}" ]]; then
  HELM_SET+=(--set "config.dash0.apiBaseUrl=${DASH0_API_ENDPOINT}")
fi
if [[ -n "${DASH0_OTLP_HTTP_ENDPOINT:-}" ]]; then
  HELM_SET+=(--set "config.otelExporterEndpoint=${DASH0_OTLP_HTTP_ENDPOINT}")
fi

helm upgrade --install "${RELEASE}" "${CHART}" \
  --namespace "${NS}" \
  --timeout 8m \
  -f "${CHART}/values.yaml" \
  -f "${CHART}/values-cnh.yaml" \
  "${HELM_SET[@]}"

echo "==> wait for Elasticsearch + web"
kubectl -n "${NS}" rollout status statefulset/elasticsearch --timeout=240s || true
kubectl -n "${NS}" rollout status deploy/web --timeout=180s || true
kubectl -n "${NS}" rollout status deploy/api --timeout=180s || true
kubectl -n "${NS}" wait --for=condition=complete job/confxarm64-seed --timeout=240s || \
  echo "seed Job still running or already cleaned up — check kubectl -n ${NS} get jobs"

if [[ "${WITH_DASH0_OPERATOR}" == "1" ]]; then
  echo "==> Dash0 operator (official chart; counts against CNH budget)"
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
      --set "operator.clusterName=${TEAM}"
    )
  else
    echo "    no dash0-auth secret (or missing DASH0_OTLP_GRPC_ENDPOINT / DASH0_API_ENDPOINT)"
    echo "    installing operator without backend export"
  fi
  helm upgrade --install dash0-operator dash0-operator/dash0-operator \
    --values "${INFRA}/overlays/local/values-dash0-operator.yaml" \
    "${DASH0_ARGS[@]}"
fi

echo
echo "=== confXarm64 URLs ==="
echo "Planner / app:    ${APP_URL}/"
echo "Tools / Dash0:    ${APP_URL}/tools/dash0"
echo "Tools / Radar:    ${APP_URL}/tools/radar"
echo "Tools / Sonar:    ${APP_URL}/tools/sonar"
echo "Dash0 product UI: https://app.dash0.com  (needs a Dash0 account; not self-hosted)"
echo "Radar Cloud:      ${RADAR_URL}"
echo "Web fallback:     kubectl -n ${NS} port-forward svc/web 43180:80"
echo
echo "kubectl -n ${NS} get pods,svc"
kubectl -n "${NS}" get pods,svc || true
echo
print_plan | sed -n '/Secrets still needed/,$p'
echo "Create / update secrets, then: kubectl -n ${NS} rollout restart deploy/api"
echo "Do not wipe Compose volumes or floorwise_esdata. Do not retarget host :9200."
echo "Do not helm-install skyhook/radar here — CNH already runs Radar."
