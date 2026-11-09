import { DayRail } from "@/components/planner/DayRail";
import { PlannerSearch } from "@/components/planner/PlannerSearch";
import { RankedPicks } from "@/components/planner/RankedPicks";
import { ThisOrThatDeck } from "@/components/planner/ThisOrThatDeck";
import { VibeDials } from "@/components/planner/VibeDials";
import {
  defaultGuideDay,
  mixGuidePicks,
  sessionDayId,
  tasteHasTopics,
  type GuidePick,
} from "@/lib/field-guide";
import { filterRankedSessions } from "@/lib/ranked-filter";
import { ensureTaste } from "@/lib/taste";
import type { ConferenceDayId } from "@/lib/ask";
import { useAppState } from "@/state/app-state";
import { useMemo, useState } from "react";

const HOME_CLOCK = new Date("2026-11-10T12:00:00-07:00");

export function FieldGuideHome() {
  const {
    profile,
    rankedSessions,
    rankedBooths,
    rankStatus,
    rankError,
    retryRank,
    savedIds,
    toggleSaved,
    officialSessions,
    setSponsorPref,
    sponsorPrefs,
    searchQuery,
    setSearchQuery,
    setSearchMode,
    trackFilter,
  } = useAppState();
  const taste = ensureTaste(profile);
  const searching = searchQuery.trim().length > 0;
  const [day, setDay] = useState<ConferenceDayId>(() => defaultGuideDay(profile.attendanceDays));
  const [freshId, setFreshId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  const visible = useMemo(() => {
    return filterRankedSessions(rankedSessions, {
      day: "all",
      includeEnded: true,
      clock: HOME_CLOCK,
      track: trackFilter,
    });
  }, [rankedSessions, trackFilter]);

  const picks = useMemo(
    () =>
      mixGuidePicks({
        sessions: visible,
        booths: rankedBooths,
        taste,
        officialSessions,
        query: searchQuery,
        searching,
      }),
    [visible, rankedBooths, taste, officialSessions, searchQuery, searching],
  );

  const why = searching
    ? `searching “${searchQuery.trim()}”${tasteHasTopics(taste) ? " + taste" : ""}`
    : rankStatus === "loading"
      ? "ranking in Elasticsearch…"
      : tasteHasTopics(taste)
        ? "ranked by taste + query"
        : "Elasticsearch ranks · taste still open";
  const pool = visible.length + rankedBooths.length;
  const shown = `${picks.length} of ${pool || picks.length} ranked picks`;

  const toggle = (pick: GuidePick) => {
    if (pick.kind === "booth" && pick.booth) {
      const on = sponsorPrefs[pick.id] !== "must";
      setSponsorPref(pick.id, on ? "must" : undefined);
      setAnnounce(on ? `${pick.title} added to Must Go.` : `${pick.title} removed from Must Go.`);
      if (on) setFreshId(pick.id);
      return;
    }
    if (pick.session) {
      const on = !savedIds.includes(pick.id);
      toggleSaved(pick.id);
      const sessionDay = sessionDayId(pick.session);
      if (on && sessionDay) {
        setDay(sessionDay);
        setFreshId(pick.id);
      }
      setAnnounce(on ? `${pick.title} added to ${pick.dayLabel ?? "your itinerary"}.` : `${pick.title} removed.`);
    }
  };

  return (
    <div className="field-guide">
      <div>
        <ThisOrThatDeck onAnnounce={setAnnounce} />
        <VibeDials />
      </div>

      <section aria-labelledby="hero">
        <h1 className="fg-hero" id="hero">
          Your KubeCon,{" "}
          <em>
            ranked by taste.
            <svg viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden="true">
              <path pathLength="1" d="M2 8 C 60 3, 120 3, 170 6 S 260 10, 298 4" />
            </svg>
          </em>
        </h1>
        <p className="fg-lede">Pick between pairs. Turn the dials. The plan rewrites itself.</p>

        {profile.demoPersona && (
          <p className="fg-note" role="status" style={{ marginTop: 16 }}>
            Previewing labeled sample persona “Alex Rivera”. Preferences stay in this browser.
          </p>
        )}

        <PlannerSearch why={why} shown={rankStatus === "error" ? "search unavailable" : shown} />

        {rankStatus === "loading" && rankedSessions.length === 0 && (
          <p className="fg-note" role="status">
            Ranking the official 2026 schedule in Elasticsearch…
          </p>
        )}
        {rankStatus === "error" && (
          <div className="fg-empty" role="alert">
            <h2>Search is unavailable</h2>
            <p>{rankError ?? "Elasticsearch did not return a ranking."} confXarm64 will not invent talks to fill this space.</p>
            <button type="button" onClick={retryRank}>
              Retry ranking
            </button>
          </div>
        )}
        {rankStatus === "ready" && picks.length === 0 && (
          <div className="fg-empty">
            <h2>No ranked picks match.</h2>
            <p>
              {searching
                ? "Try fewer words, or let your taste lead. confXarm64 will not invent sessions."
                : "Elasticsearch returned ranks, but none are left after sample/registration filters. confXarm64 will not invent sessions."}
            </p>
            {searching ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchMode("semantic");
                }}
              >
                Clear search
              </button>
            ) : null}
          </div>
        )}

        <RankedPicks picks={picks} onToggle={toggle} />

        <div className="fg-suggest" aria-label="Try a search">
          <button
            type="button"
            onClick={() => {
              setSearchQuery("eBPF");
              setSearchMode("keyword");
            }}
          >
            eBPF
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("secure the supply chain");
              setSearchMode("hybrid");
            }}
          >
            secure the supply chain
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSearchMode("semantic");
            }}
          >
            just my taste
          </button>
        </div>
      </section>

      <DayRail
        day={day}
        onDay={setDay}
        freshId={freshId}
        onRemoveSession={(id) => {
          toggleSaved(id);
          setAnnounce("Removed from your day.");
        }}
        onRemoveBooth={(id) => {
          setSponsorPref(id, undefined);
          setAnnounce("Removed from Must Go.");
        }}
      />

      <p className="fg-sr" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
