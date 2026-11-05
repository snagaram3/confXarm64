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

Do **not** run `docker compose down -v`, `docker volume rm`, or any data-dir wipe. Existing Elasticsearch volumes are kept.

## Run (Docker Elasticsearch)

Cluster health is **`http://127.0.0.1:9200/_cluster/health`** (not Kibana, not `:9200/` alone). Yellow or green is ready; red is not.

```bash
docker compose up -d elasticsearch
curl -sS "http://127.0.0.1:9200/_cluster/health?wait_for_status=yellow&timeout=90s&pretty"
npm install
npm run dev
```

Then in another terminal:

```bash
curl -sS http://127.0.0.1:43181/api/health
curl -sS http://127.0.0.1:43180/api/health
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180). First boot can sit on **red** while Elasticsearch forms the cluster. The API now waits up to **120s** for yellow/green (the old 20s wait is what printed `not ready after 20000ms (red)`). Compose healthchecks also wait for yellow, not a bare HTTP 200 on a red cluster.

If `/_cluster/health` is still red after that window, inspect it — do not delete the volume:

```bash
curl -sS "http://127.0.0.1:9200/_cluster/health?pretty"
curl -sS "http://127.0.0.1:9200/_cat/shards?v"
docker compose logs elasticsearch --tail 80
```

No Docker on the machine? `npm run es` downloads the official Elasticsearch 8.17 tarball and starts it on `:9200` (and now refuses to treat a red cluster as already running), then `npm run dev`.

All-in-one container (optional):

```bash
docker compose --profile full up --build
```

That serves the built app at `:43180`, with Elasticsearch on `:9200`.

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

**In:** Salt Palace L1–L3 sample map, profile → Must/Maybe/Meh for talks, scripted wayfinding to 255, crowd takes, official exhibitor slice with logos + user prefs, Elasticsearch ranking.

**Out:** Full KCNA26 schedule import, invented booth coordinates, ARKit/ARCore, beacons, live heatmaps, full auth, wiping Docker volumes.
