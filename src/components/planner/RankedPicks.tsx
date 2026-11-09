import type { GuidePick } from "@/lib/field-guide";
import { motionEnabled } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const EASE = "cubic-bezier(.22,1,.36,1)";

export function RankedPicks({
  picks,
  onToggle,
}: {
  picks: GuidePick[];
  onToggle: (pick: GuidePick) => void;
}) {
  const { savedIds, sponsorPrefs, motionPref } = useAppState();
  const live = motionEnabled(motionPref);
  const root = useRef<HTMLDivElement>(null);
  const prevRect = useRef<Map<string, DOMRect>>(new Map());
  const prevMatch = useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const first = useRef(true);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const nodes = [...el.querySelectorAll<HTMLElement>("[data-pick-id]")];
    if (live && !first.current) {
      for (const node of nodes) {
        const id = node.dataset.pickId;
        if (!id) continue;
        const now = node.getBoundingClientRect();
        const last = prevRect.current.get(id);
        if (last) {
          const dx = last.left - now.left;
          const dy = last.top - now.top;
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
              duration: 420,
              easing: EASE,
            });
          }
        } else {
          node.animate(
            [
              { opacity: 0, transform: "translateY(14px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 380, easing: EASE },
          );
        }
      }
    }
    prevRect.current = new Map(nodes.map((node) => [node.dataset.pickId ?? "", node.getBoundingClientRect()]));
    first.current = false;
  }, [picks, live]);

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const pick of picks) {
      const prev = prevMatch.current.get(pick.id);
      if (prev != null && prev !== pick.match) next[pick.id] = pick.match - prev;
      prevMatch.current.set(pick.id, pick.match);
    }
    setDeltas(next);
    if (!Object.keys(next).length) return;
    const id = window.setTimeout(() => setDeltas({}), 1600);
    return () => window.clearTimeout(id);
  }, [picks]);

  if (!picks.length) return null;

  return (
    <div className="fg-results" ref={root} aria-live="off">
      {picks.map((pick, index) => {
        const on = pick.kind === "booth" ? sponsorPrefs[pick.id] === "must" : savedIds.includes(pick.id);
        return (
          <PickCard
            key={pick.id}
            pick={pick}
            index={index}
            on={on}
            delta={deltas[pick.id]}
            onToggle={() => onToggle(pick)}
          />
        );
      })}
    </div>
  );
}

function PickCard({
  pick,
  index,
  on,
  delta,
  onToggle,
}: {
  pick: GuidePick;
  index: number;
  on: boolean;
  delta?: number;
  onToggle: () => void;
}) {
  const { motionPref } = useAppState();
  const live = motionEnabled(motionPref);
  const [pop, setPop] = useState(false);
  const day = pick.kind === "session" ? pick.dayLabel ?? "" : "";
  const label =
    pick.kind === "booth"
      ? on
        ? "On Must Go"
        : "Must Go"
      : on
        ? `Added to ${day || "plan"}`
        : `Add to ${day || "plan"}`;
  const aria =
    pick.kind === "booth"
      ? `${on ? "Remove" : "Add"} ${pick.title} ${on ? "from" : "to"} Must Go`
      : `${on ? "Remove" : "Add"} ${pick.title} ${on ? "from" : "to"} ${day || "your itinerary"}`;

  return (
    <article
      className={cn("fg-pick", pick.kind === "booth" && "booth")}
      data-pick-id={pick.id}
      aria-labelledby={`pick-${pick.id}`}
    >
      <span className="fg-rank" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div>
        <div className="fg-eyebrow">
          {pick.kind === "booth" ? (
            <>
              <span className="b">Booth {pick.code}</span>
              <span>{pick.sample ? "Sample sponsor" : "Exhibitor"}</span>
            </>
          ) : (
            <>
              <span>Session</span>
              <span>
                {pick.dayLabel} {pick.time}
              </span>
            </>
          )}
        </div>
        <h2 id={`pick-${pick.id}`}>
          {pick.sample && !/^sample:/i.test(pick.title) ? `Sample: ${pick.title}` : pick.title}
        </h2>
      </div>
      <div className="fg-side">
        <div className="fg-score" aria-label={`match score ${pick.match}`}>
          {delta != null && Math.abs(delta) >= 1 ? (
            <span className={cn("fg-delta on", delta < 0 && "down")}>
              {delta > 0 ? "▲" : "▼"}
              {Math.abs(delta)}
            </span>
          ) : (
            <span className="fg-delta" />
          )}
          <span className="n">{pick.match}</span>
          <span className="l">match</span>
        </div>
        <div className="fg-meter" aria-hidden="true">
          <i style={{ transform: `scaleX(${pick.match / 100})` }} />
        </div>
        <button
          className={cn("fg-add", pop && "pop")}
          type="button"
          aria-pressed={on}
          aria-label={aria}
          onClick={() => {
            onToggle();
            if (!on && live) {
              setPop(false);
              requestAnimationFrame(() => setPop(true));
              window.setTimeout(() => setPop(false), 400);
            }
          }}
        >
          {on ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path pathLength="1" d="M5 12.5 10 17 19 7" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          )}
          <span>{label}</span>
        </button>
      </div>
      <p className="fg-why" dangerouslySetInnerHTML={{ __html: emphasizeWhy(pick.why) }} />
    </article>
  );
}

function emphasizeWhy(why: string): string {
  const escaped = why.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (!escaped.startsWith("Because you like ")) return escaped;
  const rest = escaped.slice("Because you like ".length);
  const parts = rest.split(" · ").map((part) => {
    if (part.startsWith("keyword") || /you loved/i.test(part) || part.startsWith("A stretch")) return part;
    return `<b>${part}</b>`;
  });
  return `Because you like ${parts.join(" · ")}`;
}
