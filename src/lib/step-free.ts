import { wayfinding } from "./catalog";
import type { WayfindingStep } from "./types";

/**
 * SAMPLE 255 walk only. Official amenities do not verify a step-free path.
 * This swaps the escalator copy for elevator copy; it does not invent a new polyline.
 */
export function sampleWalkSteps(stepFree: boolean): WayfindingStep[] {
  if (!stepFree) return wayfinding.steps;
  return wayfinding.steps.map((step) => {
    if (step.id !== "up") return step;
    return {
      ...step,
      title: "Take the east elevators up",
      detail:
        "SAMPLE schematic only. Elevators behind the East Lobby escalators on this drawing. Not a surveyed step-free path, indoor GPS, or an official accessibility guarantee.",
      durationSec: 70,
    };
  });
}

export function sampleWalkRemainingSec(stepFree: boolean, stepIndex: number): number {
  return sampleWalkSteps(stepFree)
    .slice(stepIndex)
    .reduce((sum, step) => sum + step.durationSec, 0);
}
