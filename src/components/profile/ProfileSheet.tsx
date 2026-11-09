import { A11ySettings } from "@/components/a11y/A11ySettings";
import { catalog } from "@/lib/catalog";
import { CONFERENCE_DAYS } from "@/lib/ask";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DEMO_PROFILE, EMPTY_PROFILE, PLANNER_GOALS } from "@/lib/planner-profile";
import { ensureTaste, setTopicWeight, withTaste } from "@/lib/taste";

export function ProfileSheet() {
  const { profile, setProfile, profileOpen, setProfileOpen, rankedSessions, savedIds, setTasteDeckOpen, setView } = useAppState();
  const mustCount = rankedSessions.filter((r) => r.rank === "must").length;
  const maybeCount = rankedSessions.filter((r) => r.rank === "maybe").length;

  return (
    <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Trip preferences</SheetTitle>
          <SheetDescription>
            Taste weights re-rank the official 2026 main schedule. Saved talks and sponsor pins are not wiped when you edit topics. Preferences stay in this browser — no cloud account.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 p-6 pt-4">
          {profile.demoPersona && (
            <p className="rounded-xl bg-highlight px-3 py-2 text-sm text-highlight-fg">
              Labeled sample persona is on. This is not treated as your identity.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Display name (optional)</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value, demoPersona: false })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value, demoPersona: false })}
                list="roles"
              />
              <datalist id="roles">
                {catalog.roles.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Topics</Label>
            <div className="flex flex-wrap gap-2">
              {catalog.interests.map((tag) => {
                const on = profile.interests.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const nextTaste = setTopicWeight(ensureTaste(profile), tag, on ? 0 : 1);
                      setProfile({ ...withTaste(profile, nextTaste), demoPersona: false });
                    }}
                    className={cn(
                      "fg-chip",
                      on && "is-on",
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Days on site</Label>
            <div className="flex flex-wrap gap-2">
              {CONFERENCE_DAYS.map((day) => {
                const on = profile.attendanceDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => {
                      const attendanceDays = on
                        ? profile.attendanceDays.filter((item) => item !== day.id)
                        : [...profile.attendanceDays, day.id];
                      setProfile({ ...profile, attendanceDays, demoPersona: false });
                    }}
                    className={cn(
                      "fg-chip",
                      on && "is-on",
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Goals</Label>
            <div className="flex flex-wrap gap-2">
              {PLANNER_GOALS.map((goal) => {
                const on = profile.goals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => {
                      const goals = on ? profile.goals.filter((item) => item !== goal.id) : [...profile.goals, goal.id];
                      setProfile({ ...profile, goals, demoPersona: false });
                    }}
                    className={cn(
                      "fg-chip",
                      on && "is-on",
                    )}
                  >
                    {goal.label}
                  </button>
                );
              })}
            </div>
          </div>

          <A11ySettings />

          <div className="fg-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {mustCount} Must · {maybeCount} Maybe
              {savedIds.length ? ` · ${savedIds.length} saved talks kept` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="guideGhost"
                size="sm"
                onClick={() => {
                  setProfileOpen(false);
                  setView("home");
                  setTasteDeckOpen(true);
                }}
              >
                Replay This or That
              </Button>
              <Button
                variant="guideGhost"
                size="sm"
                onClick={() => setProfile({ ...DEMO_PROFILE })}
              >
                Load labeled sample persona
              </Button>
              <Button
                variant="guideGhost"
                size="sm"
                onClick={() => setProfile({ ...EMPTY_PROFILE, attendanceDays: profile.attendanceDays, onboarded: false })}
              >
                Clear topics
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
