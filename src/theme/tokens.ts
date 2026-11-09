/**
 * Floorwise color tokens inspired by the live KCNA 2026 event site.
 * SOURCE hexes were sampled from that site. ADJUSTED hexes are ours for
 * contrast/surfaces and must not be described as official brand colors.
 * See docs/design-palette.md.
 */
export const SOURCE = {
  navy: "#113e82",
  pink: "#d62293",
  gold: "#ffee88",
  peach: "#fde1cb",
  white: "#fefefe",
  charcoal: "#212326",
  offWhite: "#ecedee",
  lightGray: "#d3d5d9",
  statsInk: "#0b0f1f",
  statsMute: "#667085",
} as const;

/** Accessible app surfaces derived from SOURCE navy/white — not event CSS. */
export const ADJUSTED = {
  background: "#f7f4ec",
  card: "#ffffff",
  popover: "#ffffff",
  foreground: "#0b1426",
  secondary: "#efe9dc",
  secondaryForeground: "#1a2744",
  muted: "#efe9dc",
  mutedForeground: "#4a5878",
  accent: "#efe9dc",
  accentForeground: "#0b1426",
  border: "#e4dccb",
  input: "#d9d0bc",
  mapCanvas: "#c8d4e8",
  mapGrid: "#e4dccb",
  destructive: "#b42318",
  primaryHover: "#0e356e",
  pinkFg: "#ffffff",
  goldFg: "#0b0f1f",
  peachFg: "#0b0f1f",
} as const;

/** Field Guide editorial accents — not event brand, not live telemetry colors. */
export const EDITORIAL = {
  paper: "#f7f4ec",
  ink: "#0b1426",
  navy: "#113e82",
  teal: "#08655f",
  tealBg: "#d2f4f1",
  coral: "#a3341c",
  coralBg: "#fce3dd",
  gold: "#8a5306",
} as const;

/** Preference ranks stay distinct from event navy/pink. */
export const PREFERENCE = {
  must: "#176b3a",
  mustFg: "#f4fbf6",
  mustWash: "#d7eadc",
  maybe: "#8a5f12",
  maybeFg: "#fffaf0",
  maybeWash: "#f3e4c4",
  meh: "#5d626a",
  mehFg: "#f7f5f1",
  mehWash: "#e4e6ea",
  unrated: "#8a929e",
} as const;

export const PALETTE = {
  primary: SOURCE.navy,
  primaryForeground: SOURCE.white,
  cta: SOURCE.pink,
  ctaForeground: ADJUSTED.pinkFg,
  highlight: SOURCE.gold,
  highlightForeground: ADJUSTED.goldFg,
  peach: SOURCE.peach,
  peachForeground: ADJUSTED.peachFg,
  path: SOURCE.navy,
  ...ADJUSTED,
  ...PREFERENCE,
} as const;
