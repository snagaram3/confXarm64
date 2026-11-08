import { SuggestionCard } from "@/components/bot/SuggestionCard";
import { catalog, LATE_SESSION_ID } from "@/lib/catalog";
import { isSample255Destination } from "@/lib/map-destination";
import { sampleWalkRemainingSec } from "@/lib/step-free";
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
    openExpoBooth,
    rankedBooths,
    requestMapFocus,
    stepFree,
    resolveSession,
  } = useAppState();

  const remaining = sampleWalkRemainingSec(stepFree, stepIndex);

  const mustBoothId = Object.entries(sponsorPrefs).find(([, pref]) => pref === "must")?.[0];
  const mustBoothPref = catalog.booths.find((b) => b.id === mustBoothId);
  const rankedBoothsWithPins = rankedBooths.map((row) => {
    const local = catalog.booths.find((item) => item.id === row.item.id);
    return local ? { ...row, item: { ...row.item, pinAvailable: local.pinAvailable } } : row;
  });

  const suggestions = buildSuggestions({
    rankStatus,
    navigating,
    mustSessions: rankedSessions.filter((row) => row.rank === "must"),
    lateSession: rankedSessionById[LATE_SESSION_ID],
    remainingSec: remaining,
    mustBooth: mustBoothPref
      ? {
          id: mustBoothPref.id,
          sponsor: mustBoothPref.sponsor,
          boothNumber: mustBoothPref.boothNumber,
          pinAvailable: mustBoothPref.pinAvailable,
        }
      : undefined,
    mustBoothFromPref: Boolean(mustBoothPref),
    rankedBooths: rankedBoothsWithPins,
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
      openExpoBooth(suggestion.boothId);
      return;
    }
    if (suggestion.sessionId) {
      const session = resolveSession(suggestion.sessionId);
      selectSession(suggestion.sessionId);
      if (session?.roomId) requestMapFocus(session.roomId);
    }
    if (action === "view") setView("map");
    if (action === "navigate") {
      const session = suggestion.sessionId ? resolveSession(suggestion.sessionId) : undefined;
      if (isSample255Destination(session?.roomId) || suggestion.sessionId === LATE_SESSION_ID) {
        startNavTo255({ stayOnMap: true });
      } else {
        setView("map");
      }
    }
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
