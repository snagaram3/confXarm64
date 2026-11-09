import { PrefPicker } from "@/components/sponsor/PrefPicker";
import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { Button } from "@/components/ui/button";
import { catalog } from "@/lib/catalog";
import type { DestinationAdvice } from "@/lib/map-destination";
import { sampleNavDisclaimer } from "@/lib/nav-playback";
import { VENUE_CONNECTORS, VENUE_CONNECTOR_NOTE, connectorTitle } from "@/lib/venue-connectors";
import type { Rank } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Pause, Play, RotateCcw, X } from "lucide-react";

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

export function MapExperienceDock({
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
}: {
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
}) {
  const booth = catalog.booths.find((item) => item.id === selectedBoothId) ?? null;
  const connector = VENUE_CONNECTORS.find((item) => item.id === connectorId) ?? null;
  const panel = connector ? "connector" : booth ? "booth" : selectedRoom ? "room" : null;

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-[4.75rem] z-30 flex max-h-[36vh] flex-col gap-1.5 overflow-hidden lg:bottom-14 lg:max-h-[42%]">
      {(nextSession || nextBooth) && (
        <div className="pointer-events-auto flex gap-1 overflow-x-auto" role="list" aria-label="Recommendations on this map">
          {nextSession ? (
            <div role="listitem" className="shrink-0">
              <button
                type="button"
                className="fg-chrome min-h-11 px-2 py-1 text-left"
                onClick={() => onOpenSession(nextSession.id)}
              >
                <span className="fg-eyebrow">Next talk</span>
                <span className="block max-w-[14rem] truncate text-[11px] font-semibold">{nextSession.title}</span>
                <span className="block font-mono text-[10px] text-muted-foreground">{nextSession.roomLabel}</span>
              </button>
            </div>
          ) : null}
          {nextBooth ? (
            <div role="listitem" className="shrink-0">
              <button
                type="button"
                className="fg-chrome min-h-11 px-2 py-1 text-left"
                onClick={() => onSelectBooth(nextBooth.id)}
              >
                <span className="fg-eyebrow">Exhibitor match</span>
                <span className="block max-w-[11rem] truncate text-[11px] font-semibold">{nextBooth.sponsor}</span>
                <span className="block font-mono text-[10px] text-muted-foreground">#{nextBooth.boothNumber}</span>
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className={cn("fg-chrome pointer-events-auto overflow-hidden", panel && "max-sm:hidden")}>
        <p className="fg-eyebrow px-2 pt-1.5">
          Official exhibitors · PDF booth pins · not indoor GPS
        </p>
        <div className="flex gap-1 overflow-x-auto p-2" role="list">
          {catalog.booths.map((item) => {
            const selected = item.id === selectedBoothId;
            return (
              <div key={item.id} role="listitem" className="shrink-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${item.sponsor}, booth ${item.boothNumber}`}
                  onClick={() => onSelectBooth(item.id)}
                  className={cn(
                    "flex min-h-11 min-w-[7.5rem] items-center gap-2 rounded-lg border px-2 py-1 text-left",
                    selected ? "border-primary bg-primary/10" : "border-border bg-background",
                  )}
                >
                  <SponsorLogo booth={item} className="size-8" />
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-semibold">{item.sponsor}</span>
                    <span className="block font-mono text-[10px] text-muted-foreground">#{item.boothNumber}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {panel === "booth" && booth ? (
        <div
          className="pointer-events-auto max-h-40 overflow-auto rounded-xl border border-border bg-card p-2.5 shadow-sm"
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
                {booth.pinAvailable ? " · on official expo map" : " · unplaced on expo.pdf"}
              </p>
            </div>
            <button type="button" className="min-h-11 min-w-11" aria-label="Dismiss booth details" onClick={onDismissDetails}>
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{booth.exhibitorSource}</p>
          {destination ? <DestinationBlock advice={destination} onSet={onSetDestination} onPlay={onPlay} reducedMotion={reducedMotion} /> : null}
          <div className="mt-1">
            <PrefPicker name={booth.sponsor} value={sponsorPrefs[booth.id]} onChange={(next) => onSetPref(booth.id, next)} />
          </div>
        </div>
      ) : null}

      {panel === "connector" && connector ? (
        <div className="pointer-events-auto max-h-36 overflow-auto rounded-xl border border-border bg-card p-2.5 shadow-sm" role="region" aria-label={connectorTitle(connector)}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{connector.kind}</p>
              <p className="font-display text-sm font-semibold">{connectorTitle(connector)}</p>
            </div>
            <button type="button" className="min-h-11 min-w-11" aria-label="Dismiss connector details" onClick={onDismissDetails}>
              <X className="size-4" />
            </button>
          </div>
          <p className="text-xs">{connector.note}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{VENUE_CONNECTOR_NOTE}</p>
          {destination ? <DestinationBlock advice={destination} onSet={onSetDestination} onPlay={onPlay} reducedMotion={reducedMotion} /> : null}
        </div>
      ) : null}

      {panel === "room" && selectedRoom ? (
        <div className="pointer-events-auto max-h-36 overflow-auto rounded-xl border border-border bg-card p-2.5 shadow-sm" role="region" aria-label={`${selectedRoom.label} details`}>
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
          {destination ? <DestinationBlock advice={destination} onSet={onSetDestination} onPlay={onPlay} reducedMotion={reducedMotion} /> : null}
        </div>
      ) : null}

      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
        <details className="rounded-xl border border-border bg-card/95 text-xs shadow-sm">
          <summary className="cursor-pointer px-3 py-2 font-semibold">Rooms on this floor</summary>
          <ul className="max-h-32 space-y-1 overflow-auto px-3 pb-2">
            {roomsOnSheet.map((room) => (
              <li key={room.id}>
                <button type="button" className="min-h-9 w-full rounded-md px-1 text-left hover:bg-accent" onClick={() => onSelectRoom(room.id)}>
                  {room.label}
                  {!room.placed ? " · unmapped pin" : ""}
                </button>
              </li>
            ))}
          </ul>
        </details>
        <details className="rounded-xl border border-border bg-card/95 text-xs shadow-sm">
          <summary className="cursor-pointer px-3 py-2 font-semibold">Stairs / elevators (official labels)</summary>
          <ul className="max-h-32 space-y-1 overflow-auto px-3 pb-2">
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
                  {connectorTitle(item)}
                </button>
              </li>
            ))}
          </ul>
        </details>
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card/95 p-1 shadow-sm">
          {reducedMotion ? (
            <p className="px-2 text-[11px] text-muted-foreground">Static SAMPLE path — motion off</p>
          ) : navPlaying ? (
            <Button type="button" variant="outline" className="h-9 gap-1" onClick={onPause} aria-label="Pause SAMPLE walkthrough">
              <Pause className="size-3.5" /> Pause SAMPLE
            </Button>
          ) : (
            <Button type="button" variant="outline" className="h-9 gap-1" onClick={onPlay} aria-label="Play SAMPLE walkthrough">
              <Play className="size-3.5" /> Play SAMPLE
            </Button>
          )}
          <Button type="button" variant="ghost" className="h-9 gap-1" onClick={onReplay} aria-label="Replay SAMPLE walkthrough">
            <RotateCcw className="size-3.5" /> Replay SAMPLE
          </Button>
          <span className="sr-only">{Math.round(navProgress * 100)} percent through SAMPLE walkthrough</span>
        </div>
      </div>
      <p className="pointer-events-none max-w-xl text-[10px] text-foreground/80">{sampleNavDisclaimer(stepFree)}</p>
    </div>
  );
}

function DestinationBlock({
  advice,
  onSet,
  onPlay,
  reducedMotion,
}: {
  advice: DestinationAdvice;
  onSet: () => void;
  onPlay: () => void;
  reducedMotion: boolean;
}) {
  return (
    <div className="mt-2 rounded-lg border border-border bg-background px-2 py-1.5">
      <p className="text-[11px] font-semibold">{advice.title}</p>
      <p className="text-[11px] text-muted-foreground">{advice.body}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        <Button type="button" size="sm" variant="outline" className="h-9" onClick={onSet}>
          Set as destination
        </Button>
        {advice.playable && !reducedMotion ? (
          <Button type="button" size="sm" className="h-9" onClick={onPlay}>
            Play this SAMPLE walk
          </Button>
        ) : null}
      </div>
    </div>
  );
}
