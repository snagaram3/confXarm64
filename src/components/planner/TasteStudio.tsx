import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  bufferFromPacked,
  depthLabel,
  ensureTaste,
  expoLabel,
  nudgeTopic,
  packedLabel,
  rankedTopicEntries,
  withTaste,
} from "@/lib/taste";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { Minus, Plus } from "lucide-react";
import { useRef } from "react";

export function TasteStudio() {
  const { profile, setProfile, setBufferMinutes, setTasteDeckOpen, taste } = useTasteBindings();
  const entries = rankedTopicEntries(taste).slice(0, 18);

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-[0_8px_24px_rgba(17,62,130,0.05)]" aria-labelledby="taste-map-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Your taste</p>
          <h2 id="taste-map-heading" className="font-display text-xl font-semibold">
            Interest map
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Bubble size is your weight, not a crowd score. Boost or mute a topic — recommendations re-rank instantly.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => setTasteDeckOpen(true)}>
          Deal official talks
        </Button>
      </div>

      <ul className="taste-map mt-4 flex flex-wrap items-end gap-2" aria-label="Topic weights">
        {entries.map((row) => (
          <TopicChip
            key={row.topic}
            topic={row.topic}
            weight={row.weight}
            onNudge={(delta) => setProfile({ ...withTaste(profile, nudgeTopic(taste, row.topic, delta)), demoPersona: false })}
          />
        ))}
      </ul>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <VibeDial
          id="depth-dial"
          label="Deep-dive vs overview"
          value={taste.depth}
          valuetext={depthLabel(taste.depth)}
          left="Overview"
          right="Deep-dive"
          onChange={(depth) => setProfile({ ...withTaste(profile, { ...taste, depth }), demoPersona: false })}
        />
        <VibeDial
          id="expo-dial"
          label="Talks vs hands-on / expo"
          value={taste.expoShare}
          valuetext={expoLabel(taste.expoShare)}
          left="Talks"
          right="Hands-on"
          onChange={(expoShare) => setProfile({ ...withTaste(profile, { ...taste, expoShare }), demoPersona: false })}
        />
        <VibeDial
          id="packed-dial"
          label="Packed vs relaxed day"
          value={taste.packed}
          valuetext={packedLabel(taste.packed)}
          left="Relaxed"
          right="Packed"
          onChange={(packed) => {
            setProfile({ ...withTaste(profile, { ...taste, packed }), demoPersona: false });
            setBufferMinutes(bufferFromPacked(packed));
          }}
        />
      </div>
    </section>
  );
}

function useTasteBindings() {
  const { profile, setProfile, setBufferMinutes, setTasteDeckOpen } = useAppState();
  return { profile, setProfile, setBufferMinutes, setTasteDeckOpen, taste: ensureTaste(profile) };
}

function TopicChip({
  topic,
  weight,
  onNudge,
}: {
  topic: string;
  weight: number;
  onNudge: (delta: number) => void;
}) {
  const emphasis = Math.max(0, weight);
  const muted = weight < 0;
  const fontSize = `${0.72 + emphasis * 0.2}rem`;
  const padY = `${0.2 + emphasis * 0.12}rem`;
  const dragY = useRef<number | null>(null);
  const moved = useRef(false);
  return (
    <li>
      <div
        className={cn(
          "taste-bubble flex items-center gap-0.5 rounded-full border px-1",
          muted ? "border-border bg-muted/40 text-muted-foreground" : "border-primary/30 bg-primary/10 text-primary",
          emphasis >= 0.35 && "shadow-sm",
        )}
        style={{ fontSize, paddingTop: padY, paddingBottom: padY }}
        onPointerDown={(event) => {
          dragY.current = event.clientY;
          moved.current = false;
        }}
        onPointerMove={(event) => {
          if (dragY.current == null) return;
          const dy = dragY.current - event.clientY;
          if (Math.abs(dy) > 28) {
            dragY.current = event.clientY;
            moved.current = true;
            onNudge(dy > 0 ? 0.25 : -0.25);
          }
        }}
        onPointerUp={() => {
          dragY.current = null;
        }}
        onPointerCancel={() => {
          dragY.current = null;
        }}
      >
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full hover:bg-background/70"
          aria-label={`Mute ${topic}`}
          onClick={() => onNudge(-0.25)}
        >
          <Minus className="size-3.5" aria-hidden />
        </button>
        <div
          role="slider"
          tabIndex={0}
          className="flex min-h-11 min-w-11 cursor-pointer items-center px-1 text-left text-xs font-semibold leading-tight"
          aria-valuemin={-1}
          aria-valuemax={2}
          aria-valuenow={Number(weight.toFixed(2))}
          aria-valuetext={`${weight.toFixed(1)}`}
          aria-label={topic}
          onClick={() => {
            if (moved.current) return;
            onNudge(0.25);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowRight") {
              event.preventDefault();
              onNudge(0.25);
            }
            if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
              event.preventDefault();
              onNudge(-0.25);
            }
          }}
        >
          {topic}
        </div>
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-full hover:bg-background/70"
          aria-label={`Boost ${topic}`}
          onClick={() => onNudge(0.25)}
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      </div>
    </li>
  );
}

function VibeDial({
  id,
  label,
  value,
  valuetext,
  left,
  right,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  valuetext: string;
  left: string;
  right: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        aria-valuetext={valuetext}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="h-11 w-full accent-primary"
      />
      <p className="flex justify-between text-[11px] text-muted-foreground">
        <span>{left}</span>
        <span className="font-medium text-foreground">{valuetext}</span>
        <span>{right}</span>
      </p>
    </div>
  );
}
