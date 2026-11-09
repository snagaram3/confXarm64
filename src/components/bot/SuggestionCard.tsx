import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Suggestion, SuggestionAction } from "@/lib/suggestions";
import { cn } from "@/lib/utils";
import { BotIcon } from "./BotIcon";

const ACTION_LABEL: Record<SuggestionAction, string> = {
  view: "View on map",
  navigate: "Navigate",
  save: "Save",
  retry: "Retry search",
};

export function SuggestionCard({
  suggestion,
  saved,
  onAction,
  index = 0,
}: {
  suggestion: Suggestion;
  saved?: boolean;
  onAction: (action: SuggestionAction, suggestion: Suggestion) => void;
  index?: number;
}) {
  const featured = suggestion.kind === "recommendation";
  return (
    <article
      className={cn(
        "fw-motion rec-enter fg-card flex gap-3 p-4",
        featured && "fg-card-coral",
      )}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <BotIcon className={featured ? "bot-attention bg-[color:var(--fg-coral)] text-[color:var(--fg-paper)]" : "bot-still"} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="fg-eyebrow">
            {featured ? "Next up for you" : "confXarm64 suggestion"}
          </p>
          {suggestion.rank && (
            <Badge variant={suggestion.rank}>
              {suggestion.rank === "must" ? "Must go" : suggestion.rank}
            </Badge>
          )}
        </div>
        <h3 className="mt-1 font-display text-lg font-medium leading-snug">
          {suggestion.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-[color:var(--fg-ink)]/85">{suggestion.body}</p>
        <p className="mt-1.5 text-xs font-medium leading-snug text-[color:var(--fg-muted)]">{suggestion.why}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestion.actions.map((action) => (
            <Button
              key={action}
              type="button"
              size="sm"
              variant={action === "view" || action === "retry" ? "guide" : "guideGhost"}
              onClick={() => onAction(action, suggestion)}
            >
              {action === "save" && saved
                ? "Saved"
                : action === "view" && suggestion.boothId
                  ? "Show on Expo"
                  : ACTION_LABEL[action]}
            </Button>
          ))}
        </div>
      </div>
    </article>
  );
}
