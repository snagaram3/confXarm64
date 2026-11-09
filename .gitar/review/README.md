# Gitar (Sonar) review brief — confXarm64

Use this file as the PR review prompt for Gitar / Sonar on the Never Merge Broken track. The app must stay demoable without Gitar.

Product name: **confXarm64** (formerly Floorwise). Ranking of sessions and booths MUST go through Elasticsearch (`POST /api/rank`, `POST /api/sponsor/:id/visitors`). Do not accept PRs that move Must/Maybe/Meh scoring back to in-memory JavaScript.

Infra bootstrap lives in [`infra/README.md`](../../infra/README.md). Cluster path is the existing CNH team `confxarm64` / namespace `team-confxarm64`.

## Checks for every PR

1. `npm run build` succeeds.
2. Demo script still works: late-for-255 wayfinding, map recolor on profile change, crowd take on a Must pin, Elastic sponsor mirror.
3. `/api/rank` remains the source of session/room rank colors. `src/lib/ranking.ts` may hold labels/defaults only — not catalog scoring. Sponsor visit prefs are user-set Must/Maybe/Meh/Unrated (Unrated is not silent Meh).
4. OpenTelemetry stays optional: unset `OTEL_EXPORTER_OTLP_ENDPOINT` must not crash the API.
5. Seeded catalog still has 8–12 sample sessions including room 255. Exhibitors are a labeled official slice with expo-map booth numbers, not invented hall coordinates.
6. No ARKit/ARCore, beacons, heatmaps, or auth.
7. Tools tabs stay honest (needs setup / connected / empty / error). Do not invent Dash0, Radar, or Sonar live data.

## Out of scope

Live Dash0 credentials, Radar Cloud tokens, and Gitar itself are optional for local `npm run dev`.

## Git CI

`.github/workflows/ci.yml` runs `npm test`, `npm run build`, and an optional Sonar scan (`SONAR_HOST_URL` / `SONAR_TOKEN` secrets).

**This Origin repository has no GitHub Actions runner.** Origin will not execute that workflow. A **public GitHub repository** is required for Gitar and Actions. Use `npm test && npm run build` and `./infra/sonar-scan.sh` (requires a token you supply). Do not invent scan results in the Tools UI.
