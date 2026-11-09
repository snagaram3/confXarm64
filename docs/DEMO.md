# confXarm64 3-minute demo — WeMakeDevs Cloud Native Hackathon (9 Nov 2026)

Product: **confXarm64**, a private KCNA 2026 trip planner. Home is the planner (`/`), not 3D. Rankings come from Elasticsearch over the official main schedule. The map is a schematic of official labels — **not** verified step-free navigation. Cluster bootstrap: [`infra/README.md`](../infra/README.md).

Run locally (Mac). Do **not** `docker compose down -v`, do **not** touch a foreign `:9200` cluster.

```bash
cd /path/to/confXarm64
git fetch origin cursor/minimalist-map-ui-cde4
git checkout cursor/minimalist-map-ui-cde4
git pull --ff-only origin cursor/minimalist-map-ui-cde4
docker compose -p floorwise up -d elasticsearch
curl -sS "http://127.0.0.1:19200/_cluster/health?wait_for_status=yellow&timeout=90s"
ELASTICSEARCH_URL=http://127.0.0.1:19200 npm run dev
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180). API is `:43181`. confXarm64 ES is host **`:19200`**.

**Wi-Fi backup:** this script is local. If venue Wi-Fi dies, keep `npm run dev` + `floorwise-es` running, demo from the laptop, skip Radar Cloud. Screenshots in this repo’s agent run are fallbacks. Do not reseed.

---

## 0:00–0:20 — Overall (planner, honesty)

1. Show `/` — onboarding or **Your KCNA visit**, not a WebGL homepage.
2. If needed: **Preview with sample persona** (labeled Alex Rivera) or pick days and continue.
3. Point at the footer: map is **not verified step-free navigation**. Quiet rooms come from official amenities; there is **no captioned-session filter** because the schedule snapshot does not publish that field.

Judges should hear: private companion, official 601-record snapshot, no invented routes or live occupancy.

---

## 0:20–0:40 — This or That (taste, not official filters)

The Linux Foundation schedule already filters by audience level / track / type. confXarm64 must look like a **taste deck**, not another chip row.

1. Onboarding: pick days → **Deal official talks**. (Already onboarded: Home → **Deal official talks**.)
2. Show a real card: title, track, audience level, room, time from the official snapshot — not a mock.
3. **Love** one talk (or swipe right / →). Taste bubbles resize. Live itinerary preview fills with a **Why** line (`Matches: …; you loved N similar talks`).
4. **Skip** or **Maybe** a second card. Topic weights go to Elasticsearch as boosts — the list is ES order, not a browser re-sort. Say out loud: this is not `?audience-level=advanced`.

Keyboard backup: ← skip · → love · ↓ maybe. Skip the deck anytime.

---

## 0:40–1:20 — Elasticsearch (“Find the Right Talk”)

Criteria: ES is the data layer; keyword / semantic / hybrid; why-it-matched; fast.

1. On **Home**, the **Find the right talk** box is already visible. (Same control on **For you**.)
2. Query: `something on eBPF and security`
3. Wait ~160ms debounce. **How search works** shows `engine=elasticsearch mode=hybrid-bm25-knn retriever=… took=…ms`.
4. Open a result: **Why** line (BM25 and/or kNN), **Matched fields**, gold `<em>` snippets from the abstract — even when “security” is not in the title (example: *Beyond Harnesses and Sandboxes: Runtime Protection for AI Agents with eBPF*).
5. Toggle **Keyword / Lexical vector / Hybrid**. Scores and snippets change. Hybrid tries RRF of BM25 + lexical kNN (in-cluster trial license); if retrievers are rejected the UI shows `function_score` — say that out loud. Do not claim hosted embeddings.
6. Filter **Tue 10** and a track (e.g. Security) if you want a second beat.
7. **Ask the schedule** RAG: skip unless an LLM key is actually set on the server. This app will not invent a summary.

Backup query if the first is slow: `cilium network policy`.

---

## 1:20–2:10 — Merge Forward (inclusive / accessible)

Criteria: real a11y, honest about what the data supports.

1. Skip link: Tab once → **Skip to content** (map view also has `<main id="main-content">`).
2. TopBar **Accessibility** (or profile avatar → **Accessibility**).
3. **High contrast** — navy/white flips to black + AA-tested fills. **Larger text** — 125%. **Reduce motion**.
4. Scroll Home to **Inclusion rooms (official)** — quiet rooms, prayer, first aid from `amenities.json`. Each says **no verified step-free route**.
5. **For you** / **Itinerary**: result cards and agenda rows expose title, time, room to screen readers (`Why ·`, `Room`, `Time`).
6. **Map → Expo**: banner *Not verified step-free navigation*. Open **Booths on this floorplan (keyboard list)**, Tab/Enter a pin. Pins themselves are buttons (Enter/Space).

Do **not** claim an accessible indoor graph.

---

## 2:10–2:50 — Radar + Tools URLs (Kubernetes)

Criteria: confXarm64 runs on the **provided CNH cluster**; Radar visualizes it; Dash0 / Sonar adapters stay honest.

Primary path ([`infra/README.md`](../infra/README.md)):

```bash
./infra/bootstrap.sh --print-plan
kubectl -n team-confxarm64 get pods,svc
```

Team slug `confxarm64`, namespace `team-confxarm64`, URL **https://confxarm64.cnh.radarhq.io**. Do not create a new Radar team. Do not helm-install `skyhook/radar` on CNH (Radar is already there). Service `app` port 80 is what the platform routes.

Show pods: `elasticsearch-0` (StatefulSet + PVC), `api-*`, `web-*`, completed `confxarm64-seed`. Open the CNH URL (planner home, not 3D).

**Judge beat — Tools (do not invent live data):**

1. https://confxarm64.cnh.radarhq.io/tools/dash0 — Needs setup until `DASH0_AUTH_TOKEN` exists; link to `https://app.dash0.com` only when query creds exist. There is no self-hosted Dash0.
2. https://confxarm64.cnh.radarhq.io/tools/radar — **Skyhook Radar** (`RADAR_UI_URL` = the CNH URL) labeled separately from the **api.radar.io** geofence adapter.
3. https://confxarm64.cnh.radarhq.io/tools/sonar — Needs setup without `SONAR_TOKEN`; never a fake quality gate.
4. https://confxarm64.cnh.radarhq.io/tools/elasticsearch — in-cluster `floorwise` plus nested Elastic Cloud · Jina. Needs setup until `ELASTIC_CLOUD_API_KEY` exists; do not invent Jina hits.
5. Open Radar Cloud at https://confxarm64.cnh.radarhq.io. Point it at namespace `team-confxarm64`. MCP: https://api.radarhq.io/mcp → Cloud Native Hackathon.

Optional local fallback only: `./infra/bootstrap.sh --local` (minikube). Not the judged CNH path.

**Venue-only leftovers:** make GHCR packages public, connect Gitar (Settings → Configuration while signed in), add the Radar-table email if MCP is 403, Dash0 token if you want Tools → Dash0 live. Do not commit kubeconfigs or `rhc_` tokens.

**Wi-Fi / no Docker backup:** show `infra/` (chart, bootstrap, README). Do not fake a cluster.

---

## 2:50–3:00 — Close

confXarm64: Elasticsearch hybrid over the real schedule, honest accessibility, on the CNH Radar cluster. Home stays the planner.

---

## Exact clicks / queries cheat sheet

| Track | Click / type |
| --- | --- |
| Taste | Days → Deal official talks → Love / Skip → watch interest map + live preview + recs reorder |
| Search | Home → Find the right talk → `something on eBPF and security` → How search works → Keyword / Semantic / Hybrid |
| Merge Forward | Tab → Skip to content → Accessibility → High contrast → Larger text → Inclusion rooms → Map → Expo → keyboard booth list |
| Radar | `./infra/bootstrap.sh` → https://confxarm64.cnh.radarhq.io → Tools → Radar (Skyhook link) |
| Dash0 | Tools → Dash0 (`/tools/dash0`); `https://app.dash0.com` only with creds |
| Sonar | Tools → Sonar (honest needs-setup); not CI. Gitar is `.gitar/` on GitHub |
| Overall | `/` is planner; map disclaimer; no RAG without a key |

## What this environment verified vs not

Verified in the agent VM: unit tests (including axe-core fixture + high-contrast AA), typecheck, live `POST /api/rank` hybrid on the existing **floorwise** ES (this VM publishes ES on `:9200`; Mac stays `:19200`), web `:43180` / API `:43181`.

Not verified here: CNH kubectl apply (Radar MCP 403 / no kubeconfig in this VM), minikube/kind/k3d as a judged path, Dash0 account, Gitar GitHub App install, LLM RAG. GitHub Actions CI (`npm test` / `npm run build`) and `build-and-deploy` run on this public GitHub repo.
