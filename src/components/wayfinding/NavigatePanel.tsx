import { SuggestionCard } from "@/components/bot/SuggestionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LATE_SESSION_ID, wayfinding } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { ArrowDown, ArrowUp, Check } from "lucide-react";

export function NavigatePanel() {
  const { stepIndex, nextStep, prevStep, goToStep, stopNav, rankedSessionById, setFloor, setView } =
    useAppState();
  const steps = wayfinding.steps;
  const step = steps[stepIndex];
  const session = rankedSessionById[LATE_SESSION_ID];
  const remaining = steps.slice(stepIndex).reduce((sum, s) => sum + s.durationSec, 0);
  const mins = Math.max(1, Math.round(remaining / 60));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Scripted walk
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold">{wayfinding.title}</h2>
        <p className="text-sm text-muted-foreground">{wayfinding.from} · not live positioning</p>
      </div>

      <SuggestionCard
        suggestion={{
          id: "nav-timing",
          kind: "route",
          title: `About ${mins} min left · now on Level ${step.floor}`,
          body: step.altitudeHint ?? step.detail,
          why: "Altitude-aware sample steps. 255 is one floor above 155.",
          sessionId: LATE_SESSION_ID,
          actions: ["view"],
        }}
        onAction={(action) => {
          if (action === "view") {
            setFloor(step.floor);
            setView("map");
          }
        }}
      />

      {session && (
        <p className="text-sm leading-relaxed">
          Destination: <span className="font-medium">{session.item.title}</span>
          {" · "}
          {session.item.start} in room 255.
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
                  "min-h-11 w-full rounded-2xl border p-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : done
                      ? "border-border bg-muted/40"
                      : "border-border bg-card hover:bg-accent/70",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs",
                      active
                        ? "bg-primary text-primary-foreground"
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
                      <p className="mt-2 text-xs text-primary">{s.altitudeHint}</p>
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
          <Button onClick={stopNav} className="flex-1">
            Arrived at 255
          </Button>
        )}
      </div>
      <Badge variant="outline" className="w-fit">
        Sample route
      </Badge>
    </div>
  );
}
