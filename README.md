# Floorwise

Private conference companion for Salt Palace + Hyatt during KubeCon + CloudNativeCon North America 2026. Find a talk, pin it on your agenda, see exhibitor logos on the official expo floorplan, and get an advance reminder.

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

Open [http://127.0.0.1:43180](http://127.0.0.1:43180). First boot can sit on **red** while Elasticsearch forms the cluster. The API waits up to **120s** for yellow/green and then indexes the official 601-record main schedule.

No Docker on the machine? `npm run es` downloads the official Elasticsearch 8.17 tarball and starts it on loopback `:19200`, then `npm run dev`.

This cloud preview may point `ELASTICSEARCH_URL` at a local tarball on `:9200`. Mac / other hosts should keep **19200**.

## What you get

1. **Expo map** — official `expo.pdf` rendered as a zoom/pan floorplan. Catalog exhibitor logos sit on PDF-text booth numbers (image-relative anchors, not indoor GPS). Tap a logo for a clamped popover, Must/Maybe/Meh bots, and booth actions. Unplaced exhibitors (if any) are listed with a reason instead of an invented pin.
2. **Venue map** — official `venue.pdf` with verified room labels for Salt Palace and Hyatt levels 2–5. Unverified rooms stay in the unplaced list. Hyatt talks are never routed to the sample 255 schematic.
3. **Official schedule** — 601 main-schedule records (registration, breaks, showcases, and talks — not 601 technical talks), 715 speakers, 37 room labels. Source timezone America/Denver (−07:00) for 8–12 Nov 2026. Related colocated feeds (229 / 14 / 38) stay distinct. Elasticsearch hybrid search ranks the official catalog.
4. **Personal agenda** — add/remove, per-day timeline, upcoming/ongoing/finished, next-session countdown, overlap warnings, planning-buffer gaps labeled as estimates. Display timezone: conference America/Denver or America/Chicago. Stored only in this browser. Optional ICS download; Floorwise never writes to a real calendar.
5. **Keynote picks** — curated from the official Keynote Sessions track. Names, titles, photos, and bios come from the published schedule. Not a popularity ranking.
6. **Reminders** — opt-in per session, default 10 minutes (5/10/15). Browser permission is requested only from **Enable notifications**. Background Web Push needs VAPID keys (`npm run vapid:provision`, gitignored `data/vapid.json`), a supported browser, HTTPS or localhost, and a running API. Until VAPID exists, in-tab / foreground notifications are clearly labeled.

Sample 12-talk catalog + scripted 255 route remain on the **Sample schematic** surface and are labeled SAMPLE. They are not merged into the official Elasticsearch catalog.

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

Default profile is **Staff Platform Engineer · Kubernetes · observability · platform engineering · eBPF · OpenTelemetry**.

1. **Expo logos** — Map tab, Expo floor. Pinch/scroll zoom, tap Elastic / Grafana / Docker logos. Preference bots bounce then idle (Must green / Maybe amber / Meh gray / Unrated). Reduced-motion OS setting stops the animation.
2. **Official talk** — For you. Search `keynote` or `eBPF`. Open a result. Add to agenda. Hall DE is on the venue map; Hyatt rooms stay on Hyatt.
3. **Agenda** — Agenda tab. Switch timezone Denver ↔ Chicago. Set a 10 min planning buffer. Watch overlap and gap copy. Download ICS if you want a file; nothing is written to a calendar.
4. **Keynote picks** — For you, above the ranking. Sourced from the Keynote Sessions track.
5. **Remind me** — Enable notifications, then Remind on a future talk (or use the planner clock). Cancel reschedules cleanly. Removing from the agenda cancels the job.
6. **Sample 255** — 255 tab is still the labeled sample walk, not a live indoor route.

## Elasticsearch track

`POST /api/rank` hybrid-ranks the official main schedule:

- BM25 `multi_match` on title^3, abstract, tags, track, speaker
- 48-dim cosine `dense_vector`
- Must / Maybe / Meh from ES `_score` + tag overlap (personal fit, not global popularity)

Re-seed without restarting: `npm run seed`.

## Verify

```bash
npm test
npm run build
```

## What is in / out

**In:** Official 2026 main schedule + speakers + rooms, PDF-anchored expo logos, verified venue room pins, personal agenda, keynote picks, opt-in Web Push reminders, sponsor lead portal, Elasticsearch ranking, sample 255 schematic (labeled).

**Out:** Surveyed indoor coordinates, step-free routing, live crowd counts, invented celebrity attendees, popularity rankings, merging colocated feeds into the main catalog, email/SMS/CRM, writing to a real calendar, public deployment, wiping Docker volumes, harvesting contacts from Must/Maybe/Meh.
