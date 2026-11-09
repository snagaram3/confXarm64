# Floorwise 3-minute demo — WeMakeDevs Cloud Native Hackathon (9 Nov 2026)

Product: **Floorwise**, a private KCNA 2026 trip planner. Home is the planner (`/`), not 3D. Rankings come from Elasticsearch over the official main schedule. The map is a schematic of official labels — **not** verified step-free navigation.

Run locally (Mac). Do **not** `docker compose down -v`, do **not** touch a foreign `:9200` cluster.

```bash
cd /path/to/Floorwise
git fetch origin cursor/minimalist-map-ui-cde4
git checkout cursor/minimalist-map-ui-cde4
git pull --ff-only origin cursor/minimalist-map-ui-cde4
docker compose -p floorwise up -d elasticsearch
curl -sS "http://127.0.0.1:19200/_cluster/health?wait_for_status=yellow&timeout=90s"
ELASTICSEARCH_URL=http://127.0.0.1:19200 npm run dev
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180). API is `:43181`. Floorwise ES is host **`:19200`**.

**Wi-Fi backup:** this script is local. If venue Wi-Fi dies, keep `npm run dev` + `floorwise-es` running, demo from the laptop, skip Radar Cloud. Screenshots in this repo’s agent run are fallbacks. Do not reseed.

---

## 0:00–0:20 — Overall (planner, honesty)

1. Show `/` — onboarding or **Your KCNA visit**, not a WebGL homepage.
2. If needed: **Preview with sample persona** (labeled Alex Rivera) or pick days and continue.
3. Point at the footer: map is **not verified step-free navigation**. Quiet rooms come from official amenities; there is **no captioned-session filter** because the schedule snapshot does not publish that field.

Judges should hear: private companion, official 601-record snapshot, no invented routes or live occupancy.

---

## 0:20–0:40 — This or That (taste, not official filters)

The Linux Foundation schedule already filters by audience level / track / type. Floorwise must look like a **taste deck**, not another chip row.

1. Onboarding: pick days → **Deal official talks**. (Already onboarded: Home → **Deal official talks**.)
2. Show a real card: title, track, audience level, room, time from the official snapshot — not a mock.
3. **Love** one talk (or swipe right / →). Taste bubbles resize. Live itinerary preview fills with a **Why** line (`Matches: …; you loved N similar talks`).
4. **Skip** or **Maybe** a second card. Recommended talks **reorder** (taste match %). Say out loud: this is not `?audience-level=advanced`.

Keyboard backup: ← skip · → love · ↓ maybe. Skip the deck anytime.

---

## 0:40–1:20 — Elasticsearch (“Find the Right Talk”)

Criteria: ES is the data layer; keyword / semantic / hybrid; why-it-matched; fast.

1. On **Home**, the **Find the right talk** box is already visible. (Same control on **For you**.)
2. Query: `something on eBPF and security`
3. Wait ~160ms debounce. **How search works** shows `engine=elasticsearch mode=hybrid-bm25-knn retriever=… took=…ms`.
4. Open a result: **Why** line (BM25 and/or kNN), **Matched fields**, gold `<em>` snippets from the abstract — even when “security” is not in the title (example: *Beyond Harnesses and Sandboxes: Runtime Protection for AI Agents with eBPF*).
5. Toggle **Keyword / Semantic / Hybrid**. Scores and snippets change. Hybrid tries RRF of BM25 + kNN; this 8.17 cluster may fall back to `function_score` — say that out loud.
6. Filter **Tue 10** and a track (e.g. Security) if you want a second beat.
7. **Ask the schedule** RAG: skip. No `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — Floorwise will not invent a summary.

Backup query if the first is slow: `cilium network policy`.

---

## 1:20–2:10 — Merge Forward (inclusive / accessible)

Criteria: real a11y, honest about what the data supports.

1. Skip link: Tab once → **Skip to content**.
2. TopBar **Accessibility** (or profile avatar → **Accessibility**).
3. **High contrast** — navy/white flips to black + AA-tested fills. **Larger text** — 125%. **Reduce motion**.
4. Scroll Home to **Inclusion rooms (official)** — quiet rooms, prayer, first aid from `amenities.json`. Each says **no verified step-free route**.
5. **For you** / **Itinerary**: result cards and agenda rows expose title, time, room to screen readers (`Why ·`, `Room`, `Time`).
6. **Map → Expo**: banner *Not verified step-free navigation*. Open **Booths on this floorplan (keyboard list)**, Tab/Enter a pin. Pins themselves are buttons (Enter/Space).

Do **not** claim an accessible indoor graph.

---

## 2:10–2:50 — Radar + Tools URLs (Kubernetes)

Criteria: Floorwise runs on Kubernetes; Skyhook Radar visualizes the cluster; Dash0 / Sonar adapters stay honest.

Primary path (README **Run on minikube + Helm**):

```bash
./scripts/minikube-up.sh
kubectl -n floorwise get pods,svc,ingress
kubectl -n radar get pods,svc,ingress
```

Show pods: `elasticsearch-0` (StatefulSet + PVC), `api-*`, `web-*`, completed `floorwise-seed`. Open the printed Floorwise URL (planner home, not 3D). curl `http://floorwise.$(minikube ip).nip.io/api/health` (or port-forward `svc/web 43180:80`).

**Judge beat — Tools (do not invent live data):**

1. Open `http://floorwise.$(minikube ip).nip.io/tools/dash0` — Needs setup until `DASH0_AUTH_TOKEN` exists; link to `https://app.dash0.com` only when query creds exist. There is no self-hosted Dash0.
2. Open `http://floorwise.$(minikube ip).nip.io/tools/radar` — **Skyhook Radar** link (`RADAR_UI_URL` / `http://radar.$(minikube ip).nip.io`) is labeled separately from the **api.radar.io** geofence adapter.
3. Open `http://floorwise.$(minikube ip).nip.io/tools/sonar` — Needs setup without `SONAR_TOKEN`; never a fake quality gate.
4. Open the Skyhook Radar UI URL (`http://radar.$(minikube ip).nip.io/` or `kubectl -n radar port-forward svc/radar 9280:9280` → http://127.0.0.1:9280). Point it at namespace `floorwise`.

Skyhook Radar — **official** install only ([in-cluster](https://radarhq.io/docs/configuration/in-cluster)):

```bash
helm repo add skyhook https://skyhook-io.github.io/helm-charts
helm repo update skyhook
helm upgrade --install radar skyhook/radar -n radar --create-namespace
```

or local CLI: `curl -fsSL https://get.radarhq.io | sh` then `kubectl radar --port=9280 --no-browser`.

**Venue-only:** organizers’ cluster/namespace, registry push, Radar Cloud account + `rhc_` token (shown once at app.radarhq.io), Dash0 token, Sonar token. This laptop demo does not have those.

**Wi-Fi / no Docker backup:** show `charts/floorwise` + `k8s/*.yaml` (StatefulSet, seed Job, probes, Secret placeholders) and README commands. Do not fake a cluster.

---

## 2:50–3:00 — Close

Floorwise: Elasticsearch hybrid over the real schedule, honest accessibility, Kubernetes + Radar-ready. Home stays the planner.

---

## Exact clicks / queries cheat sheet

| Track | Click / type |
| --- | --- |
| Taste | Days → Deal official talks → Love / Skip → watch interest map + live preview + recs reorder |
| Search | Home → Find the right talk → `something on eBPF and security` → How search works → Keyword / Semantic / Hybrid |
| Merge Forward | Tab → Skip to content → Accessibility → High contrast → Larger text → Inclusion rooms → Map → Expo → keyboard booth list |
| Radar | `./scripts/minikube-up.sh` → Floorwise URL → Tools → Radar (Skyhook link) → `http://radar.$(minikube ip).nip.io` |
| Dash0 | Tools → Dash0 (`/tools/dash0`); `https://app.dash0.com` only with creds |
| Sonar | Tools → Sonar; `./scripts/sonar-scan.sh` only with your token (Origin does not run GHA) |
| Overall | `/` is planner; map disclaimer; no RAG without a key |

## What this environment verified vs not

Verified in the agent VM: unit tests (including axe-core fixture + high-contrast AA), typecheck, live `POST /api/rank` hybrid on the existing **floorwise** ES (this VM publishes ES on `:9200`; Mac stays `:19200`), web `:43180` / API `:43181`.

Not verified here: minikube/kind/k3d (no Docker in this VM unless a later run reports otherwise), Radar Cloud, Dash0 account, Sonar token, venue kubeconfig, LLM RAG. GitHub Actions CI is in-repo but Origin will not execute it.
