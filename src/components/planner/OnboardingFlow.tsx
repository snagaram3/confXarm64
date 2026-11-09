import { SwipeDeck } from "@/components/planner/SwipeDeck";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONFERENCE_DAYS } from "@/lib/ask";
import { catalog } from "@/lib/catalog";
import { DEMO_PROFILE, EMPTY_PROFILE, canFinishOnboarding } from "@/lib/planner-profile";
import { emptyTaste } from "@/lib/taste";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { useState } from "react";

const STEPS = [
  { id: "welcome", title: "Plan this visit" },
  { id: "days", title: "Days on site" },
  { id: "swipe", title: "This or that" },
] as const;

export function OnboardingFlow() {
  const { setProfile } = useAppState();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Profile>({ ...EMPTY_PROFILE, taste: emptyTaste() });
  const finish = canFinishOnboarding(draft);
  const current = STEPS[step]!;

  const save = (profile: Profile) => {
    setProfile({ ...profile, onboarded: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Floorwise trip planner</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {current.title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Preferences stay in this browser on this device. There is no Floorwise account, cloud sync, or email signup.
        </p>
        <ol className="mt-2 flex gap-1" aria-label="Setup steps">
          {STEPS.map((item, index) => (
            <li key={item.id} className="min-w-0 flex-1">
              <span className={cn("block h-1.5 rounded-full", index <= step ? "bg-primary" : "bg-border")} />
              <span className="sr-only">
                {item.title}
                {index === step ? " (current)" : ""}
              </span>
            </li>
          ))}
        </ol>
      </header>

      {step === 0 && (
        <section className="flex flex-col gap-4">
          <p className="text-base leading-relaxed text-foreground">
            Deal real KCNA 2026 session cards, love or skip them, and watch a day plan appear. This is not the official
            schedule’s audience-level filter.
          </p>
          <p className="text-sm text-muted-foreground">
            We will not invent walking times, live attendance, or a hotel/flight plan. Rankings are your taste over
            Elasticsearch, not a popularity score.
          </p>
          <div className="rounded-2xl border border-dashed border-border bg-card p-4">
            <p className="text-sm font-semibold">Optional labeled sample</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview as “Alex Rivera, Staff Platform Engineer” — a sample persona, not your identity. Your real
              itinerary is not overwritten until you save.
            </p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => save({ ...DEMO_PROFILE })}>
              Preview with sample persona
            </Button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Required. Only 8–12 Nov 2026 at Salt Palace + Hyatt. No flight or hotel dates.
          </p>
          <div className="flex flex-wrap gap-2">
            {CONFERENCE_DAYS.map((day) => {
              const on = draft.attendanceDays.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => {
                    const attendanceDays = on
                      ? draft.attendanceDays.filter((item) => item !== day.id)
                      : [...draft.attendanceDays, day.id];
                    setDraft({ ...draft, attendanceDays });
                  }}
                  className={cn(
                    "min-h-11 rounded-full border px-3 text-sm font-semibold",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent",
                  )}
                >
                  {day.weekday} {day.label.replace(/^[A-Za-z]+ /, "")}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">Optional role — extra keywords, not a job title we store in the cloud.</p>
          <div className="flex flex-wrap gap-2">
            {catalog.roles.map((role) => {
              const on = draft.role === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setDraft({ ...draft, role: on ? "" : role })}
                  className={cn(
                    "min-h-11 rounded-full border px-3 text-sm font-semibold",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent",
                  )}
                >
                  {role}
                </button>
              );
            })}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="display-name">Display name (optional)</Label>
            <Input
              id="display-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Shown only on this device"
              autoComplete="nickname"
            />
          </div>
          {!finish.ok && finish.message && (
            <p className="text-sm text-maybe" role="status">
              {finish.message}
            </p>
          )}
        </section>
      )}

      {step === 2 && (
        <SwipeDeck
          profile={draft}
          onChange={setDraft}
          onDone={(next) => save({ ...next, demoPersona: false, onboarded: true })}
          onSkip={() => save({ ...draft, demoPersona: false, onboarded: true })}
        />
      )}

      {step < 2 && (
        <div className="flex flex-wrap gap-2 pb-8">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep((n) => n - 1)}>
              Back
            </Button>
          )}
          <Button
            type="button"
            className="flex-1"
            disabled={step === 1 && !finish.ok}
            onClick={() => setStep((n) => n + 1)}
          >
            {step === 0 ? "Continue" : "Deal official talks"}
          </Button>
        </div>
      )}
    </div>
  );
}
