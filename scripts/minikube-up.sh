#!/usr/bin/env bash
# Thin wrapper. Source of truth: infra/local-minikube.sh
# Primary cluster path is infra/bootstrap.sh (CNH).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/infra/local-minikube.sh" "$@"
