# Floorwise tools (Sonar, Dash0, Radar, Elasticsearch)

Companion **Tools** surface: TopBar → Tools, or `/tools/{sonar|dash0|radar|elasticsearch}`. Map-first bottom nav is unchanged. Deep links, reload, and back work because Vite SPA fallbacks `/tools/*` to the app.

This is not sponsor-logo display. Each tab talks to a real adapter on the Floorwise API (`:43181`). Missing credentials show **Needs setup** with env **names** only.

## Access boundary

- Credentials live in gitignored `.env` (see `.env.example` for names). Never `VITE_*`, never committed.
- Clients cannot supply `url` / `endpoint` / `host` / `token` query or body fields.
- Dash0 query hosts are allowlisted (`api.*.aws.dash0.com`, `api.europe-west4.gcp.dash0.com`). Radar is `api.radar.io` only. Sonar host comes from `SONAR_HOST_URL` (http/https, no credentials in the URL, metadata IPs blocked).
- Elasticsearch uses `ELASTICSEARCH_URL` + `ELASTICSEARCH_INDEX` (Floorwise cluster). No arbitrary index console, no deletes.
- Radar lookup requires `consent: true` and an explicit UI action. Opening the tab does not geolocate.
- Responses are sanitized (tokens redacted). Lead emails/notes never appear in tools metrics or traces.
- `/api/tools` is this process’s companion API, scoped to the configured project/index/service name — not a public provider proxy.

## Elasticsearch

Reuses the existing hybrid BM25+kNN ranker. Tab shows cluster name/version/health, index document count, and sample rank hits/scores/why/timing from the real Floorwise client.

Mac: host `127.0.0.1:19200`, in-container `9200`, cluster `floorwise`, volume `floorwise_esdata`, container `floorwise-es`. Compose `-p floorwise`. Do **not** use an unrelated host `:9200` cluster.

```bash
docker compose -p floorwise up -d elasticsearch
curl -sS "http://127.0.0.1:19200/_cluster/health?pretty"
```

Env names: `ELASTICSEARCH_URL`, `ELASTICSEARCH_INDEX`, `ES_HOST_PORT`.

## Dash0 / OpenTelemetry

Three distinct layers — the UI names them separately:

1. **Local process counters** (requests, 5xx, rank latency, last trace id). Not proof Dash0 stored anything.
2. **OTLP exporter** if `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Export attempt ≠ remote receipt.
3. **Remote query** `POST {DASH0_API_BASE_URL}/api/spans` (official Dash0 Query API) filtered by `service.name`, last 15 minutes, only when `DASH0_API_BASE_URL` + `DASH0_AUTH_TOKEN` are set.

Env names: `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_SERVICE_NAME`, `DASH0_API_BASE_URL`, `DASH0_AUTH_TOKEN`, `DASH0_DATASET`, `DASH0_DASHBOARD_URL`.

`DASH0_DASHBOARD_URL` (default `https://app.dash0.com`) is shown on Tools → Dash0 only when query credentials exist. Floorwise Ingress `/tools/dash0` is this tab, not a self-hosted Dash0 product. The Dash0 Kubernetes operator (official Helm, namespace `dash0-system`) is a separate in-cluster install: OTLP/gRPC `ingress.<region>.aws.dash0.com:4317` via Secret `dash0-system/dash0-auth` key `token`. Export stays off until that secret and the endpoints exist.

### Participant dashboard

The Dash0 tab includes a participant/engagement dashboard.

- **Live** mode: Floorwise has no consented hall-presence feed. Official KCNA is 9–12 Nov 2026. Live stays empty — it does **not** silently fill with demo numbers. Agenda / Must prefs are intentions, not attendance.
- **Synthetic** mode: deterministic SAMPLE 12-talk catalog scenario, demo clock `2026-11-10 11:20 America/Denver`, 48 fictional people (`@example.test`). Banner: **Synthetic demo data — not live attendance**.
- Full-session rule: join within 5 minutes of start and dwell ≥ 90% of scheduled length (or still present once that threshold is reached). Otherwise partial, or **unknown** when there is no join/leave evidence.
- No GPS. SAMPLE session titles are labeled SAMPLE; associated counts are simulated.

Opt-in aggregate gauges (no names/emails): `FLOORWISE_SYNTHETIC_OTEL=1`. Service namespace `floorwise-synthetic-demo`, attribute `floorwise.synthetic=true`. Off by default — Floorwise will not send demo series into a live Dash0 dataset unless you set that flag.

Importable Perses dashboard (official Dash0 import format). Floorwise does **not** auto-import:

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

## Radar (two different products)

**Skyhook Radar** on the judged path is the CNH cluster UI at `https://confxarm64.cnh.radarhq.io` (`RADAR_UI_URL`). Do not helm-install `skyhook/radar` there. Optional local minikube Radar is `infra/local-minikube.sh`. This is **not** `api.radar.io`.

**api.radar.io geofence adapter** (same Tools tab, labeled separately):

Server uses `RADAR_SECRET_KEY` or `RADAR_PUBLISHABLE_KEY` against `https://api.radar.io` (reverse geocode + geofence search, both Publishable-class endpoints). The UI never embeds a secret. PDF booth pins are image-relative (`nx`/`ny`) and are never sent as lat/lng.

Actions (explicit only):

- Look up my location — browser geolocation, then server reverse geocode.
- Geocode the published Salt Palace street address (`90 S West Temple, Salt Lake City, UT`) — not indoor navigation.

Env names: `RADAR_SECRET_KEY`, `RADAR_PUBLISHABLE_KEY`.

## SonarQube / SonarQube Cloud

Not npm-audit, not oxlint, not Gitar. Uses Web API:

- `GET /api/qualitygates/project_status`
- `GET /api/measures/component`
- `GET /api/issues/search`
- `GET /api/components/show`

Auth: `Authorization: Bearer ${SONAR_TOKEN}` ([SonarQube Server Web API](https://docs.sonarsource.com/sonarqube-server/2025.4/extension-guide/web-api), [SonarQube Cloud Web API](https://docs.sonarsource.com/sonarqube-cloud/appendices/web-api)).

Missing metric values render as **unavailable**, never coerced to 0.

Env names: `SONAR_HOST_URL`, `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, optional `SONAR_ORGANIZATION`.

Scanner config is `sonar-project.properties` (`sonar.projectKey=floorwise`). Floorwise does not upload source and does not invent scan results in the UI. If you already operate a server and supply `SONAR_TOKEN`:

```bash
# Requires sonar-scanner or Docker, plus SONAR_HOST_URL + SONAR_TOKEN in gitignored .env.
./infra/sonar-scan.sh
```

`.github/workflows/ci.yml` runs the same scan on GitHub Actions using `SONAR_HOST_URL` / `SONAR_TOKEN` secrets. This Origin repository has **no GitHub Actions runner**. A **public GitHub repository** is required for Gitar and Actions. The script is the path that works immediately.

Optional local SonarQube (not CNH — it will not fit the quota): `infra/local-minikube.sh --with-sonar`. Still needs a token you create before any upload. Cluster bootstrap: [`infra/README.md`](../infra/README.md).

## Run

Same as the root README. After `npm run dev`:

- UI: http://127.0.0.1:43180/tools/dash0
- API: http://127.0.0.1:43181/api/tools
