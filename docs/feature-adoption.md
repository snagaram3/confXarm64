# Feature adoption (reference bundle)

The attached Git bundle was CrowdCompass (`crowdcompass-map-ask-rescue` @ `1a8b650`), a sibling Next.js/Fastify hackathon app. It has **no LICENSE**. Floorwise adapted the *ideas* independently: no occupancy heartbeats, no simulated graph coordinates presented as Salt Palace, no MiniLM model files, no CrowdCompass env/secrets, no git history.

Bundle inspected in isolation at `/tmp/fw-ref/` on this VM. Floorwise remotes and checkout were not overwritten.

## Adopted

| Reference idea | Floorwise | How to try |
| --- | --- | --- |
| Multi-level schematic as the map, PDF secondary | **Ported / adapted.** Venue opens an illustrative Salt Palace L1 / L2 / Hyatt schematic by default (stacked overview + selected floor + level tabs). Official `venue.pdf` is **Official floor plan**. Expo booths stay on the official expo PDF. Geometry is labeled not-to-scale; unmapped TBD/off-site rooms stay listed. Session→room focus uses official room ids. | Map switcher → **Venue**. Stacked plates or **SP L1 / SP L2 / Hyatt**. Tap a room. **Official floor plan** for the PDF. Motion off flattens the stack. |
| Ask parser (origins, leftover query, chips) | **Adapted.** Origins are Floorwise (West Temple/expo, Salt Palace, Hyatt, sample 255), plus day + step-free. Not CrowdCompass node ids. | **For you** → Ask “step-free eBPF near Hyatt on Tuesday”. Chips appear; ranking query gets `eBPF`; map can jump to the Hyatt schematic. |
| Best Pick + Rescue | **Adapted** to honest Floorwise signals: sold out, agenda overlap, ended (planner clock), colocated All-Access, unplaced room. **Not** host occupancy / Full latch. | **For you** Best pick card. Save two overlapping talks on Agenda, then Rescue appears. **Take me there** focuses the schematic (or SAMPLE 255). |
| Day chips + include-ended | **Ported** onto the official 8–12 Nov 2026 days. | **For you** day chips. Planner clock on Agenda can hide ended talks unless **Include ended** is on. |
| Step-free toggle | **Adapted** on the SAMPLE 255 walk only (escalator copy → elevator copy). Does not invent a new polyline or claim an official accessible route. | **255** tab → **Step-free copy on this SAMPLE walk**. |

## Skipped (intentionally)

| Reference idea | Why |
| --- | --- |
| Live occupancy / host Full / organizer board | Simulated hall counts. Floorwise must not relabel synthetic crowd as actual. |
| 3D WebGL map + A* graph distances | Invented geometry and ETAs. Stacked SVG overview covers the multi-level *interaction* without claiming meters or stairs. |
| MiniLM / Xenova model files | Extra dependency; Floorwise already has ES hybrid BM25+kNN. |
| Dash0 / Sonar / Radar signup | Still blocked / needs keys. Do not retry Dash0 signup. Tools tabs stay honest. |
| Replacing expo PDF with showcase schematic booths | User asked to keep official booth map. Showcase labels on Salt Palace L1 are dashed and point at Expo. |
| CrowdCompass env, demo clock occupancy, k8s manifests, fictional sponsors | Out of scope / untrusted. |

## Honesty notes

- Schematic disclaimer is on the map: not to scale, not GPS, not walking time.
- `LABEL` on a block means the room is on the official schedule but was **not** a verified pin on `venue.pdf`.
- Portal chips are **schematic links** between sheets, not surveyed bridges.
- Synthetic Dash0 dashboard is unchanged and still labeled SAMPLE.
