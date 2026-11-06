import { BotIcon } from "@/components/bot/BotIcon";
import { PREF_LABEL } from "@/lib/sponsor-prefs";
import type { Rank } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<Rank | "unrated", string> = {
  must: "bg-must text-must",
  maybe: "bg-maybe text-maybe",
  meh: "bg-meh text-meh",
  unrated: "border border-border bg-card text-muted-foreground shadow-none",
};

export function PrefBot({
  pref,
  delayMs = 0,
  size = "md",
  showLabel = true,
  attention = false,
}: {
  pref?: Rank;
  delayMs?: number;
  size?: "sm" | "md";
  showLabel?: boolean;
  attention?: boolean;
}) {
  const tone = pref ?? "unrated";
  const label = PREF_LABEL[tone];

  return (
    <span className="inline-flex items-center gap-1">
      <BotIcon
        className={cn(
          TONE[tone],
          size === "sm" ? "size-7 [&_svg]:size-[16px]" : "size-9",
          attention ? "bot-attention" : "bot-still",
        )}
        style={{ animationDelay: `${delayMs}ms` }}
        label={`${label} bot`}
      />
      {showLabel && (
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wide",
            tone === "must" && "text-must",
            tone === "maybe" && "text-maybe",
            tone === "meh" && "text-meh",
            tone === "unrated" && "text-muted-foreground",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
