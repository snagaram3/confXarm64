#!/usr/bin/env bash
# Run the official Sonar scanner against SONAR_HOST_URL using SONAR_TOKEN.
# Never uploads source without a user-supplied token. Never prints the token.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# This file lives in infra/; repo root is the parent.
cd "$ROOT"

if [[ -f "${ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT}/.env"
  set +a
fi

SONAR_HOST_URL="${SONAR_HOST_URL:-}"
SONAR_TOKEN="${SONAR_TOKEN:-}"
SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY:-floorwise}"

if [[ -z "${SONAR_TOKEN}" ]]; then
  echo "SONAR_TOKEN is empty. Set it in gitignored .env or the environment." >&2
  echo "confXarm64 will not upload source without a token you supply." >&2
  exit 1
fi
if [[ -z "${SONAR_HOST_URL}" ]]; then
  echo "SONAR_HOST_URL is empty (example: http://sonarqube.\$(minikube ip).nip.io or https://sonarcloud.io)." >&2
  exit 1
fi

SCANNER_ARGS=(
  "-Dsonar.host.url=${SONAR_HOST_URL}"
  "-Dsonar.projectKey=${SONAR_PROJECT_KEY}"
  "-Dsonar.token=${SONAR_TOKEN}"
)
if [[ -n "${SONAR_ORGANIZATION:-}" ]]; then
  SCANNER_ARGS+=("-Dsonar.organization=${SONAR_ORGANIZATION}")
fi

if command -v sonar-scanner >/dev/null 2>&1; then
  exec sonar-scanner "${SCANNER_ARGS[@]}"
fi

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  exec docker run --rm \
    -e SONAR_HOST_URL \
    -e SONAR_TOKEN \
    -e SONAR_ORGANIZATION \
    -v "${ROOT}:/usr/src" \
    sonarsource/sonar-scanner-cli:11
fi

echo "Need sonar-scanner on PATH or Docker to run sonarsource/sonar-scanner-cli." >&2
echo "This Origin repo has no GitHub Actions runner; this script is the local path." >&2
exit 1
