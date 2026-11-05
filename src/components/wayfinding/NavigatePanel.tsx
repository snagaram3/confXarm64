import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LATE_SESSION_ID, wayfinding } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { ArrowDown, ArrowUp, Check, Mountain } from "lucide-react";

export function NavigatePanel() {
  const { stepIndex, nextStep, prevStep, goToStep, stopNav, rankedSessionById } =
    useAppState();
  const steps = wayfinding.steps;
  const step = steps[stepIndex];
  const session = rankedSessionById[LATE_SESSION_ID];
  const remaining = steps
    .slice(stepIndex)
    .reduce((sum, s) => sum + s.durationSec, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-sky-300">Wayfinding</p>
          <h2 className="font-display text-xl font-semibold">{wayfinding.title}</h2>
          <p className="text-sm text-muted-foreground">{wayfinding.from}</p>
        </div>
        <Badge variant="path">~{Math.round(remaining / 60)} min left</Badge>
      </div>

      {session && (
        <p className="text-sm">
          Destination talk: <span className="font-medium">{session.item.title}</span>
          {" · "}
          {session.item.start} in room 255 (Level 2, stacked over 155).
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {steps.map((s, i) => {
          const active = i === stepIndex;
          const done = i < stepIndex;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => goToStep(i)}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-sky-400 bg-sky-400/10"
                    : done
                      ? "border-border bg-muted/30"
                      : "border-border bg-card hover:bg-accent/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                      active
                        ? "bg-sky-400 text-slate-900"
                        : done
                          ? "bg-must text-must-fg"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{s.title}</p>
                    {active && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {s.detail}
                      </p>
                    )}
                    {active && s.altitudeHint && (
                      <p className="mt-2 inline-flex items-start gap-1.5 rounded-md bg-teal-400/10 px-2 py-1 text-xs text-teal-200">
                        <Mountain className="mt-0.5 size-3.5 shrink-0" />
                        {s.altitudeHint}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      L{s.floor} · {s.durationSec}s
                    </p>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex gap-2">
        <Button variant="outline" onClick={prevStep} disabled={stepIndex === 0} className="flex-1">
          <ArrowUp />
          Back
        </Button>
        {stepIndex < steps.length - 1 ? (
          <Button onClick={nextStep} className="flex-1">
            Next
            <ArrowDown />
          </Button>
        ) : (
          <Button variant="must" onClick={stopNav} className="flex-1">
            Arrived at {step.title.includes("255") ? "255" : "destination"}
          </Button>
        )}
      </div>
    </div>
  );
}
