import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motionEnabled } from "@/lib/motion";
import {
  SWIPE_DECK_SIZE,
  applySwipe,
  ensureTaste,
  pickNextSwipeCard,
  pickSwipeDeck,
  withTaste,
} from "@/lib/taste";
import type { Profile, Session, SwipeChoice } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { Heart, SkipForward, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SWIPE_PX = 72;

export function SwipeDeck({
  profile,
  onChange,
  onDone,
  onSkip,
  heading = "This or that",
  compact = false,
}: {
  profile: Profile;
  onChange: (profile: Profile) => void;
  onDone: (profile: Profile) => void;
  onSkip: () => void;
  heading?: string;
  compact?: boolean;
}) {
  const { officialSessions, motionPref } = useAppState();
  const taste = ensureTaste(profile);
  const [seen, setSeen] = useState<string[]>(() => taste.swipes.map((row) => row.sessionId));
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [exit, setExit] = useState<SwipeChoice | null>(null);
  const [announce, setAnnounce] = useState("");
  const start = useRef<{ x: number; y: number } | null>(null);
  const live = motionEnabled(motionPref);

  const queue = useMemo(() => {
    if (!officialSessions.length) return [];
    return pickSwipeDeck(officialSessions, taste, SWIPE_DECK_SIZE);
  }, [officialSessions, taste]);

  const current = useMemo(() => {
    const seenSet = new Set(seen);
    const fromQueue = queue.find((session) => !seenSet.has(session.id));
    if (fromQueue) return fromQueue;
    return pickNextSwipeCard(
      officialSessions,
      taste,
      seenSet,
      queue.slice(-2).map((session) => session.track),
    );
  }, [officialSessions, queue, seen, taste]);

  const remainingTarget = Math.max(0, SWIPE_DECK_SIZE - seen.length);
  const progress = Math.min(SWIPE_DECK_SIZE, seen.length);

  const choose = useCallback(
    (choice: SwipeChoice, session: Session) => {
      const nextTaste = applySwipe(ensureTaste(profile), session, choice);
      const nextProfile = { ...withTaste(profile, nextTaste), demoPersona: false };
      const nextSeen = seen.includes(session.id) ? seen : [...seen, session.id];
      setSeen(nextSeen);
      setDx(0);
      setDy(0);
      setExit(null);
      onChange(nextProfile);
      const verb = choice === "love" ? "Loved" : choice === "maybe" ? "Maybe" : "Skipped";
      const done = nextSeen.length >= SWIPE_DECK_SIZE;
      setAnnounce(`${verb} “${session.title}”.${done ? " Deck complete." : ""}`);
      if (done) onDone(nextProfile);
    },
    [onChange, onDone, profile, seen],
  );

  const flyThenChoose = useCallback(
    (choice: SwipeChoice, session: Session) => {
      if (!live) {
        choose(choice, session);
        return;
      }
      setExit(choice);
      window.setTimeout(() => choose(choice, session), 220);
    },
    [choose, live],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!current) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "ArrowRight" || event.key === "l" || event.key === "L") {
        event.preventDefault();
        flyThenChoose("love", current);
      } else if (event.key === "ArrowLeft" || event.key === "s" || event.key === "S") {
        event.preventDefault();
        flyThenChoose("skip", current);
      } else if (event.key === "ArrowDown" || event.key === "m" || event.key === "M") {
        event.preventDefault();
        flyThenChoose("maybe", current);
      } else if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, flyThenChoose, onSkip]);

  if (!officialSessions.length) {
    return (
      <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground" role="status">
        Loading official talks…
      </p>
    );
  }

  if (!current) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-xl font-semibold">{heading}</h2>
        <p className="text-sm text-muted-foreground">
          No more eligible official talks for this deck. You can tune weights on Home.
        </p>
        <Button type="button" onClick={() => onDone(profile)}>
          Continue
        </Button>
      </section>
    );
  }

  const when = `${current.start}–${current.end}`;
  const where = current.roomLabel ?? current.roomId;
  const transform = exit
    ? exit === "love"
      ? "translateX(120%) rotate(10deg)"
      : exit === "skip"
        ? "translateX(-120%) rotate(-10deg)"
        : "translateY(80%) rotate(-4deg)"
    : `translate(${dx}px, ${dy}px) rotate(${dx / 28}deg)`;

  return (
    <section className={cn("flex flex-col gap-4", compact && "gap-3")} aria-labelledby="swipe-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Not a filter panel</p>
          <h2 id="swipe-heading" className="font-display text-2xl font-semibold tracking-tight">
            {heading}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Official session cards only. Love, Maybe, or Skip — each choice updates your taste weights live. Skip the
            deck anytime.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={onSkip}>
          Skip deck
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <progress
          className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:bg-primary"
          max={SWIPE_DECK_SIZE}
          value={progress}
          aria-label={`Taste deck progress, ${progress} of ${SWIPE_DECK_SIZE}`}
        />
        <p className="shrink-0 font-mono text-xs text-muted-foreground">
          {progress}/{SWIPE_DECK_SIZE}
        </p>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div className="swipe-stage relative mx-auto w-full max-w-lg">
        <article
          className={cn("swipe-card rounded-3xl border border-border bg-card p-5 shadow-[0_16px_40px_rgba(17,62,130,0.12)]", !live && "swipe-card-static")}
          aria-labelledby={`swipe-card-${current.id}`}
          style={{ transform }}
          onPointerDown={(event) => {
            start.current = { x: event.clientX, y: event.clientY };
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!start.current) return;
            setDx(event.clientX - start.current.x);
            setDy(event.clientY - start.current.y);
          }}
          onPointerUp={() => {
            if (!start.current) return;
            if (dx > SWIPE_PX) flyThenChoose("love", current);
            else if (dx < -SWIPE_PX) flyThenChoose("skip", current);
            else if (dy > SWIPE_PX) flyThenChoose("maybe", current);
            else {
              setDx(0);
              setDy(0);
            }
            start.current = null;
          }}
          onPointerCancel={() => {
            start.current = null;
            setDx(0);
            setDy(0);
          }}
        >
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="path">{current.track}</Badge>
            {current.audienceLevel ? <Badge variant="outline">{current.audienceLevel}</Badge> : null}
            {(current.sessionTypeLabels ?? [])
              .filter((label) => label !== current.track)
              .slice(0, 1)
              .map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
          </div>
          <h3 id={`swipe-card-${current.id}`} className="mt-3 font-display text-xl font-semibold leading-snug">
            {current.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {where} · {when}
            {current.speaker && current.speaker !== "—" ? ` · ${current.speaker}` : ""}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground/85">
            {(current.abstract || "").slice(0, 220)}
            {(current.abstract?.length ?? 0) > 220 ? "…" : ""}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Swipe right to love, left to skip, down for maybe. Keyboard: ← skip · → love · ↓ maybe.
          </p>
        </article>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => flyThenChoose("skip", current)} aria-keyshortcuts="ArrowLeft s">
          <Undo2 className="size-4" aria-hidden />
          Skip
        </Button>
        <Button type="button" variant="maybe" className="flex-1" onClick={() => flyThenChoose("maybe", current)} aria-keyshortcuts="ArrowDown m">
          Maybe
        </Button>
        <Button type="button" variant="must" className="flex-1" onClick={() => flyThenChoose("love", current)} aria-keyshortcuts="ArrowRight l">
          <Heart className="size-4" aria-hidden />
          Love
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {remainingTarget} card{remainingTarget === 1 ? "" : "s"} left in this deck.
        <button type="button" className="ml-2 font-semibold text-primary" onClick={onSkip}>
          <SkipForward className="mr-1 inline size-3" aria-hidden />
          Finish with what I have
        </button>
      </p>
    </section>
  );
}
