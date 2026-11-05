import { Button } from "@/components/ui/button";
import type { Suggestion, SuggestionAction } from "@/lib/suggestions";
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
}: {
  suggestion: Suggestion;
  saved?: boolean;
  onAction: (action: SuggestionAction, suggestion: Suggestion) => void;
}) {
  return (
    <article className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <BotIcon />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Floorwise suggestion
        </p>
        <h3 className="mt-0.5 font-display text-base font-semibold leading-snug">
          {suggestion.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{suggestion.body}</p>
        <p className="mt-1.5 text-xs leading-snug text-foreground/80">{suggestion.why}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestion.actions.map((action) => (
            <Button
              key={action}
              type="button"
              size="sm"
              variant={action === "navigate" || action === "retry" ? "default" : "outline"}
              className="min-h-11 min-w-11"
              onClick={() => onAction(action, suggestion)}
            >
              {action === "save" && saved ? "Saved" : ACTION_LABEL[action]}
            </Button>
          ))}
        </div>
      </div>
    </article>
  );
}
