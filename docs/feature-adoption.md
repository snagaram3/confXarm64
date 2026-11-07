# Feature adoption (reference bundle)

The attached Git bundle was CrowdCompass (`crowdcompass-map-ask-rescue` @ `1a8b650`), a sibling Next.js/Fastify hackathon app. It has **no LICENSE**. Floorwise adapted the *ideas* independently: no occupancy heartbeats, no simulated graph coordinates presented as Salt Palace, no MiniLM model files, no CrowdCompass env/secrets, no git history.

Bundle inspected in isolation at `/tmp/fw-ref/` and `/tmp/fw-ref-3d/` on this VM. Floorwise remotes and checkout were not overwritten. 3D source recovered from `apps/web/src/components/venue-map-3d.tsx` and `packages/venue/src/scene.ts` (CrowdCompass `1a8b650` / `main`).

## Adopted

| Reference idea | Floorwise | How to try |
| --- | --- | --- |
| Multi-level schematic as the map, PDF secondary | **Ported / adapted.** Venue opens an illustrative Salt Palace L1 / L2 / Hyatt schematic by default (stacked overview + selected floor + level tabs). Official `venue.pdf` is **Official floor plan**. Expo booths stay on the official expo PDF. Geometry is labeled not-to-scale; unmapped TBD/off-site rooms stay listed. Session→room focus uses official room ids. | Map switcher → **Venue**. Stacked plates or **SP L1 / SP L2 / Hyatt**. Tap a room. **Official floor plan** for the PDF. Motion off flattens the stack. |
| Ask parser (origins, leftover query, chips) | **Adapted.** Origins are Floorwise (West Temple/expo, Salt Palace, Hyatt, sample 255), plus day + step-free. Not CrowdCompass node ids. | **For you** → Ask “step-free eBPF near Hyatt on Tuesday”. Chips appear; ranking query gets `eBPF`; **Take me there** / **View on map** selects that room on the 3D map. |
| Best Pick + Rescue | **Adapted** to honest Floorwise signals: sold out, agenda overlap, ended (planner clock), colocated All-Access, unplaced room. **Not** host occupancy / Full latch. **Take me there** highlights the real room; SAMPLE playback only for the 255 sample talk. Sponsor chips use catalog tags + search interests, not walking distance. | **For you** Best pick → **Take me there**. On the map, **Next talk** / **Exhibitor match** chips. |
| Day chips + include-ended | **Ported** onto the official 8–12 Nov 2026 days. | **For you** day chips. Planner clock on Agenda can hide ended talks unless **Include ended** is on. |
| Step-free toggle | **Adapted** on the SAMPLE 255 walk only (escalator copy → elevator copy). Does not invent a new polyline or claim an official accessible route. Share URLs may include `stepFree=true` as a **planning preference**. | **255** tab → **Step-free copy on this SAMPLE walk**. |
| Optional WebGL 3D map | **Adapted independently.** 3D is the default first visit when WebGL exists. Fresh visits play an illustrative South Entrance → Salt Palace L2 ribbon (named official start/floors; DEMO shaft is schematic-only). Compact journey HUD instead of stacked overlays. Official PDF stair labels stay a secondary reference. SAMPLE 255 remains a separate labeled walk. | Open `/` or `/map?origin=entrance-south&destination=east-registration&view=3d`. Pause/Replay/Explore. Tap a rec chip — it focuses that room/booth and does not replay the demo as a route there. |

## Skipped (intentionally)

| Reference idea | Why |
| --- | --- |
| Live occupancy / host Full / organizer board | Simulated hall counts. Floorwise must not relabel synthetic crowd as actual. |
| A* graph distances, ETAs, occupancy-colored rooms | Simulated meters and host Full latch. 3D shows Floorwise selection/focus only. |
| MiniLM / Xenova model files | Extra dependency; Floorwise already has ES hybrid BM25+kNN. |
| Dash0 / Sonar / Radar signup | Still blocked / needs keys. Do not retry Dash0 signup. Tools tabs stay honest. |
| Replacing expo PDF with showcase schematic booths | User asked to keep official booth map. Showcase labels on Salt Palace L1 are dashed and point at Expo. |
| CrowdCompass env, demo clock occupancy, k8s manifests, fictional sponsors | Out of scope / untrusted. |

## Honesty notes

- Schematic disclaimer is on the map: not to scale, not GPS, not walking time.
- `LABEL` on a block means the room is on the official schedule but was **not** a verified pin on `venue.pdf`.
- Portal chips are **schematic links** between sheets, not surveyed bridges or elevators.
- Official stair/elevator markers are PDF-text labels from `venue.pdf` (`src/data/venue-connectors.json`). They are not walkable nodes. `amenities.json` still has `coordinates: null` and `step_free_route_verified: false`.
- 3D venue geometry is an extrusion of that schematic. Expo 3D keeps the official image; logos sit on image-relative booth anchors.
- SAMPLE 255 animation uses `wayfinding.json` only. No live GPS, occupancy, or walking-time claim.
- Synthetic Dash0 dashboard is unchanged and still labeled SAMPLE.
