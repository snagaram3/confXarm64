# Floorwise

Conference companion for Salt Palace — find the right talk, walk there, peek the room before you go.

Hackathon: WeMakeDevs Cloud Native Hackathon (make conferences easier). Primary prize track: **Elasticsearch**. Product name: Floorwise.

## One-command start

Elasticsearch is required for Must / Maybe / Meh ranking.

```bash
docker compose up -d
npm install
npm run dev
```

No Docker on the machine? `npm run es` downloads the official Elasticsearch 8.17 tarball and starts it on `:9200`, then run `npm run dev`.

Open [http://127.0.0.1:43180](http://127.0.0.1:43180). The API waits for Elasticsearch, seeds `src/data/catalog.json` into the `floorwise` index, and Vite proxies `/api` to it.

All-in-one container (optional):

```bash
docker compose --profile full up --build
```

That serves the built app at the same port, with Elasticsearch on `:9200`.

## Under-3-minute demo

Sample profile is already **Staff Platform Engineer · Kubernetes · observability · platform engineering · eBPF · OpenTelemetry**.

1. **Late for 255** — tap **I’m late for 255**. Follow altitude-aware steps from the West Temple doors (Level 1) up the east escalators to room **255** on the mezzanine. The path polyline moves with you; 155/255/355 stack.
2. **Must / Maybe / Meh** — switch to **Map** / **Agenda**. Room 255 (eBPF observability) is green Must. Toggle interests on the profile chip (try only `AI/ML`) and watch the map recolor from Elasticsearch.
3. **Crowd take** — with 255 selected, read the photo + one-line take (“Standing room. Sit along the back wall…”).
4. **Sponsor mirror** — **Sponsor** tab, Elastic booth. Seeded Must/Maybe visitors (including Alex Rivera) sit near the booth, ranked in Elasticsearch against Elastic’s tags.

Type `eBPF` or `255` in Agenda to show the **Find the right talk** hybrid query. Must rows include a **Why this rank** line (ES score, tag overlap, BM25, kNN cosine).

## Elasticsearch track

Ranking is **not** computed in the browser. `POST /api/rank` runs a hybrid query:

- **BM25** `multi_match` on title^3, abstract, tags, track, speaker, plus named `term` queries per interest (`tag:eBPF`, …)
- **Vector** `dense_vector` (48-dim tag/keyword embedding) with `cosineSimilarity` via `function_score`
- Hits become Must / Maybe / Meh from ES `_score` + tag overlap
- Response includes `matched_queries`, highlights, and a why-string the UI prints on Must items

Sponsor visitors use the same index (`kind: visitor`) at `POST /api/sponsor/:boothId/visitors`.

Re-seed without restarting the app: `npm run seed`.

## Optional: Dash0 / OpenTelemetry

The API is auto-instrumented. Leave env unset for local runs — no Dash0 key required.

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=https://ingress.<region>.aws.dash0.com
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <token>"
export OTEL_SERVICE_NAME=floorwise-api
npm run dev
```

Hit the demo path (rank + 255 nav). In Dash0 you should see `floorwise-api` spans for `/api/rank` and `/api/health`. `OTEL_CONSOLE=1` prints spans instead of exporting.

## Optional: Radar / Kubernetes

Day-to-day still uses `npm run dev`. To put Floorwise on a local cluster Radar can watch:

```bash
docker build -t floorwise:dev .
kubectl apply -k k8s
kubectl -n floorwise port-forward svc/floorwise 43180:80
```

That starts Elasticsearch + the app in namespace `floorwise`. Optional ingress: `k8s/ingress.yaml` (`floorwise.local`). Point Radar at this cluster; the Deployment/Service labels are `app.kubernetes.io/name=floorwise`.

## Optional: Gitar (Sonar)

PRs can be Gitar-reviewed using `.gitar.md` and the checklist in `CONTRIBUTING.md`. Nothing in the app blocks on Gitar.

## What is in / out

**In:** Salt Palace L1–L3 map, profile → Must/Maybe/Meh, scripted wayfinding to 255, crowd takes, sponsor mirror, seeded catalog (12 sessions, 6 booths).

**Out:** ARKit/ARCore, beacons, live heatmaps, full auth.
