import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";

export function A11ySettings({ compact = false }: { compact?: boolean }) {
  const {
    contrastPref,
    setContrastPref,
    textSizePref,
    setTextSizePref,
    motionPref,
    setMotionPref,
  } = useAppState();

  return (
    <section aria-labelledby="a11y-settings-heading" className={cn("grid gap-3", compact && "gap-2")}>
      <div>
        <h3 id="a11y-settings-heading" className="text-sm font-semibold">
          Accessibility
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          These change this device’s UI only. They do not claim a step-free route or captioned
          sessions — the official schedule does not publish those fields.
        </p>
      </div>
      <fieldset className="grid gap-1">
        <legend className="text-xs font-medium">Contrast</legend>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Contrast">
          <PrefChip
            label="Default"
            pressed={contrastPref === "default"}
            onClick={() => setContrastPref("default")}
          />
          <PrefChip
            label="High contrast"
            pressed={contrastPref === "high"}
            onClick={() => setContrastPref("high")}
          />
        </div>
      </fieldset>
      <fieldset className="grid gap-1">
        <legend className="text-xs font-medium">Text size</legend>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Text size">
          <PrefChip
            label="Default"
            pressed={textSizePref === "default"}
            onClick={() => setTextSizePref("default")}
          />
          <PrefChip
            label="Larger text"
            pressed={textSizePref === "large"}
            onClick={() => setTextSizePref("large")}
          />
        </div>
      </fieldset>
      <fieldset className="grid gap-1">
        <legend className="text-xs font-medium">Motion</legend>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Motion">
          <PrefChip
            label="Full motion"
            pressed={motionPref === "full"}
            onClick={() => setMotionPref("full")}
          />
          <PrefChip
            label="Reduce motion"
            pressed={motionPref === "reduced"}
            onClick={() => setMotionPref("reduced")}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          The operating system “reduce motion” setting always wins over Full motion.
        </p>
      </fieldset>
    </section>
  );
}

function PrefChip({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={pressed}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-3 text-sm font-semibold",
        pressed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
