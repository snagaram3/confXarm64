# Gitar review brief — confXarm64

Use these files as the PR review prompt for **Gitar** on the Never Merge Broken track. Do not treat SonarQube / SonarCloud as part of this track. The app must stay demoable without Gitar.

Product name: **confXarm64** (formerly Floorwise). Personalized KubeCon trip planner. Homepage is **planner-first**; the map is secondary. Never accept a PR that makes a 3D map the primary home experience.

Ranking of sessions and booths MUST go through Elasticsearch (`POST /api/rank`, `POST /api/sponsor/:id/visitors`). Elasticsearch names and indexes may still say `floorwise`. Do not accept PRs that move Must/Maybe/Meh scoring back to in-memory JavaScript.

Forge of record: public GitHub https://github.com/snagaram3/confXarm64.git. Infra: [`infra/README.md`](../../infra/README.md). Cluster path is CNH team `confxarm64` / namespace `team-confxarm64` / Service `app` port 80. Helm chart: `infra/charts/confxarm64` with `values-cnh.yaml` and Action-owned `values-images.yaml`.

## Checks for every PR

1. `npm test` and `npm run build` succeed. Gitar should diagnose failing CI, not skip it.
2. Demo script still works: late-for-255 wayfinding, map recolor on profile change, crowd take on a Must pin, Elastic sponsor mirror.
3. `/api/rank` remains the source of session/room rank colors. `src/lib/ranking.ts` may hold labels/defaults only — not catalog scoring. Sponsor visit prefs are user-set Must/Maybe/Meh/Unrated (Unrated is not silent Meh).
4. OpenTelemetry stays optional: unset `OTEL_EXPORTER_OTLP_ENDPOINT` must not crash the API.
5. Seeded catalog still has 8–12 sample sessions including room 255. Exhibitors are a labeled official slice with expo-map booth numbers, not invented hall coordinates.
6. No ARKit/ARCore, beacons, heatmaps, or auth.
7. Tools tabs stay honest (needs setup / connected / empty / error). Do not invent Dash0, Radar, or telemetry live data. Do not invent official venue routes.
8. No secrets in git (no `.env`, kubeconfigs, `rhc_*`, Dash0 tokens, `SONAR_TOKEN` values). Public Elastic Cloud endpoints in `elastic/cloud.json` and Helm values are allowed; API keys must stay in env vars or Kubernetes Secrets only.
9. Do not add SonarQube, SonarCloud, `SONAR_TOKEN` CI jobs, or new sonar files.
10. CNH budget and host rules stay respected in Helm: no privileged, hostPath, hostNetwork, or hostPID. Keep Service `app` port 80. GHCR image names stay lowercase (`ghcr.io/snagaram3/confxarm64`).

## Empty states and honesty

11. Empty-state copy must not be misleading. When Elasticsearch ranking returns zero results, the UI must say confXarm64 will not invent talks to fill the space. Loading states ("Ranking in Elasticsearch…") are fine during initial fetch.
12. Sample data must be clearly labeled: "SAMPLE" for catalog items, "Alex Rivera" labeled as sample persona, "Main hall · Sample" for placeholder itinerary rows. Sample elements should not be visually identical to official data.
13. Search result cards must honestly explain why a result matched: show retriever type (BM25, kNN, hybrid), matched fields, score, and highlighted snippets. Do not hide the ranking logic.
14. Pre-hydration state (server-rendered or initial client render before API response) should show loading indicators, not "0 of 0 picks" that could be mistaken for broken search. The actual empty-result state only appears after ranking completes.

## Out of scope

Live Dash0 credentials, Radar Cloud tokens, and Gitar itself are optional for local `npm run dev`. Connecting the Gitar GitHub App is a human step (Settings → Configuration while signed in).

## Git CI

`.github/workflows/ci.yml` runs `npm test` and `npm run build` only. Image deploy is `.github/workflows/deploy.yaml` on `main`.
