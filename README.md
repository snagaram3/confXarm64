# Floorwise

Private conference-trip companion for Salt Palace + Hyatt during KubeCon + CloudNativeCon North America 2026. Plan a visit from official sessions, save a day-by-day itinerary, then open the map only when you need a room or booth.

Hackathon: WeMakeDevs Cloud Native Hackathon. Primary prize track: **Elasticsearch**. Product name: Floorwise. Not an official Linux Foundation, CNCF, Grok, or sponsor app.

## Retrieve this update (non-destructive)

From the repo root, on the same branch:

```bash
git fetch origin cursor/minimalist-map-ui-cde4
git checkout cursor/minimalist-map-ui-cde4
git pull --ff-only origin cursor/minimalist-map-ui-cde4
```

Do **not** run `docker compose down -v`, `docker volume rm`, or any data-dir wipe. Do **not** stop or repair any other Elasticsearch/Kibana container (including a pre-existing `:9200` cluster). Floorwise uses its own container `floorwise-es` and volume `floorwise_esdata`.

## Run (Docker Elasticsearch)

Floorwise publishes Elasticsearch on **loopback :19200** so it does not bind host `:9200` or `:9300`. In-container HTTP remains `:9200`. The host-side API default is `http://127.0.0.1:19200`. The Compose `app` service (optional `--profile full`) must keep `ELASTICSEARCH_URL=http://elasticsearch:9200` — that is container DNS, not the host port.

Cluster health is **`http://127.0.0.1:19200/_cluster/health`**. Expect `"cluster_name" : "floorwise"`. Yellow or green is ready. A red `docker-cluster` on `:9200` is a different process; leave it alone.

```bash
docker compose -p floorwise config | grep -E 'published|target|floorwise_esdata|ELASTICSEARCH_URL'
docker compose -p floorwise up -d elasticsearch
curl -sS "http://127.0.0.1:19200/_cluster/health?wait_for_status=yellow&timeout=90s&pretty"
npm install
npm run dev
```

Use `-p floorwise` so Compose reuses `floorwise-es` / `floorwise_esdata` instead of a new `floorwise2` project when the folder is named `floorwise 2`. Host ES URL stays `http://127.0.0.1:19200`. Skip `vapid:provision` / `sponsor:provision` if those gitignored keys already exist.

Then in another terminal:

```bash
curl -sS http://127.0.0.1:43181/api/health
curl -sS http://127.0.0.1:43180/api/health
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180) for the **trip planner home** (not the 3D map). First boot can sit on **red** while Elasticsearch forms the cluster. The API waits up to **120s** for yellow/green and then indexes the official 601-record main schedule.

No Docker on the machine? `npm run es` downloads the official Elasticsearch 8.17 tarball and starts it on loopback `:19200`, then `npm run dev`.

This cloud preview may point `ELASTICSEARCH_URL` at a local tarball on `:9200`. Mac / other hosts should keep **19200**.

## Accessibility (Merge Forward)

Profile → **Accessibility** (also TopBar on desktop): high contrast, larger text, and reduce motion. The OS reduced-motion setting always wins. Skip-to-content, labeled search, itinerary, and Expo pin keyboard list are in place. Quiet / prayer / first-aid rooms come from official `amenities.json` — Floorwise does **not** invent captioned-session filters or a verified step-free map.

## Palette

Event-inspired colors sampled from the live [KubeCon + CloudNativeCon North America 2026](https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/) site (navy `#113e82`, CTA pink `#d62293`, schedule gold `#ffee88`). Surfaces and contrast tints are Floorwise adjustments, not official brand hexes. Must/Maybe/Meh stay their own greens/amber/gray so they are not confused with event navy. See `docs/design-palette.md`. This is not an LF/CNCF app.

## What you get

1. **Trip planner home (`/`)** — first visit picks on-site days (8–12 Nov 2026) then a **This or That** swipe deck of official session cards (Love / Maybe / Skip). That builds a taste profile — interest map + vibe dials — not a copy of the official schedule filters. Optional display name and role. No email, password, or payments. Returning visits show a live itinerary preview, recommended official sessions with Elasticsearch + taste-match reasons, catalog exhibitors whose tags overlap, and the saved itinerary. Preferences persist in **this browser only**, keyed to a local attendee id — not a cloud account. A labeled **sample persona** (Alex Rivera) is opt-in, never the silent default.
2. **For you / itinerary** — same ranking and agenda as before: Must/Maybe/Meh, overlap warnings, timezone, ICS download. SAMPLE 255 is not in the primary nav; it stays on the Map → Sample schematic.
3. **Expo map** — official `expo.pdf` rendered as a zoom/pan floorplan. Catalog exhibitor logos sit on PDF-text booth numbers (image-relative anchors, not indoor GPS). Pins use the real sponsor assets in `/public/sponsors`; missing art falls back to a monogram, never a generated logo. Tap/keyboard selects a pin, centers it, and opens a compact booth sheet (number, ranking why, Must go). A personal **Must go** star/ring is attendee-scoped in this browser (`floorwise.sponsorPrefs.<uuid>`), distinct from selection, and filtered from the Expo shortlist. **Show on Expo** / **Find booth** from Home or For you focuses that pin — it does not draw a walk, GPS, ETA, or play the South→L2 DEMO. Unplaced exhibitors stay in lists, never at invented coordinates. The map is **not** mounted on Home (no background WebGL).
4. **Venue map** — optional, at `/map` or a legacy share such as [`/?origin=entrance-south&destination=east-registration&view=3d`](http://127.0.0.1:43180/?origin=entrance-south&destination=east-registration&view=3d). 3D is the map default when WebGL is available and reduced motion is off (`view=2d` or stored Flat still wins). The illustrative South Entrance → L2 DEMO plays **only** on that explicit share, not on ordinary Home or Map. Pause / Replay / Explore remain. The DEMO floor change is **not** a surveyed elevator. Tapping a recommended talk or booth focuses that place; it does **not** hijack the South→L2 demo as a route to that session. SAMPLE 255 walk is still on the Sample schematic only.
3. **Official schedule** — 601 main-schedule records (registration, breaks, showcases, and talks — not 601 technical talks), 715 speakers, 37 room labels. Source timezone America/Denver (−07:00) for 8–12 Nov 2026. Related colocated feeds (229 / 14 / 38) stay distinct. Elasticsearch hybrid search ranks the official catalog.
4. **Personal agenda** — add/remove, per-day timeline, upcoming/ongoing/finished, next-session countdown, overlap warnings, planning-buffer gaps labeled as estimates. Display timezone: conference America/Denver or America/Chicago. Stored only in this browser. Optional ICS download; Floorwise never writes to a real calendar.
5. **Keynote picks** — curated from the official Keynote Sessions track. Names, titles, photos, and bios come from the published schedule. Not a popularity ranking.
6. **Reminders** — opt-in per session, default 10 minutes (5/10/15). Browser permission is requested only from **Enable notifications**. Background Web Push needs VAPID keys (`npm run vapid:provision`, gitignored `data/vapid.json`), a supported browser, HTTPS or localhost, and a running API. Until VAPID exists, in-tab / foreground notifications are clearly labeled.
7. **Tools** — TopBar **Tools** (not a sixth bottom-nav item) opens `/tools/dash0` with tabs for Sonar, Dash0, Radar, and Elasticsearch. Each tab shows real adapter state (connected / needs setup / empty / error), refresh, and source/time. Deep links: `/tools/sonar`, `/tools/dash0`, `/tools/radar`, `/tools/elasticsearch`. Dash0 includes a labeled **synthetic** participant dashboard on the SAMPLE catalog; Live attendance is explicitly unavailable. See `docs/tools.md`.

**Ask / Best pick / day chips** live on **For you**. Ask understands Floorwise origins (expo, Salt Palace, Hyatt, sample 255), step-free (sample walk copy only), and conference days. Best pick uses official sold-out, agenda overlap, ended, colocated-pass, and unplaced-room signals — never live occupancy. **View on map** / **Take me there** selects that talk’s real room or an exhibitor’s PDF booth on the 3D map; it does not play the SAMPLE 255 walk unless that talk is the sample 255 session. Exhibitor chips use official catalog tags overlapping your search/interests, not walking distance. Sample 12-talk catalog + scripted 255 route remain on the **Sample schematic** surface and are labeled SAMPLE. They are not merged into the official Elasticsearch catalog. Synthetic Tools dashboard people are fictional `@example.test` records, not live hall counts.

See `docs/feature-adoption.md` for what was ported from the reference bundle and how to try each piece.

## Reminders (local Web Push)

```bash
npm run vapid:provision
```

That writes public + private VAPID keys to gitignored `data/vapid.json`. The private key is not printed. Restart the API. Then tap **Enable notifications** in Agenda.

Foreground-only mode (no VAPID, or a browser that cannot subscribe): in-tab `Notification` timers while the page stays open. That limitation is shown on Agenda and session detail. No email, SMS, or CRM sends.

Test fire is localhost-only (`POST /api/reminders/test-fire`) and uses a synthetic session id.

## Exhibitor lead portal (local MVP)

A separate Floorwise-hosted surface — not an official sponsor site.

- Attendee connect: [http://127.0.0.1:43180/connect/elastic](http://127.0.0.1:43180/connect/elastic)
- Sponsor portal: [http://127.0.0.1:43180/sponsor-portal](http://127.0.0.1:43180/sponsor-portal)
- Sample dashboard: [http://127.0.0.1:43180/sponsor-portal/demo](http://127.0.0.1:43180/sponsor-portal/demo)

Leads live in gitignored SQLite (`data/leads.sqlite`). Reminders live in a separate `data/reminders.sqlite`. Agenda choices are never sent to sponsors.

```bash
npm run sponsor:provision -- elastic
```

## Demo

Fresh `/` does **not** assume Alex Rivera. Set your own topics, or tap **Preview with sample persona**.

1. **Onboarding** — pick topics (required), days on site (required), optional role/name/goals. Save. Rankings hit `POST /api/rank` with those interests.
2. **Home** — recommended official talks with Why copy, add to itinerary, overlap warning if a saved talk collides. Exhibitors list catalog tag overlap, not ads.
3. **Edit topics** — profile sheet. Saved talks stay. Ranked list changes.
4. **Itinerary** — day-by-day, overlap, planning buffer, ICS. Stored in `localStorage` as `floorwise.savedSessions.<attendeeId>` (legacy unscoped key is migrated once). Changing topics does not wipe it.
5. **Map** — Map tab mounts 3D/flat only then. Show on map focuses the real room or official booth, or explains an unmapped label. Illustrative South→L2 DEMO: `/map?origin=entrance-south&destination=east-registration&view=3d`.
6. **Sample 255** — Map → Sample schematic, not a primary nav item.

## Elasticsearch track

Home and For you expose **Find the right talk**: type natural language such as `something on eBPF and security`. `POST /api/rank` ranks the official main schedule:

- **Keyword** — BM25 `multi_match` on title^3, abstract^2, tags, track, speaker (`fuzziness: AUTO`)
- **Semantic** — kNN cosine on a 48-dim `dense_vector` stored with each abstract (local vocab, not a hosted LLM embedding)
- **Hybrid** (default) — Reciprocal Rank Fusion of BM25 + kNN when this Elasticsearch accepts `retriever.rrf`; otherwise `function_score` BM25 + `cosineSimilarity`
- Result cards show **why** (retriever, score, matched tags) plus highlighted abstract snippets and matched fields
- Day chips and an official-track filter. Rankings are personal fit, not a popularity score
- **How search works** panel lets judges toggle keyword / semantic / hybrid and see `engine`, `mode`, `retriever`, and `tookMs`
- Ask-the-schedule RAG is skipped unless `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set. This repo does not invent a summary

Do **not** run `npm run seed` against a live demo index unless you intend to wipe and rebuild `floorwise`. API boot seeds only when the `floorwise` index is missing (`FLOORWISE_FORCE_SEED=1` to override). Kubernetes uses a seed Job and `FLOORWISE_SKIP_SEED=1` on the API.

## Run on minikube + Helm (primary local cluster)

Helm chart `charts/floorwise` deploys web, API, Elasticsearch **StatefulSet + PVC**, seed **Job**, ConfigMap, Secret placeholders, probes, and an nginx Ingress. In-cluster ES stays `http://elasticsearch:9200` (cluster name `floorwise`). Raw kustomize under `k8s/` is kept for kind/k3d; prefer Helm.

`scripts/minikube-up.sh` starts minikube at **4 CPU / 8192 Mi** (enough for ES + app + Skyhook Radar; add ~2 Gi and `--with-sonar` only if you want in-cluster SonarQube), enables the ingress addon, builds/loads `floorwise-api` / `floorwise-web`, then `helm upgrade --install`.

```bash
./scripts/minikube-up.sh
# optional: ./scripts/minikube-up.sh --with-sonar
# skip extras: ./scripts/minikube-up.sh --skip-radar --skip-dash0
```

Equivalent manual commands:

```bash
minikube start --cpus=4 --memory=8192
minikube addons enable ingress
docker build -f docker/api.Dockerfile -t floorwise-api:dev .
docker build -f docker/web.Dockerfile -t floorwise-web:dev .
minikube image load floorwise-api:dev
minikube image load floorwise-web:dev
IP="$(minikube ip)"
helm upgrade --install floorwise charts/floorwise \
  --namespace floorwise --create-namespace --timeout 8m \
  --set ingress.host="floorwise.${IP}.nip.io" \
  --set elasticsearch.url=http://elasticsearch:9200 \
  --set elasticsearch.clusterName=floorwise \
  --set config.radarUiUrl="http://radar.${IP}.nip.io" \
  --set config.syntheticOtel=0
```

Reachable URLs (script prints these with the live minikube IP):

| What | URL |
| --- | --- |
| Planner home | `http://floorwise.$(minikube ip).nip.io/` |
| Tools → Dash0 | `http://floorwise.$(minikube ip).nip.io/tools/dash0` |
| Tools → Radar | `http://floorwise.$(minikube ip).nip.io/tools/radar` |
| Tools → Sonar | `http://floorwise.$(minikube ip).nip.io/tools/sonar` |
| Dash0 product UI | `https://app.dash0.com` (needs a Dash0 account; not self-hosted) |
| Skyhook Radar UI | `http://radar.$(minikube ip).nip.io/` |
| SonarQube UI (only `--with-sonar`) | `http://sonarqube.$(minikube ip).nip.io/` |

Port-forward fallbacks if nip.io or the ingress addon is down:

```bash
kubectl -n floorwise port-forward svc/web 43180:80    # http://127.0.0.1:43180
kubectl -n floorwise port-forward svc/api 43181:43181
kubectl -n radar port-forward svc/radar 9280:9280     # http://127.0.0.1:9280
kubectl -n floorwise get pods,svc,ingress
```

Do **not** point Floorwise at an unrelated host `:9200` cluster. Do **not** `docker compose down -v`. The seed Job **deletes and rebuilds** the `floorwise` index on first Helm install — do not re-run it against a live demo.

### Secrets (never commit)

Charts install cleanly with empty placeholders. Tools tabs stay **Needs setup** until you fill them. Helm `lookup()` will not wipe an existing `floorwise-secrets` on upgrade.

| Secret | Keys |
| --- | --- |
| `floorwise/floorwise-secrets` | `DASH0_AUTH_TOKEN`, `OTEL_EXPORTER_OTLP_HEADERS` (`Authorization=Bearer …`), `SONAR_TOKEN`, `RADAR_SECRET_KEY` / `RADAR_PUBLISHABLE_KEY` (api.radar.io only) |
| `dash0-system/dash0-auth` | `token` (no `Bearer ` prefix) plus env `DASH0_OTLP_GRPC_ENDPOINT=ingress.<region>.aws.dash0.com:4317`, `DASH0_API_ENDPOINT=https://api.<region>.aws.dash0.com`, `DASH0_OTLP_HTTP_ENDPOINT=https://ingress.<region>.aws.dash0.com` |
| `radar/radar-cloud-config` | `token` (`rhc_…` from https://app.radarhq.io) — optional Cloud AI SRE, off by default |

Then `kubectl -n floorwise rollout restart deploy/api`.

### Skyhook Radar (official install — do not invent flags)

This is **Skyhook Radar** ([in-cluster docs](https://radarhq.io/docs/configuration/in-cluster), [Helm chart](https://github.com/skyhook-io/helm-charts/blob/main/charts/radar/README.md)) — **not** the Tools tab `api.radar.io` geofence adapter. Tools → Radar labels both. `RADAR_UI_URL` is the Skyhook Ingress.

`scripts/minikube-up.sh` already runs:

```bash
helm repo add skyhook https://skyhook-io.github.io/helm-charts
helm repo update skyhook
helm upgrade --install radar skyhook/radar -n radar --create-namespace \
  --values deploy/minikube/values-radar.yaml \
  --set ingress.enabled=true \
  --set ingress.className=nginx \
  --set ingress.hosts[0].host="radar.$(minikube ip).nip.io" \
  --set cloud.enabled=false
```

Local CLI against any kubeconfig ([install docs](https://radarhq.io/docs/install)): `curl -fsSL https://get.radarhq.io | sh` then `kubectl radar --port=9280 --no-browser`.

Radar Cloud needs **their** account at [app.radarhq.io](https://app.radarhq.io). Generate the install command there (token shown once). Create `radar/radar-cloud-config` with key `token`; the minikube script then sets `cloud.enabled=true` and `cloud.existingSecret=radar-cloud-config`. Do not commit the `rhc_` token.

### Dash0 operator (official chart only)

[Installation docs](https://www.dash0.com/docs/dash0/monitoring/kubernetes/dash0-operator/installation). No Dash0 account in this repo — export stays **off** until the secret exists ([install without backend](https://www.dash0.com/docs/dash0/monitoring/kubernetes/dash0-operator/installation#installation-without-backend-configuration)):

```bash
helm repo add dash0-operator https://dash0hq.github.io/dash0-operator
helm repo update dash0-operator
helm upgrade --install dash0-operator dash0-operator/dash0-operator \
  --namespace dash0-system --create-namespace \
  --values deploy/minikube/values-dash0-operator.yaml
```

When `dash0-system/dash0-auth` (key `token`) plus `DASH0_OTLP_GRPC_ENDPOINT` / `DASH0_API_ENDPOINT` are set, the script adds official flags only:

`--set operator.dash0Export.enabled=true --set operator.dash0Export.endpoint=ingress.<region>.aws.dash0.com:4317 --set operator.dash0Export.apiEndpoint=https://api.<region>.aws.dash0.com --set operator.dash0Export.secretRef.name=dash0-auth --set operator.dash0Export.secretRef.key=token`

App OTLP HTTP ingest (`OTEL_EXPORTER_OTLP_ENDPOINT=https://ingress.<region>.aws.dash0.com`) is separate from operator gRPC `:4317`. `FLOORWISE_SYNTHETIC_OTEL` stays `0` unless you intend demo gauges.

### SonarQube (optional) + git CI

Two related things, kept distinct:

1. **Tools → Sonar** talks to `SONAR_HOST_URL` (real adapter state: needs setup / connected / empty / error). Optional in-cluster server: `./scripts/minikube-up.sh --with-sonar` (official `sonarqube/sonarqube` chart). Never commit a token; never upload source without a token you supply.
2. **Gitar (Sonar)** Never Merge Broken track: `.github/workflows/ci.yml` runs `npm test`, `npm run build`, and `SonarSource/sonarqube-scan-action@v5` against `SONAR_HOST_URL` / `SONAR_TOKEN` secrets. **This Origin repository has no GitHub Actions runner and no GitHub mirror** — Origin will not execute that workflow. Local/in-cluster path: `./scripts/sonar-scan.sh`.

### kind / k3d (secondary)

```bash
kind create cluster --name floorwise   # or: k3d cluster create floorwise
docker build -f docker/api.Dockerfile -t floorwise-api:dev .
docker build -f docker/web.Dockerfile -t floorwise-web:dev .
kind load docker-image floorwise-api:dev --name floorwise
kind load docker-image floorwise-web:dev --name floorwise
# k3d: k3d image import floorwise-api:dev floorwise-web:dev -c floorwise
helm upgrade --install floorwise charts/floorwise -n floorwise --create-namespace \
  --set elasticsearch.url=http://elasticsearch:9200 --set elasticsearch.clusterName=floorwise
# or: kubectl apply -k k8s
kubectl -n floorwise port-forward svc/web 43180:80
```

Venue cluster: retag images, `helm upgrade --install floorwise charts/floorwise -n "$FLOORWISE_NS" --create-namespace`. This repo cannot mint their kubeconfig.

## Verify

```bash
npm test
npm run build
# Optional, only with SONAR_TOKEN + SONAR_HOST_URL you supply:
# ./scripts/sonar-scan.sh
```

Origin will not run `.github/workflows/ci.yml`. That file is for a GitHub mirror.

## What is in / out

**In:** Official 2026 main schedule + speakers + rooms, PDF-anchored expo logos, verified venue room pins, personal agenda, keynote picks, opt-in Web Push reminders, sponsor lead portal, Elasticsearch ranking, sample 255 schematic (labeled), Tools adapters (Sonar / Dash0 / Radar / Elasticsearch) with a labeled synthetic Dash0 engagement demo.

**Out:** Surveyed indoor coordinates, step-free routing, live crowd counts presented as fact, invented celebrity attendees, popularity rankings, merging colocated feeds into the main catalog, email/SMS/CRM, writing to a real calendar, public deployment, wiping Docker volumes, harvesting contacts from Must/Maybe/Meh, uploading source to Sonar without your own token, sending synthetic series to Dash0 unless `FLOORWISE_SYNTHETIC_OTEL=1`.
