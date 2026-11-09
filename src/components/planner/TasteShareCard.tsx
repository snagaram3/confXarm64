import { Button } from "@/components/ui/button";
import { depthLabel, ensureTaste, expoLabel, packedLabel, rankedTopicEntries, tasteShareText } from "@/lib/taste";
import { useAppState } from "@/state/app-state";
import { useState } from "react";

export function TasteShareCard() {
  const { profile, officialSessions } = useAppState();
  const taste = ensureTaste(profile);
  const [copied, setCopied] = useState(false);
  const text = tasteShareText(profile, officialSessions);
  const topics = rankedTopicEntries(taste).filter((row) => row.weight >= 0.35).slice(0, 6);
  const loved = taste.swipes.filter((row) => row.choice === "love").length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-gradient-to-br from-card to-peach/40 p-4" aria-labelledby="share-taste-heading">
      <h2 id="share-taste-heading" className="font-display text-lg font-semibold">
        Shareable taste card
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Copied as text from this browser. No account, no upload.
      </p>
      <div className="mt-3 rounded-2xl border border-border bg-card/80 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Floorwise · KCNA 2026</p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          {topics.length ? (
            topics.map((row) => (
              <span key={row.topic} className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {row.topic}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No boosted topics yet</span>
          )}
        </p>
        <p className="mt-2 text-sm">
          {depthLabel(taste.depth)} · {expoLabel(taste.expoShare)}
        </p>
        <p className="text-sm text-muted-foreground">{packedLabel(taste.packed)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Loved {loved} official talk{loved === 1 ? "" : "s"} · not a popularity score
        </p>
      </div>
      <Button type="button" variant="outline" className="mt-3" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy summary"}
      </Button>
    </section>
  );
}
