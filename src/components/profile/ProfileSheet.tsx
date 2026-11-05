import { catalog } from "@/lib/catalog";
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
import { DEFAULT_PROFILE } from "@/lib/ranking";

export function ProfileSheet() {
  const { profile, setProfile, profileOpen, setProfileOpen, rankedSessions } =
    useAppState();
  const mustCount = rankedSessions.filter((r) => r.rank === "must").length;
  const maybeCount = rankedSessions.filter((r) => r.rank === "maybe").length;

  return (
    <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Your floor profile</SheetTitle>
          <SheetDescription>
            Interests re-rank the official 2026 main schedule in Elasticsearch. Map
            colors update to Must, Maybe, and Meh. Personal fit, not a popularity score.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 p-6 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
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
            <Label>Interests</Label>
            <p className="text-xs text-muted-foreground">
              Sample demo profile is Staff Platform Engineer · Kubernetes · observability.
              Toggle tags to watch the map recolor.
            </p>
            <div className="flex flex-wrap gap-2">
              {catalog.interests.map((tag) => {
                const on = profile.interests.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const next = on
                        ? profile.interests.filter((t) => t !== tag)
                        : [...profile.interests, tag];
                      setProfile({ ...profile, interests: next });
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      on
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Sample rank ·{" "}
              <span className="text-must font-semibold">{mustCount} Must</span>
              {" · "}
              <span className="text-maybe font-semibold">{maybeCount} Maybe</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProfile(DEFAULT_PROFILE)}
            >
              Reset sample profile
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
