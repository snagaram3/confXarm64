#!/usr/bin/env bash
# Start Floorwise Elasticsearch in isolation.
# Prefers Docker Compose (host port 19200 → container 9200); falls back to the
# official tarball. Never binds host 9200/9300. Never stops other containers.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOST_PORT="${ES_HOST_PORT:-19200}"
ES_URL="http://127.0.0.1:${HOST_PORT}"

already_floorwise() {
  local health name
  health="$(curl -fsS "${ES_URL}/_cluster/health?wait_for_status=yellow&timeout=2s" 2>/dev/null || true)"
  [[ -n "$health" ]] || return 1
  name="$(curl -fsS "${ES_URL}/" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('cluster_name',''))" 2>/dev/null || true)"
  [[ "$name" == "floorwise" ]]
}

if already_floorwise; then
  echo "Floorwise Elasticsearch already yellow/green on ${ES_URL}"
  curl -sS "${ES_URL}/_cluster/health?pretty"
  exit 0
fi

if curl -fsS "${ES_URL}/" >/dev/null 2>&1; then
  echo "Port ${HOST_PORT} is already in use by something that is not cluster.name=floorwise."
  echo "Leave it running. Set ES_HOST_PORT to a free loopback port and retry."
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  echo "Starting Floorwise Elasticsearch with docker compose on host :${HOST_PORT}…"
  ES_HOST_PORT="${HOST_PORT}" docker compose up -d elasticsearch
  echo "Waiting for cluster yellow/green at ${ES_URL}/_cluster/health …"
  for i in $(seq 1 36); do
    if already_floorwise; then
      curl -sS "${ES_URL}/_cluster/health?pretty"
      exit 0
    fi
    sleep 2
  done
  echo "Floorwise Elasticsearch did not reach yellow/green in time. Check: docker compose logs elasticsearch"
  echo "Do not delete volumes or stop other Elasticsearch containers."
  exit 1
fi

ES_VERSION="${ES_VERSION:-8.17.0}"
ES_HOME="${ES_HOME:-$ROOT/.elastic/elasticsearch-${ES_VERSION}}"
TARBALL="elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz"
URL="https://artifacts.elastic.co/downloads/elasticsearch/${TARBALL}"

mkdir -p "$ROOT/.elastic"
if [[ ! -x "$ES_HOME/bin/elasticsearch" ]]; then
  echo "Downloading Elasticsearch ${ES_VERSION} (no Docker on this machine)…"
  curl -fsSL "$URL" -o "$ROOT/.elastic/${TARBALL}"
  tar -xzf "$ROOT/.elastic/${TARBALL}" -C "$ROOT/.elastic"
fi

export ES_JAVA_OPTS="${ES_JAVA_OPTS:--Xms512m -Xmx512m}"
echo "Starting Elasticsearch from $ES_HOME on loopback :${HOST_PORT}"
exec "$ES_HOME/bin/elasticsearch" \
  -E discovery.type=single-node \
  -E cluster.name=floorwise \
  -E xpack.security.enabled=false \
  -E xpack.security.http.ssl.enabled=false \
  -E xpack.ml.enabled=false \
  -E ingest.geoip.downloader.enabled=false \
  -E cluster.routing.allocation.disk.threshold_enabled=false \
  -E node.store.allow_mmap=false \
  -E network.host=127.0.0.1 \
  -E http.port="${HOST_PORT}" \
  -E transport.port=19300 \
  -E path.data="$ROOT/.elastic/data" \
  -E path.logs="$ROOT/.elastic/logs"
