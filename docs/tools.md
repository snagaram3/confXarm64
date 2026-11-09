# confXarm64 tools (Sonar, Dash0, Radar, Elasticsearch)

Companion **Tools** surface: TopBar → Tools, or `/tools/{sonar|dash0|radar|elasticsearch}`. Deep links, reload, and back work because Vite SPA fallbacks `/tools/*` to the app.

This is not sponsor-logo display. Each tab talks to a real adapter on the confXarm64 API (`:43181`). Missing credentials show **Needs setup** with env **names** only.

## Access boundary

- Credentials live in gitignored `.env` (see `.env.example` for names). Never `VITE_*`, never committed.
- Clients cannot supply `url` / `endpoint` / `host` / `token` query or body fields.
- Dash0 query hosts are allowlisted (`api.*.aws.dash0.com`, `api.europe-west4.gcp.dash0.com`). Sonar host comes from `SONAR_HOST_URL` (http/https, no credentials in the URL, metadata IPs blocked).
- Elasticsearch uses `ELASTICSEARCH_URL` + `ELASTICSEARCH_INDEX` (index name `floorwise`). No arbitrary index console, no deletes.
- Elastic Cloud Jina uses public URLs from GitOps/`elastic/cloud.json` plus `ELASTIC_CLOUD_API_KEY` from Secret `confxarm64-secrets`. Missing key → **Needs setup**, never invented Jina hits.
- This app does not call `api.radar.io`. Tools → Radar is Skyhook Radar UI only, and stays **Needs setup** unless `RADAR_UI_URL` is a real Radar UI (not the live app URL).
- Responses are sanitized (tokens redacted). Lead emails/notes never appear in tools metrics or traces.
- `/api/tools` is this process’s companion API, scoped to the configured project/index/service name — not a public provider proxy.

## Elasticsearch

Reuses the existing hybrid BM25+lexical-kNN ranker. Tab shows cluster name/version/health, index document count, and sample rank hits/scores/why/timing from the real confXarm64 client.

Mac: host `127.0.0.1:19200`, in-container `9200`, cluster `floorwise`, volume `floorwise_esdata`, container `floorwise-es`. Compose `-p floorwise`. Do **not** use an unrelated host `:9200` cluster.

```bash
docker compose -p floorwise up -d elasticsearch
curl -sS "http://127.0.0.1:19200/_cluster/health?pretty"
```

Env names: `ELASTICSEARCH_URL`, `ELASTICSEARCH_INDEX`, `ES_HOST_PORT`.

### Elastic Cloud + Jina (separate path)

Public Serverless project `confxarm64-f141cd` (region `gcp-us-central1`). In-cluster `http://elasticsearch:9200` / index `floorwise` is unchanged.

- Embeddings: named inference id `confxarm64-jina-embeddings` (`jina-embeddings-v5-text-small`, 1024-dim, cosine)
- Rerank: named inference id `confxarm64-jina-rerank` (`jina-reranker-v3.5`)
- Demo semantic index: `confxarm64-jina-demo` (`body` as `semantic_text`)
- Workflow as code: `elastic/workflows/confxarm64-jina-semantic-search.yaml`

When `ELASTIC_CLOUD_API_KEY` is set, `POST /api/rank` still ranks the official catalog on in-cluster Elasticsearch, then may call Cloud inference (embeddings, demo semantic search, rerank). Each of those can fail on its own; a Cloud error does not wipe in-cluster hits. Tools → Elasticsearch shows a nested **Elastic Cloud · Jina** card with connected / needs setup / empty / error.

Env names: `ELASTIC_CLOUD_API_KEY`, `ELASTIC_CLOUD_ELASTICSEARCH_URL`, `ELASTIC_CLOUD_KIBANA_URL`, `ELASTIC_CLOUD_EMBEDDINGS_INFERENCE_ID`, `ELASTIC_CLOUD_RERANK_INFERENCE_ID`, `ELASTIC_CLOUD_DEMO_INDEX`. See [`elastic/README.md`](../elastic/README.md).

## Dash0 / OpenTelemetry

Three distinct layers — the UI names them separately:

1. **Local process counters** (requests, 5xx, rank latency, last trace id). Not proof Dash0 stored anything.
2. **OTLP exporter** if `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Export attempt ≠ remote receipt.
3. **Remote query** `POST {DASH0_API_BASE_URL}/api/spans` (official Dash0 Query API) filtered by `service.name`, last 15 minutes, only when `DASH0_API_BASE_URL` + `DASH0_AUTH_TOKEN` are set.

Env names: `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_SERVICE_NAME`, `DASH0_API_BASE_URL`, `DASH0_AUTH_TOKEN`, `DASH0_DATASET`, `DASH0_DASHBOARD_URL`.

`DASH0_DASHBOARD_URL` (default `https://app.dash0.com`) is shown on Tools → Dash0 only when query credentials exist. confXarm64 `/tools/dash0` is this tab, not a self-hosted Dash0 product. The Dash0 Kubernetes operator (official Helm, namespace `dash0-system`) is a separate in-cluster install: OTLP/gRPC `ingress.<region>.aws.dash0.com:4317` via Secret `dash0-system/dash0-auth` key `token`. Export stays off until that secret and the endpoints exist.

### Participant dashboard

The Dash0 tab opens in **Live** (empty / not configured). Synthetic heatmaps are opt-in.

- **Live** mode (default): confXarm64 has no consented hall-presence feed. Official KCNA is 9–12 Nov 2026. Live stays empty — it does **not** silently fill with demo numbers. Agenda / Must prefs are intentions, not attendance.
- **Synthetic** mode: deterministic SAMPLE 12-talk catalog scenario, demo clock `2026-11-10 11:20 America/Denver`, 48 fictional people (`@example.test`). Banner: **Synthetic demo data — not live attendance**.
- Full-session rule: join within 5 minutes of start and dwell ≥ 90% of scheduled length (or still present once that threshold is reached). Otherwise partial, or **unknown** when there is no join/leave evidence.
- No GPS. SAMPLE session titles are labeled SAMPLE; associated counts are simulated.

Opt-in aggregate gauges (no names/emails): `FLOORWISE_SYNTHETIC_OTEL=1`. Service namespace `floorwise-synthetic-demo`, attribute `floorwise.synthetic=true`. Off by default — confXarm64 will not send demo series into a live Dash0 dataset unless you set that flag.

Importable Perses dashboard (official Dash0 import format). confXarm64 does **not** auto-import:

```bash
# Only if you already have a Dash0 token. Names only — paste values locally.
# GET http://127.0.0.1:43181/api/tools/dash0/dashboard.json
curl -X POST "${DASH0_API_BASE_URL}/api/import/dashboard" \
  -H "Authorization: Bearer ${DASH0_AUTH_TOKEN}" \
  -H "Dash0-Dataset: ${DASH0_DATASET}" \
  -H "Content-Type: application/json" \
  --data-binary @dash0/floorwise-synthetic-engagement.json
```

Docs: [Import a dashboard](https://www.dash0.com/docs/api-reference/operations/post/api/import/dashboard), [Query spans](https://www.dash0.com/docs/api-reference/operations/post/api/spans).

## Radar (Skyhook only)

**Skyhook Radar** is the CNH Kubernetes platform. The live app at `https://confxarm64.cnh.radarhq.io` is this planner, not the Radar control plane — Tools does not treat that URL as a Radar UI. Do not helm-install `skyhook/radar` on CNH. Optional local minikube Radar is `infra/local-minikube.sh` (`RADAR_UI_URL`).

This tab does **not** call `api.radar.io` (a different company) and does not invent geofences. Without a real Skyhook Radar UI URL it stays **Needs setup**. PDF booth pins are image-relative (`nx`/`ny`) and are never sent as lat/lng.

Env names: `RADAR_UI_URL`.

## SonarQube / SonarQube Cloud

Not npm-audit, not oxlint, not Gitar. Uses Web API:

- `GET /api/qualitygates/project_status`
- `GET /api/measures/component`
- `GET /api/issues/search`
- `GET /api/components/show`

Auth: `Authorization: Bearer ${SONAR_TOKEN}` ([SonarQube Server Web API](https://docs.sonarsource.com/sonarqube-server/2025.4/extension-guide/web-api), [SonarQube Cloud Web API](https://docs.sonarsource.com/sonarqube-cloud/appendices/web-api)).

Missing metric values render as **unavailable**, never coerced to 0.

Env names: `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, optional `SONAR_ORGANIZATION`.

Scanner config is `sonar-project.properties` (`sonar.projectKey=floorwise`). confXarm64 does not upload source and does not invent scan results in the UI. If you already operate a server and supply `SONAR_TOKEN`:

```bash
# Requires sonar-scanner or Docker, plus SONAR_HOST_URL + SONAR_TOKEN in gitignored .env.
./infra/sonar-scan.sh
```

CI on GitHub does **not** run Sonar. `.github/workflows/ci.yml` is `npm test` and `npm run build` only (Gitar diagnoses those jobs). `./infra/sonar-scan.sh` remains a local optional path and still refuses to upload without a token you supply.

Optional local SonarQube (not CNH — it will not fit the quota): `infra/local-minikube.sh --with-sonar`. Still needs a token you create before any upload. Cluster bootstrap: [`infra/README.md`](../infra/README.md).

## Run

Same as the root README. After `npm run dev`:

- UI: http://127.0.0.1:43180/tools/dash0
- API: http://127.0.0.1:43181/api/tools
