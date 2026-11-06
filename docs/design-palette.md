# Floorwise palette (KCNA 2026 event-inspired)

Floorwise is an independent companion. Matching colors does **not** mean this is an official Linux Foundation, CNCF, or KubeCon app.

## Sources sampled 2026-11-06

- Event home: https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/
- Schedule: https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/program/schedule/
- Theme CSS: https://events.linuxfoundation.org/wp-content/themes/lfevents/dist/css/app.min.css
- Inline event tokens in the live HTML: `--event-color-1` / `--event-color-2`
- Hero still: `…/wp-content/uploads/2026/03/Hero-V2-1920x960.jpg` (corners/center `#113e82`)
- Social card: `…/wp-content/uploads/2026/03/kccnc-na-26-social-snackable.png`

Generic CNCF brand blue `#0086FF` and LF Events link `#0077cc` (`#07c` in the shared theme) appear on the platform but are **not** this event’s `--event-color-*`. They were not used as Floorwise primary.

## Source-derived (literal from the live event)

| Hex | Role on the live site |
| --- | --- |
| `#113e82` | `--event-color-1` and `--event-color-2`; sticky header gradient; hero fill |
| `#d62293` | Register and other strong CTA buttons (white label) |
| `#ffee88` | “View the Schedule” / co-located schedule buttons (black label) |
| `#fde1cb` | Full-width peach section background |
| `#fefefe` | Theme white (`--wp--preset--color--white`) |
| `#212326` | Theme charcoal (`--wp--preset--color--black`) |
| `#ecedee` | Theme off-white |
| `#d3d5d9` | Theme light gray |
| `#0b0f1f` | Stats number color |
| `#667085` | Stats label color |

Artwork-only (hero/social pixels, **not** CSS tokens): lower-hero purple `#573589`, social ice `#e4f6ff`, social green `#2e9c68`. Not used as app roles.

## Accessible adjusted tints (ours, not official)

| Hex | App role | Why adjusted |
| --- | --- | --- |
| `#f3f6fb` | Page background | Navy ~4% on white; cooler than the old beige |
| `#ffffff` | Cards / popovers | Clean surface on the navy wash |
| `#dce5f2` | Map canvas surround | Navy wash; does not recolor the PDF floorplan |
| `#e6ecf5` / `#d9e3f2` | Secondary / hover | Hover and chips |
| `#c5d0e0` | Borders | Navy-tinted gray |
| `#0b0f1f` | Body text | Stats ink, 10:1 on the new background |
| `#4a5568` | Muted text | Darkened from `#667085` so it stays ≥4.5:1 on cards |
| `#0e356e` | Primary hover | Navy darkened ~10% |
| `#b42318` | Destructive | Existing error red; not an event color |

## Preference colors (not event brand)

Must `#176b3a`, Maybe `#8a5f12` (darkened from the previous Floorwise amber so cream-on-amber stays ≥4.5:1), Meh `#5d626a`, Unrated `#8a929e`, plus text/icon labels. Event navy/pink/gold are never used as a visit rank.

## What we do not recolor

Official expo/venue PDF images, exhibitor logos, or the floorplan’s printed legend.
