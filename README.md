# Floorwise

Conference companion for Salt Palace — find the right talk, walk there, peek the room before you go.

Hackathon: WeMakeDevs Cloud Native Hackathon (make conferences easier). Primary prize track: **Elasticsearch**. Product name: Floorwise.

The UI is a **sample / demo catalog** (12 seeded talks, scripted 255 route). Official KCNA26 exhibitor names and booth numbers on the Sponsor surface come from the 5 Nov 2026 Expo Hall Map snapshot. Indoor booth coordinates, crowd telemetry, and a route graph were not published — unrated exhibitors stay **Unrated**, not silent Meh, and pins are not invented.

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

Do not add a `docker-compose.override.yml` that publishes `9200:9200` — Compose **appends** `ports` lists and would fight the existing container.

```bash
docker compose config | grep -E 'published|target|floorwise_esdata|ELASTICSEARCH_URL'
docker compose up -d elasticsearch
curl -sS "http://127.0.0.1:19200/_cluster/health?wait_for_status=yellow&timeout=90s&pretty"
npm install
npm run dev
```

Then in another terminal:

```bash
curl -sS http://127.0.0.1:43181/api/health
curl -sS http://127.0.0.1:43180/api/health
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180). First boot can sit on **red** while Elasticsearch forms the cluster. The API waits up to **120s** for yellow/green. Compose healthchecks wait for yellow inside the container (`127.0.0.1:9200`).

If Floorwise (`:19200`) is still red after that window, inspect that endpoint only — do not delete the volume and do not touch `:9200`:

```bash
curl -sS "http://127.0.0.1:19200/_cluster/health?pretty"
curl -sS "http://127.0.0.1:19200/_cat/shards?v"
docker compose logs elasticsearch --tail 80
```

No Docker on the machine? `npm run es` downloads the official Elasticsearch 8.17 tarball and starts it on loopback `:19200`, then `npm run dev`.

All-in-one container (optional):

```bash
docker compose --profile full up --build
```

That serves the built app at `:43180`. Elasticsearch is still published on host `:19200`; the app container talks to `http://elasticsearch:9200`.

## Exhibitor lead portal (local MVP)

A separate Floorwise-hosted surface — not an official sponsor site, organizer login, or CNCF form.

- Attendee connect: [http://127.0.0.1:43180/connect/elastic](http://127.0.0.1:43180/connect/elastic) (any catalog exhibitor id). Copy the `?from=link` URL for booth signage.
- Sponsor portal: [http://127.0.0.1:43180/sponsor-portal](http://127.0.0.1:43180/sponsor-portal)
- Read-only sample dashboard (synthetic `@example.com` / `@example.org` rows, not the real store): [http://127.0.0.1:43180/sponsor-portal/demo](http://127.0.0.1:43180/sponsor-portal/demo)

Must / Maybe / Meh, nearby visitors, and search fit **never** create a lead. The connect form requires an unchecked contact-consent box. Consent wording, version (`floorwise-lead-v1`), timestamp, exhibitor, and source are stored with the row.

Leads live in gitignored SQLite (`data/leads.sqlite` by default), not the public Elasticsearch catalog. Session cookies are httpOnly. There is **no** default password.

Provision a sponsor-scoped secret on the machine that runs the API (fail-closed until this exists):

```bash
npm run sponsor:provision -- elastic
```

The plaintext secret is written once to a gitignored file under `data/` (path printed; the value is not). Open that file locally and sign in at `/sponsor-portal`. Pass `--rotate` to replace a secret. Do not commit `data/`, `sponsor-credentials.json`, or `sponsor-secret-*.txt`.

This is a **local MVP**, not production identity or privacy posture: file-backed scrypt hashes, cookie sessions, and SQLite on disk. Do not expose the lead database or `:43181` on a public network.

## Under-3-minute demo

Sample profile is already **Staff Platform Engineer · Kubernetes · observability · platform engineering · eBPF · OpenTelemetry**.

1. **Late for 255** — tap **I’m late for 255**. Follow altitude-aware steps from the West Temple doors (Level 1) up the east escalators to room **255** on the mezzanine. Scripted sample route, not live indoor positioning.
2. **Must / Maybe / Meh (sessions)** — **Map** / **For you**. Room 255 is green Must from Elasticsearch. Toggle interests (try only `AI/ML`) and watch the map recolor.
3. **Crowd take** — with 255 selected, read the seeded photo + one-line take.
4. **Sponsors** — **Booths** tab or the Level 1 exhibitor dock. Official names/booth numbers from the expo PDF. Tap **Must go / Maybe / Meh** on a card; a matching bot bounces on the pin and the card. Unrated stays Unrated until you pick. Prefs persist in `localStorage` and stay in sync. Radar uses a monogram because no official mark was obtained.

Type `eBPF` or `255` in For you to show the hybrid query. Must rows include a **Why this rank** line.

## Elasticsearch track

Ranking is **not** computed in the browser. `POST /api/rank` runs a hybrid query:

- **BM25** `multi_match` on title^3, abstract, tags, track, speaker, plus named `term` queries per interest
- **Vector** `dense_vector` (48-dim) with cosine via `function_score`
- Hits become Must / Maybe / Meh from ES `_score` + tag overlap

Sponsor **visit prefs** (the colored bots) are your picks, not the Elasticsearch attendee-fit rank. Search fit still shows on the selected exhibitor card when the index is ready.

Re-seed without restarting the app: `npm run seed`.

## Optional: Dash0 / OpenTelemetry

Leave env unset for local runs — no Dash0 key required.

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=https://ingress.<region>.aws.dash0.com
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <token>"
export OTEL_SERVICE_NAME=floorwise-api
npm run dev
```

## Optional: Radar / Kubernetes

```bash
docker build -t floorwise:dev .
kubectl apply -k k8s
kubectl -n floorwise port-forward svc/floorwise 43180:80
```

## What is in / out

**In:** Salt Palace L1–L3 sample map, profile → Must/Maybe/Meh for talks, scripted wayfinding to 255, crowd takes, official exhibitor slice with logos + user prefs, Elasticsearch ranking, opted-in exhibitor leads with a scoped portal.

**Out:** Full KCNA26 schedule import, invented booth coordinates, ARKit/ARCore, beacons, live heatmaps, production SSO, CRM/email sends, wiping Docker volumes, harvesting contacts from Must/Maybe/Meh or nearby.
