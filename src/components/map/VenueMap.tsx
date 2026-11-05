import { ImageFloorMap } from "@/components/map/ImageFloorMap";
import { MapSwitcher } from "@/components/map/MapSwitcher";
import { catalog } from "@/lib/catalog";
import { useAppState } from "@/state/app-state";
import { FloorPlan } from "./FloorPlan";
import { FloorSwitcher } from "./FloorSwitcher";
import { MapLegend } from "./MapLegend";
import { wayfinding } from "@/lib/catalog";
import { selectedRoomId } from "@/state/app-state";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const BUILDINGS = ["all", "Salt Palace", "Hyatt Regency"] as const;
const LEVELS = ["all", 1, 2, 3, 4, 5] as const;

export function VenueMap() {
  const {
    floor,
    setFloor,
    rankByRoom,
    selection,
    selectSpace,
    selectBooth,
    selectSession,
    navigating,
    stepIndex,
    view,
    sponsorBoothId,
    sponsorPrefs,
    setSponsorPref,
    mapSurface,
    setMapSurface,
    officialSessions,
    roomAnchors,
    resolveSession,
  } = useAppState();
  const [building, setBuilding] = useState<(typeof BUILDINGS)[number]>("all");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");

  const roomId = selectedRoomId(
    selection,
    selection?.kind === "session" ? resolveSession(selection.id) : null,
  );
  const selectedBooth =
    view === "sponsor"
      ? sponsorBoothId
      : selection?.kind === "booth"
        ? selection.id
        : null;

  const showPath = navigating || view === "navigate";
  const step = wayfinding.steps[stepIndex];
  const pathPoints = showPath ? wayfinding.polylineByFloor[String(floor)] : undefined;
  const youAreHere = showPath && step?.floor === floor ? step.youAreHere : undefined;

  const expoPins = catalog.booths
    .filter((b) => b.pinAvailable && b.pinNx != null && b.pinNy != null)
    .map((b) => ({
      id: b.id,
      nx: b.pinNx as number,
      ny: b.pinNy as number,
      label: `${b.sponsor}, booth ${b.boothNumber}`,
      booth: b,
      pref: sponsorPrefs[b.id],
    }));
  const unplacedBooths = catalog.booths.filter((b) => !b.pinAvailable);

  const venuePins = useMemo(
    () =>
      (roomAnchors ?? [])
        .filter((r) => r.placed && r.nx != null && r.ny != null)
        .filter((r) => (building === "all" ? true : r.building === building))
        .filter((r) => (level === "all" ? true : r.level === level))
        .map((r) => ({
          id: r.id,
          nx: r.nx as number,
          ny: r.ny as number,
          label: r.label,
          sublabel: r.roomOrArea ?? r.label,
        })),
    [roomAnchors, building, level],
  );

  const unplaced = (roomAnchors ?? []).filter((r) => !r.placed);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-[#efeae1]">
      {mapSurface === "expo" && (
        <ImageFloorMap
          src="/maps/expo-floorplan.png"
          alt="Official Solutions Showcase floorplan with exhibitor logos"
          pins={expoPins}
          selectedId={selectedBooth}
          onSelect={(id) => selectBooth(id, { jump: false })}
          onOpenDetails={(id) => selectBooth(id)}
          onPrefChange={setSponsorPref}
          credit="Official expo.pdf · booth numbers registered from PDF text · image-relative anchors, not indoor GPS"
        />
      )}
      {mapSurface === "venue" && (
        <>
          <ImageFloorMap
            src="/maps/venue-overview.png"
            alt="Official venue map, Salt Palace and Hyatt"
            pins={venuePins}
            selectedId={roomId}
            onSelect={(id) => {
              const talk = officialSessions.find((s) => s.roomId === id);
              if (talk) selectSession(talk.id, { jump: false });
              else selectSpace(id);
            }}
            credit="Official venue.pdf · pins on verified labels only · Hyatt talks stay on Hyatt, not sample room 255"
          />
          <div className="pointer-events-none absolute left-3 top-14 z-20 flex max-w-[min(92vw,28rem)] flex-wrap gap-1">
            {BUILDINGS.map((b) => (
              <button
                key={b}
                type="button"
                className={cn(
                  "pointer-events-auto rounded-full border px-2 py-1 text-[11px] font-semibold",
                  building === b
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card/95 text-muted-foreground",
                )}
                onClick={() => setBuilding(b)}
              >
                {b === "all" ? "All buildings" : b}
              </button>
            ))}
            {LEVELS.map((lv) => (
              <button
                key={String(lv)}
                type="button"
                className={cn(
                  "pointer-events-auto rounded-full border px-2 py-1 text-[11px] font-semibold",
                  level === lv
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card/95 text-muted-foreground",
                )}
                onClick={() => setLevel(lv)}
              >
                {lv === "all" ? "All levels" : `L${lv}`}
              </button>
            ))}
          </div>
          {unplaced.length > 0 && (
            <details className="absolute bottom-10 left-3 z-20 max-w-sm rounded-xl border border-border bg-card/95 p-2 text-xs shadow-sm">
              <summary className="cursor-pointer font-semibold">
                {unplaced.length} rooms unplaced
              </summary>
              <ul className="mt-1 max-h-32 overflow-auto text-muted-foreground">
                {unplaced.map((r) => (
                  <li key={r.id}>
                    {r.label} — {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      {mapSurface === "sample" && (
        <FloorPlan
          floor={floor}
          rankByRoom={rankByRoom}
          selectedRoomId={roomId}
          pathPoints={pathPoints}
          youAreHere={youAreHere}
          onSelectSpace={selectSpace}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex flex-wrap justify-center gap-2 px-3">
        <div className="pointer-events-auto">
          <MapSwitcher value={mapSurface} onChange={setMapSurface} />
        </div>
        {mapSurface === "sample" && (
          <div className="pointer-events-auto">
            <FloorSwitcher floor={floor} onChange={setFloor} />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
        {mapSurface === "sample" && (
          <div className="pointer-events-auto">
            <MapLegend />
          </div>
        )}
        {mapSurface === "expo" && unplacedBooths.length > 0 && (
          <details className="pointer-events-auto max-w-sm rounded-xl border border-border bg-card/95 p-2 text-xs shadow-sm">
            <summary className="cursor-pointer font-semibold">
              {unplacedBooths.length} exhibitors unplaced
            </summary>
            <ul className="mt-1 text-muted-foreground">
              {unplacedBooths.map((b) => (
                <li key={b.id}>
                  {b.sponsor} · booth {b.boothNumber} not verified on expo.pdf
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
