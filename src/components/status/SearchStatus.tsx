import { useAppState } from "@/state/app-state";

export function SearchStatus() {
  const { rankStatus, rankedSessions } = useAppState();

  if (rankStatus !== "loading" || rankedSessions.length > 0) return null;

  return (
    <div
      role="status"
      className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
    >
      Ranking the official 2026 schedule in Elasticsearch…
    </div>
  );
}
