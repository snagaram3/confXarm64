#!/usr/bin/env bash
# Start local Elasticsearch for Floorwise.
# Prefers Docker Compose; falls back to the official tarball + system Java 21.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if curl -fsS http://127.0.0.1:9200 >/dev/null 2>&1; then
  echo "Elasticsearch already running on :9200"
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  echo "Starting Elasticsearch with docker compose…"
  docker compose up -d elasticsearch
  exit 0
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
echo "Starting Elasticsearch from $ES_HOME"
exec "$ES_HOME/bin/elasticsearch" \
  -E discovery.type=single-node \
  -E cluster.name=floorwise \
  -E xpack.security.enabled=false \
  -E xpack.security.http.ssl.enabled=false \
  -E ingest.geoip.downloader.enabled=false \
  -E node.store.allow_mmap=false \
  -E network.host=127.0.0.1 \
  -E http.port=9200 \
  -E path.data="$ROOT/.elastic/data" \
  -E path.logs="$ROOT/.elastic/logs"
