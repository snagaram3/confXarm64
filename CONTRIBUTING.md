# Contributing to Floorwise

## PR checklist (Gitar / human)

- [ ] `docker compose up -d elasticsearch` then wait for yellow at `http://127.0.0.1:19200/_cluster/health` (do not delete volumes or stop other ES containers) then `npm run dev` still ranks via Elasticsearch
- [ ] Room 255 wayfinding (altitude steps + path) is intact
- [ ] Changing profile interests recolors Must / Maybe / Meh on the map
- [ ] Crowd take still appears on a Must session pin
- [ ] Sponsor mirror still shows Must/Maybe visitors for Elastic
- [ ] Connect / share my details requires an explicit consent checkbox and does not fire from Must/Maybe/Meh
- [ ] `/sponsor-portal` is tenant-scoped; demo dashboard stays read-only sample data
- [ ] Tools tabs (Sonar, Dash0, Radar, Elasticsearch) load; missing keys show Needs setup; synthetic Dash0 dashboard stays labeled and is not mixed into Live
- [ ] No new secrets committed; `data/`, Dash0/OTel env, Sonar/Radar tokens, and sponsor-secret files stay gitignored
- [ ] `npm run build` is green

Paste this list into the Gitar review if the bot asks for project-specific criteria. See `.gitar.md`. Do not add SonarQube CI.

## Local loop

```bash
docker compose up -d elasticsearch
curl -sS "http://127.0.0.1:19200/_cluster/health?wait_for_status=yellow&timeout=90s&pretty"
npm install
npm run dev
```

The API waits for Elasticsearch, seeds `src/data/catalog.json` into the `floorwise` index, then Vite proxies `/api` to it.

## Do not

- Rank the catalog in the browser.
- Require a Dash0 key for the UI to render.
- Add AR, beacons, CRM sends, or production identity. Local exhibitor portal secrets stay in gitignored `data/` files.
