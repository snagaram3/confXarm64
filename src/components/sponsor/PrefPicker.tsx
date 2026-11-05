import { PREF_LABEL, PREF_OPTIONS } from "@/lib/sponsor-prefs";
import type { Rank } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PrefPicker({
  value,
  onChange,
  name,
}: {
  value: Rank | undefined;
  onChange: (next: Rank | undefined) => void;
  name: string;
}) {
  return (
    <div
      role="group"
      aria-label={`Visit preference for ${name}`}
      className="flex flex-wrap gap-1.5"
    >
      {PREF_OPTIONS.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? undefined : option)}
            className={cn(
              "min-h-11 min-w-11 rounded-full border px-3 text-xs font-semibold uppercase tracking-wide",
              option === "must" &&
                (active
                  ? "border-must bg-must text-must-fg"
                  : "border-must/40 bg-must/10 text-must hover:bg-must/20"),
              option === "maybe" &&
                (active
                  ? "border-maybe bg-maybe text-maybe-fg"
                  : "border-maybe/40 bg-maybe/10 text-maybe hover:bg-maybe/20"),
              option === "meh" &&
                (active
                  ? "border-meh bg-meh text-meh-fg"
                  : "border-meh/40 bg-meh/10 text-meh hover:bg-meh/20"),
            )}
          >
            {PREF_LABEL[option]}
          </button>
        );
      })}
    </div>
  );
}
