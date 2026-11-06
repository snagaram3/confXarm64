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
  background: "#f3f6fb",
  card: "#ffffff",
  popover: "#ffffff",
  foreground: "#0b0f1f",
  secondary: "#e6ecf5",
  secondaryForeground: "#1a2744",
  muted: "#e8eef6",
  mutedForeground: "#4a5568",
  accent: "#d9e3f2",
  accentForeground: "#0b0f1f",
  border: "#c5d0e0",
  input: "#b7c4d6",
  mapCanvas: "#dce5f2",
  mapGrid: "#c5d0e0",
  destructive: "#b42318",
  primaryHover: "#0e356e",
  pinkFg: "#ffffff",
  goldFg: "#0b0f1f",
  peachFg: "#0b0f1f",
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
