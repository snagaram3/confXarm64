export type MotionPref = "full" | "reduced";

export const MOTION_KEY = "floorwise.motion";

export function readMotionPref(): MotionPref {
  try {
    const raw = localStorage.getItem(MOTION_KEY);
    if (raw === "reduced" || raw === "full") return raw;
  } catch {
    /* private mode */
  }
  return "full";
}

export function osPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** OS reduced always wins. App toggle can further reduce when OS is fine. */
export function motionEnabled(pref: MotionPref, osReduced = osPrefersReducedMotion()): boolean {
  if (osReduced) return false;
  return pref !== "reduced";
}
