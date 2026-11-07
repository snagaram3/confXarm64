import { wayfinding } from "./catalog";
import { WORLD_FLOOR_GAP, WORLD_SCALE, type WorldPoint } from "./map-3d-world";
import { sampleWalkSteps } from "./step-free";
import type { Floor } from "./types";

export type NavKeyframe = WorldPoint & {
  floor: Floor;
  stepId: string;
  label: string;
  kind: "walk" | "vertical";
};

/** SAMPLE 255 walk only. Same polyline whether step-free copy is on. Not GPS. */
export function sample255Keyframes(): NavKeyframe[] {
  const S = WORLD_SCALE;
  const l1 = wayfinding.polylineByFloor["1"] ?? [];
  const l2 = wayfinding.polylineByFloor["2"] ?? [];
  const frames: NavKeyframe[] = [];
  for (const point of l1) {
    frames.push({
      x: point[0] * S,
      y: 0.7,
      z: point[1] * S,
      floor: 1,
      stepId: "l1",
      label: "SAMPLE Level 1",
      kind: "walk",
    });
  }
  const last = l1[l1.length - 1];
  const first2 = l2[0];
  if (last && first2) {
    frames.push({
      x: last[0] * S,
      y: WORLD_FLOOR_GAP * 0.45,
      z: last[1] * S,
      floor: 1,
      stepId: "up",
      label: "SAMPLE vertical on the drawing — not a surveyed elevator",
      kind: "vertical",
    });
    frames.push({
      x: first2[0] * S,
      y: WORLD_FLOOR_GAP + 0.7,
      z: first2[1] * S,
      floor: 2,
      stepId: "arrive",
      label: "SAMPLE Level 2",
      kind: "walk",
    });
  }
  for (const point of l2.slice(1)) {
    frames.push({
      x: point[0] * S,
      y: WORLD_FLOOR_GAP + 0.7,
      z: point[1] * S,
      floor: 2,
      stepId: "l2",
      label: "SAMPLE Level 2",
      kind: "walk",
    });
  }
  return frames;
}

function cumulative(frames: NavKeyframe[]): number[] {
  const distances = [0];
  let total = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1]!;
    const b = frames[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    distances.push(total);
  }
  return distances;
}

export function interpolateNav(
  frames: NavKeyframe[],
  t: number,
): { position: WorldPoint; floor: Floor; label: string; kind: "walk" | "vertical" } | null {
  if (frames.length === 0) return null;
  if (frames.length === 1) {
    const only = frames[0]!;
    return { position: { x: only.x, y: only.y, z: only.z }, floor: only.floor, label: only.label, kind: only.kind };
  }
  const progress = Math.min(1, Math.max(0, t));
  const distances = cumulative(frames);
  const target = distances[distances.length - 1]! * progress;
  let i = 1;
  while (i < distances.length && distances[i]! < target) i += 1;
  const b = frames[i] ?? frames[frames.length - 1]!;
  const a = frames[i - 1] ?? b;
  const span = Math.max(distances[i]! - distances[i - 1]!, 0.0001);
  const u = (target - distances[i - 1]!) / span;
  return {
    position: {
      x: a.x + (b.x - a.x) * u,
      y: a.y + (b.y - a.y) * u,
      z: a.z + (b.z - a.z) * u,
    },
    floor: u < 0.5 ? a.floor : b.floor,
    label: b.label,
    kind: a.kind === "vertical" || b.kind === "vertical" ? "vertical" : "walk",
  };
}

export function navProgressForStep(stepIndex: number, stepFree: boolean): number {
  const steps = sampleWalkSteps(stepFree);
  if (steps.length <= 1) return 0;
  return Math.min(1, Math.max(0, stepIndex / (steps.length - 1)));
}

export function sampleNavDisclaimer(stepFree: boolean): string {
  if (stepFree) {
    return "SAMPLE walkthrough. Step-free copy relabels the escalator step as elevators; the polyline is unchanged and is not a verified accessible route.";
  }
  return "SAMPLE walkthrough of the 255 schematic. Not indoor GPS, walking time, or a surveyed Salt Palace path.";
}
