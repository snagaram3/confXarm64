import { SuggestionCard } from "@/components/bot/SuggestionCard";
import { LATE_SESSION_ID, wayfinding } from "@/lib/catalog";
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
  } = useAppState();

  const remaining = wayfinding.steps
    .slice(stepIndex)
    .reduce((sum, step) => sum + step.durationSec, 0);

  const suggestions = buildSuggestions({
    rankStatus,
    navigating,
    mustSessions: rankedSessions.filter((row) => row.rank === "must"),
    lateSession: rankedSessionById[LATE_SESSION_ID],
    remainingSec: remaining,
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
    if (suggestion.sessionId) selectSession(suggestion.sessionId);
    if (action === "view") setView("map");
    if (action === "navigate") startNavTo255();
  }

  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          saved={suggestion.sessionId ? savedIds.includes(suggestion.sessionId) : false}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
