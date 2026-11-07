import { ImageFloorMap, type MapPin } from "@/components/map/ImageFloorMap";
import { Map3DSurface } from "@/components/map/Map3DSurface";
import { MapProjectionSwitcher } from "@/components/map/MapProjectionSwitcher";
import { MapSwitcher } from "@/components/map/MapSwitcher";
import { SchematicSheetSwitcher } from "@/components/map/SchematicSheetSwitcher";
import { VenueLayerSwitcher } from "@/components/map/VenueLayerSwitcher";
import { VenueSchematic } from "@/components/map/VenueSchematic";
import { Button } from "@/components/ui/button";
import { catalog, venue } from "@/lib/catalog";
import { motionEnabled } from "@/lib/motion";
import { buildSchematic } from "@/lib/venue-schematic";
import { cn } from "@/lib/utils";
import { selectedRoomId, useAppState } from "@/state/app-state";
import { Locate } from "lucide-react";
import { FloorPlan } from "./FloorPlan";
import { FloorSwitcher } from "./FloorSwitcher";
import { MapLegend } from "./MapLegend";
import { wayfinding } from "@/lib/catalog";
import { useMemo, useState } from "react";

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
    mapSurface,
    setMapSurface,
    venueLayer,
    setVenueLayer,
    schematicSheet,
    setSchematicSheet,
    mapProjection,
    setMapProjection,
    map3dNotice,
    mapCameraReset,
    resetMapCamera,
    stepFree,
    officialSessions,
    roomAnchors,
    resolveSession,
    mapFocus,
    rankedBooths,
    rankedSessions,
    motionPref,
    requestMapFocus,
  } = useAppState();
  const [building, setBuilding] = useState<(typeof BUILDINGS)[number]>("all");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");
  const motion = motionEnabled(motionPref);
  const reducedMotion = !motion;

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

  const mustBooth =
    catalog.booths.find((b) => sponsorPrefs[b.id] === "must") ??
    rankedBooths.find((b) => b.rank === "must")?.item;

  const expoPins = catalog.booths
    .filter((b) => b.pinAvailable && b.pinNx != null && b.pinNy != null)
    .map((b) => ({
      id: b.id,
      nx: b.pinNx as number,
      ny: b.pinNy as number,
      label: `${b.sponsor}, booth ${b.boothNumber}`,
      booth: b,
      pref: sponsorPrefs[b.id],
      recommended: mustBooth?.id === b.id,
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
          recommended: rankedSessions[0]?.item.roomId === r.id,
        })),
    [roomAnchors, building, level, rankedSessions],
  );

  const unplaced = (roomAnchors ?? []).filter((r) => !r.placed);
  const recommendedExpo = mustBooth?.id ?? null;
  const recommendedVenue = rankedSessions[0]?.item.roomId ?? null;
  const schematic = useMemo(
    () => buildSchematic(roomAnchors.length ? roomAnchors : undefined),
    [roomAnchors],
  );

  const onSelectRoom = (id: string) => {
    const talk = officialSessions.find((s) => s.roomId === id);
    if (talk) selectSession(talk.id, { jump: false });
    else selectSpace(id);
  };

  const threeKind =
    mapSurface === "sample"
      ? "sample"
      : mapSurface === "venue" && venueLayer === "schematic"
        ? "venue-schematic"
        : "image-plane";
  const threeImageSrc =
    mapSurface === "expo"
      ? "/maps/expo-floorplan.png"
      : mapSurface === "venue" && venueLayer === "official"
        ? "/maps/venue-overview.png"
        : undefined;
  const threeSelected = mapSurface === "expo" ? selectedBooth : roomId;
  const threeRecommended = mapSurface === "expo" ? recommendedExpo : recommendedVenue;
  const threePins = mapSurface === "expo" ? expoPins : venuePins;
  const resetToken = mapCameraReset + (mapFocus?.token ?? 0);

  const flatLayers = (
    <MapFlatLayers
      mapSurface={mapSurface}
      venueLayer={venueLayer}
      schematicSheet={schematicSheet}
      setSchematicSheet={setSchematicSheet}
      roomId={roomId}
      selectedBooth={selectedBooth}
      recommendedExpo={recommendedExpo}
      recommendedVenue={recommendedVenue}
      expoPins={expoPins}
      venuePins={venuePins}
      unplaced={unplaced}
      building={building}
      setBuilding={setBuilding}
      level={level}
      setLevel={setLevel}
      onSelectRoom={onSelectRoom}
      selectBooth={selectBooth}
      roomAnchors={roomAnchors}
      mapFocus={mapFocus}
      motion={motion}
      motionPref={motionPref}
      floor={floor}
      rankByRoom={rankByRoom}
      pathPoints={pathPoints}
      youAreHere={youAreHere}
      selectSpace={selectSpace}
    />
  );

  return (
    <div className="absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden bg-map-canvas">
      {mapProjection === "3d" ? (
        <Map3DSurface
          kind={threeKind}
          rooms={schematic.rooms}
          selectedId={threeSelected}
          recommendedId={threeRecommended}
          focusSheet={schematicSheet}
          onSelect={mapSurface === "expo" ? (id) => selectBooth(id, { jump: false }) : onSelectRoom}
          reducedMotion={reducedMotion}
          resetToken={resetToken}
          imageSrc={threeImageSrc}
          pins={threePins}
          sampleSpaces={venue.spaces}
          sampleFloor={floor}
          samplePath={mapSurface === "sample" ? pathPoints : undefined}
          fallback={flatLayers}
          onError={() => setMapProjection("flat")}
        />
      ) : (
        flatLayers
      )}
      <div className="pointer-events-none absolute inset-x-0 top-2 z-30 flex flex-wrap justify-center gap-2 px-2">
        <div className="pointer-events-auto">
          <MapSwitcher
            value={mapSurface}
            onChange={(next) => {
              setMapSurface(next);
              if (next === "venue") setVenueLayer("schematic");
            }}
          />
        </div>
        {mapSurface === "venue" && (
          <div className="pointer-events-auto">
            <VenueLayerSwitcher value={venueLayer} onChange={setVenueLayer} />
          </div>
        )}
        {mapSurface === "venue" && venueLayer === "schematic" && (
          <div className="pointer-events-auto">
            <SchematicSheetSwitcher value={schematicSheet} onChange={setSchematicSheet} />
          </div>
        )}
        {mapSurface === "sample" && (
          <div className="pointer-events-auto">
            <FloorSwitcher floor={floor} onChange={setFloor} />
          </div>
        )}
        <div className="pointer-events-auto">
          <MapProjectionSwitcher value={mapProjection} onChange={setMapProjection} />
        </div>
      </div>
      {mapSurface === "venue" && venueLayer === "official" && mapProjection === "3d" && (
        <div className="pointer-events-none absolute left-2 top-14 z-20 flex max-w-[min(92vw,28rem)] flex-wrap gap-1">
          {BUILDINGS.map((b) => (
            <button
              key={b}
              type="button"
              className={cn(
                "pointer-events-auto min-h-8 rounded-full border px-2 py-1 text-[11px] font-semibold",
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
              key={`3d-${String(lv)}`}
              type="button"
              className={cn(
                "pointer-events-auto min-h-8 rounded-full border px-2 py-1 text-[11px] font-semibold",
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
      )}
      {(map3dNotice || stepFree) && (
        <div className="pointer-events-none absolute bottom-[calc(2.75rem+env(safe-area-inset-bottom))] left-2 z-40 max-w-[min(92vw,22rem)]">
          <p className="rounded-xl border border-border bg-card/95 px-3 py-2 text-xs text-foreground shadow-sm">
            {map3dNotice}
            {stepFree
              ? `${map3dNotice ? " " : ""}Step-free is a planning preference, not a verified accessible indoor route.`
              : null}
          </p>
        </div>
      )}
      {mapProjection === "3d" && (
        <div className="pointer-events-none absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-2 z-30">
          <Button
            type="button"
            variant="outline"
            className="pointer-events-auto h-11 gap-1 bg-card/95 px-3 shadow-sm"
            onClick={() => {
              resetMapCamera();
              if (threeSelected) requestMapFocus(threeSelected);
            }}
            aria-label="Reset 3D camera"
          >
            <Locate className="size-4" />
            <span className="text-[11px] font-semibold">Fit</span>
          </Button>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-2 right-14 flex flex-wrap items-end justify-between gap-2">
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

function MapFlatLayers({
  mapSurface,
  venueLayer,
  schematicSheet,
  setSchematicSheet,
  roomId,
  selectedBooth,
  recommendedExpo,
  recommendedVenue,
  expoPins,
  venuePins,
  unplaced,
  building,
  setBuilding,
  level,
  setLevel,
  onSelectRoom,
  selectBooth,
  roomAnchors,
  mapFocus,
  motion,
  motionPref,
  floor,
  rankByRoom,
  pathPoints,
  youAreHere,
  selectSpace,
}: {
  mapSurface: "expo" | "venue" | "sample";
  venueLayer: "schematic" | "official";
  schematicSheet: "salt-l1" | "salt-l2" | "hyatt";
  setSchematicSheet: (id: "salt-l1" | "salt-l2" | "hyatt") => void;
  roomId: string | null;
  selectedBooth: string | null;
  recommendedExpo: string | null;
  recommendedVenue: string | null;
  expoPins: MapPin[];
  venuePins: MapPin[];
  unplaced: Array<{ id: string; label: string; reason?: string }>;
  building: (typeof BUILDINGS)[number];
  setBuilding: (b: (typeof BUILDINGS)[number]) => void;
  level: (typeof LEVELS)[number];
  setLevel: (lv: (typeof LEVELS)[number]) => void;
  onSelectRoom: (id: string) => void;
  selectBooth: (id: string, opts?: { jump?: boolean }) => void;
  roomAnchors: Array<{
    id: string;
    label: string;
    building: string | null;
    level: number | null;
    placed: boolean;
    nx?: number;
    ny?: number;
    reason?: string;
    roomOrArea?: string;
  }>;
  mapFocus: { id: string; token: number } | null;
  motion: boolean;
  motionPref: "full" | "reduced";
  floor: 1 | 2 | 3;
  rankByRoom: Record<string, import("@/lib/types").Rank>;
  pathPoints: [number, number][] | undefined;
  youAreHere: [number, number] | undefined;
  selectSpace: (id: string) => void;
}) {
  return (
    <>
      {mapSurface === "expo" && (
        <ImageFloorMap
          src="/maps/expo-floorplan.png"
          alt="Official Solutions Showcase floorplan with exhibitor logos"
          pins={expoPins}
          selectedId={selectedBooth}
          onSelect={(id) => selectBooth(id, { jump: false })}
          credit="Official expo.pdf · image-relative PDF anchors, not indoor GPS"
          motion={motion}
          focusId={mapFocus?.id}
          focusToken={mapFocus?.token}
          recommendedId={recommendedExpo}
        />
      )}
      {mapSurface === "venue" && venueLayer === "schematic" && (
        <VenueSchematic
          sheet={schematicSheet}
          onSheet={setSchematicSheet}
          selectedId={roomId}
          recommendedId={recommendedVenue}
          onSelect={onSelectRoom}
          focusId={mapFocus?.id}
          focusToken={mapFocus?.token}
          motionPref={motionPref}
          rooms={roomAnchors}
        />
      )}
      {mapSurface === "venue" && venueLayer === "official" && (
        <>
          <ImageFloorMap
            src="/maps/venue-overview.png"
            alt="Official venue map, Salt Palace and Hyatt"
            pins={venuePins}
            selectedId={roomId}
            onSelect={onSelectRoom}
            credit="Official venue.pdf · verified labels only · Hyatt stays on Hyatt"
            motion={motion}
            focusId={mapFocus?.id}
            focusToken={mapFocus?.token}
            recommendedId={recommendedVenue}
          />
          <div className="pointer-events-none absolute left-2 top-14 z-20 flex max-w-[min(92vw,28rem)] flex-wrap gap-1">
            {BUILDINGS.map((b) => (
              <button
                key={b}
                type="button"
                className={cn(
                  "pointer-events-auto min-h-8 rounded-full border px-2 py-1 text-[11px] font-semibold",
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
                  "pointer-events-auto min-h-8 rounded-full border px-2 py-1 text-[11px] font-semibold",
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
            <details className="absolute bottom-10 left-2 z-20 max-w-[min(90vw,16rem)] rounded-xl border border-border bg-card/95 p-2 text-xs shadow-sm">
              <summary className="cursor-pointer font-semibold">{unplaced.length} rooms unplaced</summary>
              <ul className="mt-1 max-h-28 overflow-auto text-muted-foreground">
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
    </>
  );
}
