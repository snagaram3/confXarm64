# Contributing to Floorwise

## PR checklist (Gitar / human)

- [ ] `docker compose up -d` then `npm run dev` still ranks via Elasticsearch
- [ ] Room 255 wayfinding (altitude steps + path) is intact
- [ ] Changing profile interests recolors Must / Maybe / Meh on the map
- [ ] Crowd take still appears on a Must session pin
- [ ] Sponsor mirror still shows Must/Maybe visitors for Elastic
- [ ] No new secrets committed; Dash0/OTel env stays in `.env`
- [ ] `npm run build` is green

Paste this list into the Gitar (Sonar) review if the bot asks for project-specific criteria. See `.gitar.md`.

## Local loop

```bash
docker compose up -d
npm install
npm run dev
```

The API waits for Elasticsearch, seeds `src/data/catalog.json` into the `floorwise` index, then Vite proxies `/api` to it.

## Do not

- Rank the catalog in the browser.
- Require a Dash0 key for the UI to render.
- Add AR, beacons, or accounts.
