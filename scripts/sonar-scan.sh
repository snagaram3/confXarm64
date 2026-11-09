#!/usr/bin/env bash
# Thin wrapper. Source of truth: infra/sonar-scan.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/infra/sonar-scan.sh" "$@"
