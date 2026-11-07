import { PrefPicker } from "@/components/sponsor/PrefPicker";
import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { Button } from "@/components/ui/button";
import { catalog } from "@/lib/catalog";
import type { DestinationAdvice } from "@/lib/map-destination";
import { sampleNavDisclaimer } from "@/lib/nav-playback";
import {
  HERO_JOURNEY_DISCLAIMER_SHORT,
  HERO_JOURNEY_TITLE,
  HERO_STEPS,
  heroStepIndex,
} from "@/lib/south-to-l2";
import { VENUE_CONNECTORS, VENUE_CONNECTOR_NOTE, connectorTitle } from "@/lib/venue-connectors";
import type { Rank } from "@/lib/types";
import { ChevronLeft, ChevronRight, Compass, Pause, Play, RotateCcw, X } from "lucide-react";

export interface NextSessionChip {
  id: string;
  title: string;
  roomLabel: string;
  why: string;
}

export interface NextBoothChip {
  id: string;
  sponsor: string;
  boothNumber: string;
  why: string;
}

export interface SelectedRoomChip {
  id: string;
  label: string;
  detail: string;
  placed: boolean;
}

export function JourneyHud({
  journey,
  selectedBoothId,
  selectedRoom,
  roomsOnSheet,
  sponsorPrefs,
  onSelectBooth,
  onSelectRoom,
  onSetPref,
  connectorId,
  onSelectConnector,
  onShowOfficialConnectors,
  nextSession,
  nextBooth,
  onOpenSession,
  destination,
  onSetDestination,
  onDismissDetails,
  navPlaying,
  navProgress,
  reducedMotion,
  stepFree,
  onPlay,
  onPause,
  onReplay,
  onExplore,
  onStep,
  statusText,
  showRecs = true,
  showJourneyBar = true,
}: {
  journey: "hero" | "sample" | null;
  selectedBoothId: string | null;
  selectedRoom: SelectedRoomChip | null;
  roomsOnSheet: SelectedRoomChip[];
  sponsorPrefs: Record<string, Rank>;
  onSelectBooth: (id: string) => void;
  onSelectRoom: (id: string) => void;
  onSetPref: (id: string, pref: Rank | undefined) => void;
  connectorId: string | null;
  onSelectConnector: (id: string | null) => void;
  onShowOfficialConnectors: () => void;
  nextSession: NextSessionChip | null;
  nextBooth: NextBoothChip | null;
  onOpenSession: (id: string) => void;
  destination: DestinationAdvice | null;
  onSetDestination: () => void;
  onDismissDetails: () => void;
  navPlaying: boolean;
  navProgress: number;
  reducedMotion: boolean;
  stepFree: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  onExplore: () => void;
  onStep: (delta: number) => void;
  statusText: string;
  showRecs?: boolean;
  showJourneyBar?: boolean;
}) {
  const booth = catalog.booths.find((item) => item.id === selectedBoothId) ?? null;
  const connector = VENUE_CONNECTORS.find((item) => item.id === connectorId) ?? null;
  const panel = connector ? "connector" : booth ? "booth" : selectedRoom ? "room" : null;
  const hero = journey === "hero";
  const sample = journey === "sample";
  const step = HERO_STEPS[heroStepIndex(navProgress)] ?? HERO_STEPS[0]!;
  const recs = showRecs && !navPlaying && !panel && (nextSession || nextBooth);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end gap-1.5 p-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] sm:p-3">
      <p className="sr-only" aria-live="polite">
        {statusText}
      </p>
      {recs ? (
        <div className="pointer-events-auto mx-auto flex w-full max-w-xl gap-1 overflow-x-auto" role="list" aria-label="Recommendations on this map">
          {nextSession ? (
            <div role="listitem" className="min-w-0 flex-1">
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-2 rounded-2xl border border-white/15 bg-[#0b0f1f]/80 px-3 py-1.5 text-left text-white shadow-lg backdrop-blur-md"
                onClick={() => onOpenSession(nextSession.id)}
              >
                <span className="rounded-full bg-cta px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">Talk</span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold">{nextSession.title}</span>
                  <span className="block truncate text-[10px] text-white/70">
                    {nextSession.roomLabel} · {nextSession.why}
                  </span>
                </span>
              </button>
            </div>
          ) : null}
          {nextBooth ? (
            <div role="listitem" className="shrink-0">
              <button
                type="button"
                className="flex min-h-11 max-w-[14rem] items-center gap-2 rounded-2xl border border-white/15 bg-[#0b0f1f]/80 px-3 py-1.5 text-left text-white shadow-lg backdrop-blur-md"
                onClick={() => onSelectBooth(nextBooth.id)}
              >
                <span className="rounded-full border border-highlight/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-highlight">
                  Booth
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold">{nextBooth.sponsor}</span>
                  <span className="block font-mono text-[10px] text-white/70">#{nextBooth.boothNumber}</span>
                </span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {panel === "booth" && booth ? (
        <div
          className="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-border bg-card/96 p-3 shadow-lg"
          role="region"
          aria-label={`${booth.sponsor} booth details`}
        >
          <div className="flex items-start gap-2">
            <SponsorLogo booth={booth} className="size-10" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold">{booth.sponsor}</p>
              <p className="text-[11px] text-muted-foreground">{booth.tagline}</p>
              <p className="mt-0.5 font-mono text-[11px] text-primary">
                Booth {booth.boothNumber}
                {booth.pinAvailable ? " · official expo pin" : " · unplaced on expo.pdf"}
              </p>
            </div>
            <button type="button" className="min-h-11 min-w-11" aria-label="Dismiss booth details" onClick={onDismissDetails}>
              <X className="size-4" />
            </button>
          </div>
          {destination ? <DestinationBlock advice={destination} onSet={onSetDestination} playable={false} /> : null}
          <div className="mt-1">
            <PrefPicker name={booth.sponsor} value={sponsorPrefs[booth.id]} onChange={(next) => onSetPref(booth.id, next)} />
          </div>
        </div>
      ) : null}

      {panel === "connector" && connector ? (
        <div className="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-border bg-card/96 p-3 shadow-lg" role="region" aria-label={connectorTitle(connector)}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Official PDF label</p>
              <p className="font-display text-sm font-semibold">{connectorTitle(connector)}</p>
            </div>
            <button type="button" className="min-h-11 min-w-11" aria-label="Dismiss connector details" onClick={onDismissDetails}>
              <X className="size-4" />
            </button>
          </div>
          <p className="text-xs">{connector.note}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{VENUE_CONNECTOR_NOTE}</p>
          {destination ? <DestinationBlock advice={destination} onSet={onSetDestination} playable={false} /> : null}
        </div>
      ) : null}

      {panel === "room" && selectedRoom ? (
        <div className="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-border bg-card/96 p-3 shadow-lg" role="region" aria-label={`${selectedRoom.label} details`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Selected space</p>
              <p className="font-display text-sm font-semibold">{selectedRoom.label}</p>
              <p className="text-[11px] text-muted-foreground">{selectedRoom.detail}</p>
            </div>
            <button type="button" className="min-h-11 min-w-11" aria-label="Dismiss room details" onClick={onDismissDetails}>
              <X className="size-4" />
            </button>
          </div>
          {destination ? (
            <DestinationBlock
              advice={destination}
              onSet={onSetDestination}
              playable={destination.playable && (hero || sample)}
              onPlay={onPlay}
            />
          ) : null}
        </div>
      ) : null}

      {showJourneyBar ? (
      <div className="pointer-events-auto mx-auto w-full max-w-xl rounded-2xl border border-white/12 bg-[#0b0f1f]/90 px-3 py-2 text-white shadow-[0_12px_40px_rgba(11,15,31,0.35)] backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-highlight">
              Illustrative — not verified onsite
            </p>
            <p className="truncate font-display text-[14px] font-semibold leading-tight sm:text-[15px]">
              {hero ? <span className="sm:hidden">South → L2</span> : null}
              {hero ? <span className="hidden sm:inline">{HERO_JOURNEY_TITLE}</span> : sample ? "SAMPLE walk to 255" : "Salt Palace + Hyatt"}
            </p>
            <p className="hidden truncate text-[11px] text-white/70 sm:block">
              {hero ? step.label : sample ? sampleNavDisclaimer(stepFree) : "Tap a room or booth · no verified indoor graph"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {reducedMotion && hero ? (
              <>
                <Button type="button" variant="outline" className="h-10 border-white/20 bg-white/5 px-2 text-white hover:bg-white/10" onClick={() => onStep(-1)} aria-label="Previous journey step">
                  <ChevronLeft className="size-4" />
                </Button>
                <Button type="button" variant="outline" className="h-10 border-white/20 bg-white/5 px-2 text-white hover:bg-white/10" onClick={() => onStep(1)} aria-label="Next journey step">
                  <ChevronRight className="size-4" />
                </Button>
              </>
            ) : navPlaying ? (
              <Button type="button" variant="outline" className="h-10 gap-1 border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={onPause} aria-label={hero ? "Pause illustrative journey" : "Pause SAMPLE walkthrough"}>
                <Pause className="size-3.5" /> Pause
              </Button>
            ) : (
              <Button type="button" className="h-10 gap-1 bg-cta text-cta-fg hover:bg-cta/90" onClick={onPlay} aria-label={hero ? "Play illustrative journey" : sample ? "Play SAMPLE walkthrough" : "Play illustrative journey"}>
                <Play className="size-3.5" /> {navProgress > 0 && navProgress < 1 ? "Resume" : "Play"}
              </Button>
            )}
            <Button type="button" variant="ghost" className="h-10 gap-1 text-white hover:bg-white/10" onClick={onReplay} aria-label="Replay journey">
              <RotateCcw className="size-3.5" /> Replay
            </Button>
            <Button type="button" variant="ghost" className="h-10 gap-1 text-white hover:bg-white/10" onClick={onExplore} aria-label="Explore the map">
              <Compass className="size-3.5" /> Explore
            </Button>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
          <div className="h-full rounded-full bg-highlight transition-[width] duration-200" style={{ width: `${Math.round(navProgress * 100)}%` }} />
        </div>
        <div className="mt-2 hidden flex-wrap items-center gap-1 sm:flex">
          <details className="rounded-full bg-white/8 text-[11px]">
            <summary className="cursor-pointer px-3 py-1.5 font-semibold">Rooms</summary>
            <ul className="absolute bottom-14 left-3 z-40 max-h-40 w-[min(90vw,18rem)] space-y-1 overflow-auto rounded-xl border border-border bg-card p-2 text-foreground shadow-lg">
              {roomsOnSheet.map((room) => (
                <li key={room.id}>
                  <button type="button" className="min-h-9 w-full rounded-md px-1 text-left hover:bg-accent" onClick={() => onSelectRoom(room.id)}>
                    {room.label}
                    {!room.placed ? " · schedule label" : ""}
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <details className="rounded-full bg-white/8 text-[11px]">
            <summary className="cursor-pointer px-3 py-1.5 font-semibold">PDF stairs/elevators</summary>
            <ul className="absolute bottom-14 left-3 z-40 max-h-40 w-[min(90vw,20rem)] space-y-1 overflow-auto rounded-xl border border-border bg-card p-2 text-foreground shadow-lg">
              {VENUE_CONNECTORS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="min-h-9 w-full rounded-md px-1 text-left hover:bg-accent"
                    onClick={() => {
                      onSelectConnector(item.id);
                      onShowOfficialConnectors();
                    }}
                  >
                    {connectorTitle(item)} · printed label
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <p className="hidden px-2 text-[10px] text-white/55 sm:block">Space pause · R replay · Esc explore · ← → steps</p>
        </div>
      </div>
      ) : null}
    </div>
  );
}

function DestinationBlock({
  advice,
  onSet,
  onPlay,
  playable,
}: {
  advice: DestinationAdvice;
  onSet: () => void;
  onPlay?: () => void;
  playable: boolean;
}) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-background px-2 py-1.5">
      <p className="text-[11px] font-semibold">{advice.title}</p>
      <p className="text-[11px] text-muted-foreground">{advice.body}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {playable ? (
          <Button type="button" size="sm" className="h-9" onClick={onPlay}>
            Play this journey
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" className="h-9" onClick={onSet}>
            Focus this place
          </Button>
        )}
      </div>
    </div>
  );
}

export function journeyStatus(input: {
  journey: "hero" | "sample" | null;
  playing: boolean;
  reducedMotion: boolean;
  progress: number;
  label: string;
}): string {
  if (input.reducedMotion && input.journey === "hero") {
    return `${HERO_JOURNEY_DISCLAIMER_SHORT}. Static complete journey. ${input.label}`;
  }
  if (input.playing) return `Playing ${input.journey === "sample" ? "SAMPLE walk" : "illustrative journey"}. ${input.label}`;
  if (input.progress >= 1) return `Journey complete. ${input.label}`;
  return input.label;
}
