import { applyPairSide, TASTE_PAIRS, type PairSide } from "@/lib/field-guide";
import { motionEnabled } from "@/lib/motion";
import { ensureTaste, withTaste } from "@/lib/taste";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { useCallback, useEffect, useRef, useState } from "react";

type Side = "L" | "R" | "S";
type Hist = { i: number; side: Side };

const EASE = "cubic-bezier(.22,1,.36,1)";

export function ThisOrThatDeck({
  onAnnounce,
}: {
  onAnnounce: (text: string) => void;
}) {
  const { profile, setProfile, motionPref } = useAppState();
  const live = motionEnabled(motionPref);
  const [idx, setIdx] = useState(0);
  const [hist, setHist] = useState<Hist[]>([]);
  const [chosen, setChosen] = useState<Side | null>(null);
  const [tilt, setTilt] = useState(0);
  const [lean, setLean] = useState<"L" | "R" | null>(null);
  const drag = useRef<{ id: number; x0: number; dx: number; dragged: boolean } | null>(null);
  const flying = useRef(false);

  const done = idx >= TASTE_PAIRS.length;
  const current = TASTE_PAIRS[idx];
  const next = TASTE_PAIRS[idx + 1];
  const next2 = TASTE_PAIRS[idx + 2];

  const commit = useCallback(
    (side: Side, fromDrag = false) => {
      if (flying.current || idx >= TASTE_PAIRS.length) return;
      const pair = TASTE_PAIRS[idx];
      if (!pair) return;
      const opt: PairSide | null = side === "S" ? null : pair[side === "L" ? 0 : 1];
      const taste = ensureTaste(profile);
      const nextTaste = opt ? applyPairSide(taste, opt, 1) : taste;
      setProfile({
        ...withTaste(profile, nextTaste),
        onboarded: true,
        demoPersona: false,
        attendanceDays: profile.attendanceDays.length ? profile.attendanceDays : ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"],
      });
      setChosen(side);
      flying.current = true;
      const hold = opt && live ? (fromDrag ? 60 : 160) : 0;
      window.setTimeout(() => {
        setHist((prev) => [...prev, { i: idx, side }]);
        setIdx((n) => n + 1);
        setChosen(null);
        setTilt(0);
        setLean(null);
        flying.current = false;
      }, live ? hold + 420 : 0);
      onAnnounce(opt ? `Picked ${opt.heading}.` : "Skipped.");
    },
    [idx, live, onAnnounce, profile, setProfile],
  );

  const back = useCallback(() => {
    const last = hist[hist.length - 1];
    if (!last || flying.current) return;
    const pair = TASTE_PAIRS[last.i];
    if (!pair) return;
    const opt = last.side === "S" ? null : pair[last.side === "L" ? 0 : 1];
    if (opt) {
      setProfile({
        ...withTaste(profile, applyPairSide(ensureTaste(profile), opt, -1)),
        demoPersona: false,
      });
    }
    setHist((prev) => prev.slice(0, -1));
    setIdx(last.i);
    setChosen(null);
    setTilt(0);
    onAnnounce(`Back to: ${pair[0].heading} or ${pair[1].heading}.`);
  }, [hist, onAnnounce, profile, setProfile]);

  const restart = useCallback(() => {
    let taste = ensureTaste(profile);
    for (let i = hist.length - 1; i >= 0; i -= 1) {
      const row = hist[i]!;
      const pair = TASTE_PAIRS[row.i];
      if (!pair || row.side === "S") continue;
      taste = applyPairSide(taste, pair[row.side === "L" ? 0 : 1], -1);
    }
    setProfile({ ...withTaste(profile, taste), demoPersona: false });
    setHist([]);
    setIdx(0);
    setChosen(null);
    onAnnounce("Taste deck restarted.");
  }, [hist, onAnnounce, profile, setProfile]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (target?.getAttribute("role") === "tab") return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        commit("L");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        commit("R");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (done || event.button !== 0) return;
    drag.current = { id: event.pointerId, x0: event.clientX, dx: 0, dragged: false };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || event.pointerId !== d.id) return;
    d.dx = event.clientX - d.x0;
    if (!d.dragged && Math.abs(d.dx) > 6) {
      d.dragged = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (!d.dragged) return;
    setTilt(live ? d.dx : 0);
    setLean(d.dx < -30 ? "L" : d.dx > 30 ? "R" : null);
  };
  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || event.pointerId !== d.id) return;
    drag.current = null;
    if (!d.dragged) return;
    if (Math.abs(d.dx) > 90) commit(d.dx < 0 ? "L" : "R", true);
    else {
      setTilt(0);
      setLean(null);
    }
  };

  const progress = idx / TASTE_PAIRS.length;
  const countLabel = `${String(Math.min(idx + 1, TASTE_PAIRS.length)).padStart(2, "0")} / ${String(TASTE_PAIRS.length).padStart(2, "0")}`;

  return (
    <section aria-labelledby="tasteH" className="fg-taste-spotlight">
      <div className="fg-start-pill">Start here</div>
      <div className="fg-taste-head">
        <h2 className="fg-taste-title" id="tasteH">
          This or that
        </h2>
        <span className="fg-eyebrow">{countLabel}</span>
      </div>
      <p className="fg-taste-lede">Pick a side. The ranked picks rewrite themselves.</p>
      <div className="fg-progress" aria-hidden="true">
        <i style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div
        className="fg-deck"
        tabIndex={0}
        role="group"
        aria-label="Taste deck. Use left and right arrow keys to pick, or the buttons."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {next2 && <PairCard pair={next2} depth={2} />}
        {next && <PairCard pair={next} depth={1} />}
        {current && (
          <PairCard
            pair={current}
            depth={0}
            chosen={chosen}
            lean={lean}
            tilt={tilt}
            live={live}
            onPick={(side) => {
              if (drag.current?.dragged) return;
              commit(side);
            }}
          />
        )}
        <div className={cn("fg-done", done && "on")}>
          <h3>
            Taste <em>locked in.</em>
          </h3>
          <p className="fg-mono" style={{ fontSize: 12, color: "var(--fg-muted)" }}>
            keep tuning with the dials
          </p>
          <button className="fg-ghost" type="button" onClick={restart} style={{ justifySelf: "center" }}>
            Start over
          </button>
        </div>
      </div>
      <div className="fg-deck-ctrl">
        <button className="fg-ghost" type="button" onClick={back} disabled={!hist.length} aria-label="Back to previous pair">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
          </svg>
          Back
        </button>
        <button className="fg-ghost" type="button" onClick={() => commit("S")} disabled={done}>
          Skip
        </button>
        <span className="fg-keys" aria-hidden="true">
          <kbd>←</kbd> <kbd>→</kbd>
        </span>
      </div>
    </section>
  );
}

function PairCard({
  pair,
  depth,
  chosen,
  lean,
  tilt,
  live,
  onPick,
}: {
  pair: [PairSide, PairSide];
  depth: number;
  chosen?: Side | null;
  lean?: "L" | "R" | null;
  tilt?: number;
  live?: boolean;
  onPick?: (side: "L" | "R") => void;
}) {
  const flying = chosen === "L" || chosen === "R" || chosen === "S";
  const dir = chosen === "L" ? -1 : chosen === "R" ? 1 : 0;
  let transform: string | undefined;
  if (depth === 0 && flying && live) {
    transform = dir
      ? `translateX(${dir * 135}%) translateY(-6%) rotate(${dir * 14}deg) rotateY(${dir * 18}deg)`
      : "translateY(-38%) scale(.92)";
  } else if (depth === 0 && tilt) {
    transform = `translateX(${tilt}px) rotate(${tilt * 0.05}deg) rotateY(${tilt * 0.04}deg)`;
  }
  return (
    <div
      className={cn("fg-pair", tilt && "dragging")}
      data-depth={depth}
      style={{
        zIndex: 10 - depth,
        transform,
        opacity: flying && depth === 0 ? 0 : undefined,
        transition: flying ? `transform 420ms ${EASE}, opacity 320ms ease-in` : undefined,
      }}
      aria-hidden={depth !== 0}
    >
      <Option side="L" label="This" heading={pair[0].heading} chosen={chosen === "L"} lean={lean === "L"} onPick={onPick} />
      <Option side="R" label="or that" heading={pair[1].heading} chosen={chosen === "R"} lean={lean === "R"} onPick={onPick} />
    </div>
  );
}

function Option({
  side,
  label,
  heading,
  chosen,
  lean,
  onPick,
}: {
  side: "L" | "R";
  label: string;
  heading: string;
  chosen?: boolean;
  lean?: boolean;
  onPick?: (side: "L" | "R") => void;
}) {
  return (
    <button
      className={cn("fg-opt", chosen && "chosen", lean && "lean")}
      type="button"
      data-side={side}
      aria-label={`Pick ${side === "L" ? "this" : "that"}: ${heading}`}
      onClick={() => onPick?.(side)}
    >
      <span className="fg-k">{label}</span>
      <h3>{heading}</h3>
      <svg className="fg-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path pathLength="1" strokeDasharray="1" strokeDashoffset="1" d="M5 12.5 10 17 19 7" />
      </svg>
    </button>
  );
}

