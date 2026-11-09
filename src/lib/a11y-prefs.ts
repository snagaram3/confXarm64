export type ContrastPref = "default" | "high";
export type TextSizePref = "default" | "large";

export const CONTRAST_KEY = "floorwise.contrast";
export const TEXT_SIZE_KEY = "floorwise.textSize";

export interface A11yPrefs {
  contrast: ContrastPref;
  textSize: TextSizePref;
}

export const DEFAULT_A11Y: A11yPrefs = { contrast: "default", textSize: "default" };

export function readContrastPref(): ContrastPref {
  try {
    const raw = localStorage.getItem(CONTRAST_KEY);
    if (raw === "high" || raw === "default") return raw;
  } catch {
    /* private mode */
  }
  return "default";
}

export function readTextSizePref(): TextSizePref {
  try {
    const raw = localStorage.getItem(TEXT_SIZE_KEY);
    if (raw === "large" || raw === "default") return raw;
  } catch {
    /* private mode */
  }
  return "default";
}

export function applyA11yPrefs(
  root: Pick<HTMLElement, "dataset">,
  prefs: A11yPrefs,
): void {
  root.dataset.contrast = prefs.contrast;
  root.dataset.textSize = prefs.textSize;
}

/** High-contrast surfaces used when data-contrast=high. Tested for WCAG AA. */
export const HIGH_CONTRAST = {
  background: "#000000",
  foreground: "#ffffff",
  card: "#000000",
  mutedForeground: "#e8e8e8",
  primary: "#8cb8ff",
  primaryForeground: "#000000",
  border: "#ffffff",
  cta: "#ffb3e0",
  ctaForeground: "#000000",
  must: "#5dff9a",
  mustForeground: "#000000",
  maybe: "#ffd24a",
  maybeForeground: "#000000",
  destructive: "#ff8a80",
  highlight: "#ffee88",
  highlightForeground: "#000000",
} as const;
