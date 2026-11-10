import { cn } from "@/lib/utils";
import type { AccessibilityNeed } from "@/lib/types";

export const ACCESSIBILITY_OPTIONS: Array<{
  id: AccessibilityNeed;
  label: string;
  description: string;
}> = [
  {
    id: "mobility",
    label: "Mobility / wheelchair user",
    description: "Shows accessible entrances, quiet rooms, first aid locations",
  },
  {
    id: "deaf-hoh",
    label: "Deaf or hard of hearing",
    description: "Would surface captioned/ASL sessions if published in official data",
  },
  {
    id: "sensory",
    label: "Neurodivergent / sensory-friendly",
    description: "Highlights quiet rooms for breaks from sensory input",
  },
  {
    id: "other",
    label: "Other accessibility needs",
    description: "Shows all official inclusion amenities and support resources",
  },
];

interface AccessibilityPreferencesProps {
  selected: AccessibilityNeed[];
  onChange: (needs: AccessibilityNeed[]) => void;
  compact?: boolean;
}

export function AccessibilityPreferences({ selected, onChange, compact = false }: AccessibilityPreferencesProps) {
  const toggle = (id: AccessibilityNeed) => {
    const next = selected.includes(id) ? selected.filter((n) => n !== id) : [...selected, id];
    onChange(next);
  };

  return (
    <section aria-labelledby="accessibility-prefs-heading" className={cn("grid gap-3", compact && "gap-2")}>
      <div>
        <h3 id="accessibility-prefs-heading" className="text-sm font-semibold">
          Accessibility preferences
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Optional. Selecting preferences will surface official amenities and be honest when data is unavailable.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {ACCESSIBILITY_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition-colors",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <svg viewBox="0 0 16 16" className="h-full w-full text-primary-foreground" fill="currentColor">
                      <path d="M13.5 3.5L6 11L2.5 7.5L3.5 6.5L6 9L12.5 2.5L13.5 3.5Z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold leading-snug">{option.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
