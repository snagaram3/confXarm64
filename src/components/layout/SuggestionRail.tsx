import { SuggestionCard } from "@/components/bot/SuggestionCard";
import { catalog, LATE_SESSION_ID, wayfinding } from "@/lib/catalog";
import { buildSuggestions, type Suggestion, type SuggestionAction } from "@/lib/suggestions";
import { useAppState } from "@/state/app-state";

export function SuggestionRail() {
  const {
    rankedSessions,
    rankStatus,
    navigating,
    stepIndex,
    retryRank,
    selectSession,
    setView,
    startNavTo255,
    toggleSaved,
    savedIds,
    rankedSessionById,
    sponsorPrefs,
    selectBooth,
    rankedBooths,
    requestMapFocus,
  } = useAppState();

  const remaining = wayfinding.steps
    .slice(stepIndex)
    .reduce((sum, step) => sum + step.durationSec, 0);

  const mustBoothId = Object.entries(sponsorPrefs).find(([, pref]) => pref === "must")?.[0];
  const mustBooth =
    catalog.booths.find((b) => b.id === mustBoothId) ??
    rankedBooths.find((b) => b.rank === "must")?.item;

  const suggestions = buildSuggestions({
    rankStatus,
    navigating,
    mustSessions: rankedSessions.filter((row) => row.rank === "must"),
    lateSession: rankedSessionById[LATE_SESSION_ID],
    remainingSec: remaining,
    mustBooth: mustBooth
      ? { id: mustBooth.id, sponsor: mustBooth.sponsor, boothNumber: mustBooth.boothNumber }
      : undefined,
  });

  if (suggestions.length === 0) return null;

  function onAction(action: SuggestionAction, suggestion: Suggestion) {
    if (action === "retry") {
      retryRank();
      return;
    }
    if (action === "save" && suggestion.sessionId) {
      toggleSaved(suggestion.sessionId);
      return;
    }
    if (suggestion.boothId) {
      selectBooth(suggestion.boothId, { jump: false });
      requestMapFocus(suggestion.boothId);
      setView("map");
      return;
    }
    if (suggestion.sessionId) selectSession(suggestion.sessionId);
    if (action === "view") setView("map");
    if (action === "navigate") startNavTo255();
  }

  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((suggestion, i) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          saved={suggestion.sessionId ? savedIds.includes(suggestion.sessionId) : false}
          onAction={onAction}
          index={i}
        />
      ))}
    </div>
  );
}
