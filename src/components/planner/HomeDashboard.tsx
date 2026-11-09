import { QuietRooms } from "@/components/a11y/QuietRooms";
import { AnimatedStack } from "@/components/planner/AnimatedStack";
import { LiveItinerary } from "@/components/planner/LiveItinerary";
import { OnboardingFlow } from "@/components/planner/OnboardingFlow";
import { SessionPlanCard } from "@/components/planner/SessionPlanCard";
import { TasteShareCard } from "@/components/planner/TasteShareCard";
import { TasteStudio } from "@/components/planner/TasteStudio";
import { TalkSearch } from "@/components/search/TalkSearch";
import { Button } from "@/components/ui/button";
import { conflictGroups } from "@/lib/agenda";
import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { catalog } from "@/lib/catalog";
import { mustGoBooths } from "@/lib/expo-pins";
import { PLANNER_GOALS, profileDisplayName } from "@/lib/planner-profile";
import { filterRankedSessions, hasInterestMatch } from "@/lib/ranked-filter";
import { pickSponsorSuggestion } from "@/lib/suggestions";
import { ensureTaste, overlayTasteRank, rankedTopicEntries, tasteMatchPercent } from "@/lib/taste";
import { useAppState } from "@/state/app-state";
import { Star } from "lucide-react";
import { useMemo } from "react";

export function HomeDashboard() {
  const {
    profile,
    setProfileOpen,
    rankedSessions,
    rankedBooths,
    rankStatus,
    rankError,
    retryRank,
    rankMeta,
    savedIds,
    officialSessions,
    toggleSaved,
    selectBooth,
    openExpoBooth,
    setView,
    setSponsorPref,
    sponsorPrefs,
    plannerIso,
    dayFilter,
    includeEnded,
    scheduleNote,
    searchQuery,
    trackFilter,
  } = useAppState();
  const taste = ensureTaste(profile);

  const searching = searchQuery.trim().length > 0;
  const visible = useMemo(() => {
    const clock = plannerIso === "live" ? new Date() : new Date(plannerIso);
    return filterRankedSessions(rankedSessions, {
      day: dayFilter,
      includeEnded,
      clock,
      attendanceDays: profile.attendanceDays,
      track: trackFilter,
    });
  }, [rankedSessions, dayFilter, includeEnded, plannerIso, profile.attendanceDays, trackFilter]);

  if (!profile.onboarded) return <OnboardingFlow />;
  const tasted = overlayTasteRank(visible, taste);
  const talks = tasted
    .filter((row) => {
      if (row.item.dataset === "sample") return false;
      if (searching) return true;
      const track = row.item.track ?? "";
      const types = row.item.sessionTypeLabels ?? [];
      if (/registration/i.test(track) || types.some((label) => /registration/i.test(label))) return false;
      const match = tasteMatchPercent(row.item, taste, officialSessions);
      if (!hasInterestMatch(row) && match < 20) return false;
      return true;
    })
    .slice(0, searching ? 12 : 5);
  const topTopics = rankedTopicEntries(taste)
    .filter((row) => row.weight >= 0.35)
    .slice(0, 4)
    .map((row) => row.topic);
  const saved = officialSessions.filter((session) => savedIds.includes(session.id) && session.startIso);
  const conflicts = conflictGroups(
    saved
      .filter((session) => session.startIso && session.endIso)
      .map((session) => ({
        id: session.id,
        title: session.title,
        startIso: session.startIso!,
        endIso: session.endIso!,
      })),
  );
  const sponsor = pickSponsorSuggestion({
    rankStatus,
    navigating: false,
    mustSessions: [],
    lateSession: undefined,
    remainingSec: 0,
    mustBooth: catalog.booths
      .filter((booth) => sponsorPrefs[booth.id] === "must")
      .map((booth) => ({
        id: booth.id,
        sponsor: booth.sponsor,
        boothNumber: booth.boothNumber,
        pinAvailable: booth.pinAvailable,
      }))[0],
    mustBoothFromPref: catalog.booths.some((booth) => sponsorPrefs[booth.id] === "must"),
    rankedBooths,
  });
  const exhibitors = rankedBooths
    .filter((row) => row.matchedTags.length > 0 || row.matchedQueries.length > 0)
    .filter((row) => row.item.id !== sponsor?.boothId)
    .slice(0, 3);
  const personalMustGo = mustGoBooths(catalog.booths, sponsorPrefs);
  const emphasizeBooths = profile.goals.includes("exhibitors");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:py-8">
      {profile.demoPersona && (
        <p className="rounded-2xl border border-highlight/80 bg-highlight px-3 py-2 text-sm text-highlight-fg" role="status">
          You are previewing the labeled sample persona “Alex Rivera”. This is not your identity. Preferences stay in this browser.
        </p>
      )}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Your KCNA visit</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{profileDisplayName(profile)}</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {profile.role ? `${profile.role} · ` : ""}
            {topTopics.join(" · ") || "Swipe talks or boost a topic"}
            . Rankings use Elasticsearch plus your taste weights over the official main schedule
            {rankMeta ? ` · last query ${rankMeta.tookMs} ms` : ""}. Stored only in this browser — no cloud account.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setProfileOpen(true)}>
            Edit preferences
          </Button>
          <Button type="button" variant="outline" onClick={() => setView("map")}>
            Open map
          </Button>
        </div>
      </header>

      <TasteStudio />
      <LiveItinerary />

      <TalkSearch prominent />

      {rankStatus === "loading" && rankedSessions.length === 0 && (
        <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground" role="status">
          Ranking the official 2026 schedule in Elasticsearch…
        </p>
      )}
      {rankStatus === "error" && (
        <div className="rounded-2xl border border-destructive/30 bg-card px-4 py-3 text-sm" role="alert">
          <p className="font-semibold">Search is unavailable</p>
          <p className="mt-1 text-muted-foreground">
            {rankError ?? "Elasticsearch did not return a ranking."} Floorwise will not invent talks to fill this space.
          </p>
          <Button type="button" className="mt-3" variant="outline" onClick={retryRank}>
            Retry ranking
          </Button>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {searching ? "Search results" : "Recommended talks"}
              </p>
              <h2 className="font-display text-xl font-semibold">
                {searching ? "Why these talks matched" : "What to do, and why"}
              </h2>
            </div>
            <Button type="button" variant="ghost" onClick={() => setView("agenda")}>
              All matches
            </Button>
          </div>
          {rankStatus === "ready" && talks.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              {searching
                ? "No official talks matched that query on the days and track you picked. Try keyword or hybrid, or another day. Floorwise will not invent sessions."
                : "No official talks matched this taste yet. Boost a topic on the map or deal a few cards. Floorwise will not invent sessions."}
            </p>
          )}
          <AnimatedStack>
            {talks.map((row) => (
              <div key={row.item.id} data-flip-id={row.item.id}>
                <SessionPlanCard row={row} />
              </div>
            ))}
          </AnimatedStack>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">My itinerary</h2>
              <Button type="button" variant="ghost" onClick={() => setView("plan")}>
                Open
              </Button>
            </div>
            {conflicts.length > 0 && (
              <p className="mt-2 text-xs text-maybe">
                {conflicts.length} overlap{conflicts.length > 1 ? "s" : ""} on saved talks. Not a seat hold.
              </p>
            )}
            {saved.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing saved yet. Add a recommended talk — that list stays on this device.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {saved.slice(0, 4).map((session) => (
                  <li key={session.id} className="rounded-xl border border-border px-3 py-2">
                    <p className="text-sm font-semibold leading-snug">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.start} · {session.roomLabel ?? session.roomId}
                    </p>
                    <button type="button" className="mt-1 text-xs font-semibold text-primary" onClick={() => toggleSaved(session.id)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(emphasizeBooths || exhibitors.length > 0 || sponsor || personalMustGo.length > 0) && (
            <section className="rounded-2xl border border-border bg-card p-4">
              <h2 className="font-display text-lg font-semibold">Exhibitors for your topics</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Official catalog tags overlapping your interests. Not a paid placement and not walking distance.
              </p>
              {personalMustGo.length > 0 && (
                <div className="mt-3 rounded-xl border border-highlight/70 bg-highlight/20 p-2">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Star className="mr-1 inline size-3 fill-highlight text-highlight" aria-hidden="true" />
                    Your Must go
                  </p>
                  <ul className="mt-1 flex gap-1.5 overflow-x-auto" aria-label="Must go booths">
                    {personalMustGo.map((booth) => (
                      <li key={booth.id} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => openExpoBooth(booth.id)}
                          aria-label={`${booth.sponsor}, booth ${booth.boothNumber}${booth.pinAvailable ? ", show on Expo" : ", unplaced on expo.pdf"}`}
                          className="flex min-h-11 min-w-[8.5rem] items-center gap-2 rounded-xl border border-border bg-background px-2 py-1.5 text-left hover:bg-accent"
                        >
                          <SponsorLogo booth={booth} className="size-8" />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold leading-tight">
                              {booth.sponsor.replace(/,.*/, "")}
                            </span>
                            <span className="block font-mono text-[10px] text-muted-foreground">
                              {booth.pinAvailable ? `Find #${booth.boothNumber}` : "Unplaced"}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {sponsor && (
                <div className="mt-3 rounded-xl border border-border px-3 py-2">
                  <p className="text-sm font-semibold">{sponsor.title}</p>
                  <p className="text-xs text-muted-foreground">{sponsor.why}</p>
                  {sponsor.boothId && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => openExpoBooth(sponsor.boothId!)}>
                        {catalog.booths.find((booth) => booth.id === sponsor.boothId)?.pinAvailable
                          ? "Show on Expo"
                          : "Booth in catalog — no pin"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => selectBooth(sponsor.boothId!)}>
                        Booth details
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {exhibitors.map((row) => {
                const pin = catalog.booths.find((booth) => booth.id === row.item.id);
                const pinAvailable = pin?.pinAvailable ?? row.item.pinAvailable;
                return (
                <div key={row.item.id} className="mt-2 rounded-xl border border-border px-3 py-2">
                  <button type="button" className="w-full text-left hover:opacity-90" onClick={() => selectBooth(row.item.id)}>
                    <p className="text-sm font-semibold">{row.item.sponsor}</p>
                    <p className="font-mono text-[11px] text-primary">
                      Booth {pin?.boothNumber ?? row.item.boothNumber}
                      {pinAvailable ? " · official expo pin" : " · unplaced on expo.pdf"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.why}</p>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sponsorPrefs[row.item.id] === "must" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSponsorPref(row.item.id, undefined)}
                      >
                        Remove Must go
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => setSponsorPref(row.item.id, "must")}>
                        Mark Must go
                      </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={() => openExpoBooth(row.item.id)}>
                      {pinAvailable ? "Show on Expo" : "Booth in catalog — no pin"}
                    </Button>
                  </div>
                </div>
              );
              })}
            </section>
          )}

          <TasteShareCard />
          <QuietRooms />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {scheduleNote || "Official schedule snapshot."} Map remains an optional schematic — not verified onsite or step-free navigation.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Goals:{" "}
            {profile.goals.length
              ? PLANNER_GOALS.filter((goal) => profile.goals.includes(goal.id))
                  .map((goal) => goal.label)
                  .join(" · ")
              : "none beyond your topics"}
          </p>
        </aside>
      </section>
    </div>
  );
}
