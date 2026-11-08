import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONFERENCE_DAYS } from "@/lib/ask";
import { catalog } from "@/lib/catalog";
import {
  DEMO_PROFILE,
  EMPTY_PROFILE,
  PLANNER_GOALS,
  canFinishOnboarding,
} from "@/lib/planner-profile";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { useState } from "react";

const STEPS = [
  { id: "welcome", title: "Plan this visit" },
  { id: "role", title: "Your role" },
  { id: "topics", title: "Topics" },
  { id: "goals", title: "Goals" },
  { id: "days", title: "Days on site" },
] as const;

export function OnboardingFlow() {
  const { setProfile } = useAppState();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Profile>({ ...EMPTY_PROFILE });
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
              <span
                className={cn(
                  "block h-1.5 rounded-full",
                  index <= step ? "bg-primary" : "bg-border",
                )}
              />
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
            Build a shortlist from the official KCNA 2026 schedule, save a day-by-day itinerary, and open the map only when you need a room or booth.
          </p>
          <p className="text-sm text-muted-foreground">
            We will not invent walking times, live attendance, or a hotel/flight plan. Rankings are your topic fit via Elasticsearch, not a popularity score.
          </p>
          <div className="rounded-2xl border border-dashed border-border bg-card p-4">
            <p className="text-sm font-semibold">Optional labeled sample</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview as “Alex Rivera, Staff Platform Engineer” — a sample persona, not your identity. Your real itinerary is not overwritten until you save.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => save({ ...DEMO_PROFILE })}
            >
              Preview with sample persona
            </Button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Optional. Used as extra keywords on the official schedule, not as a job title we store in the cloud.</p>
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
            <Label htmlFor="custom-role">Or write your own</Label>
            <Input
              id="custom-role"
              value={catalog.roles.includes(draft.role) ? "" : draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              placeholder="e.g. Cluster operator"
            />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Required. These are catalog topics from the Floorwise schedule, not invented tags.</p>
          <div className="flex flex-wrap gap-2">
            {catalog.interests.map((tag) => {
              const on = draft.interests.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const interests = on ? draft.interests.filter((item) => item !== tag) : [...draft.interests, tag];
                    setDraft({ ...draft, interests });
                  }}
                  className={cn(
                    "min-h-11 rounded-full border px-3 text-sm font-semibold",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent",
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          {draft.interests.length === 0 && (
            <p className="text-sm text-maybe" role="status">
              Pick at least one topic to continue.
            </p>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Optional. Goals only change which official query words we add and which cards we emphasize.</p>
          {PLANNER_GOALS.map((goal) => {
            const on = draft.goals.includes(goal.id);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => {
                  const goals = on ? draft.goals.filter((item) => item !== goal.id) : [...draft.goals, goal.id];
                  setDraft({ ...draft, goals });
                }}
                className={cn(
                  "min-h-11 rounded-2xl border p-3 text-left",
                  on ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-accent/60",
                )}
              >
                <p className="font-semibold">{goal.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{goal.detail}</p>
              </button>
            );
          })}
        </section>
      )}

      {step === 4 && (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Required. Only 8–12 Nov 2026 at Salt Palace + Hyatt. No flight or hotel dates.</p>
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

      <div className="flex flex-wrap gap-2 pb-8">
        {step > 0 && (
          <Button type="button" variant="outline" onClick={() => setStep((n) => n - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            className="flex-1"
            disabled={step === 2 && draft.interests.length === 0}
            onClick={() => setStep((n) => n + 1)}
          >
            Continue
          </Button>
        ) : (
          <Button type="button" className="flex-1" disabled={!finish.ok} onClick={() => save({ ...draft, demoPersona: false, onboarded: true })}>
            Save trip preferences
          </Button>
        )}
      </div>
    </div>
  );
}
