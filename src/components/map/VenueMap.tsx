import { ExpoBoothSheet } from "@/components/map/ExpoBoothSheet";
import { ExpoMustGoRail } from "@/components/map/ExpoMustGoRail";
import { ImageFloorMap, type MapPin } from "@/components/map/ImageFloorMap";
import { canPinOnExpo, placedExpoPins } from "@/lib/expo-pins";
import { Map3DSurface } from "@/components/map/Map3DSurface";
import type { Map3DPin } from "@/components/map/Map3DView";
import { JourneyHud, journeyStatus } from "@/components/map/JourneyHud";
import { MapProjectionSwitcher } from "@/components/map/MapProjectionSwitcher";
import { MapSwitcher } from "@/components/map/MapSwitcher";
import { SchematicSheetSwitcher } from "@/components/map/SchematicSheetSwitcher";
import { VenueLayerSwitcher } from "@/components/map/VenueLayerSwitcher";
import { VenueSchematic } from "@/components/map/VenueSchematic";
import { Button } from "@/components/ui/button";
import { catalog, venue } from "@/lib/catalog";
import { destinationAdvice } from "@/lib/map-destination";
import {
  EAST_REGISTRATION_ID,
  SOUTH_ENTRANCE_ID,
  detectWebGL,
  parseMapQuery,
  readStoredProjection,
  resolveOriginRoomId,
} from "@/lib/map-query";
import { interpolateNav, sample255Keyframes } from "@/lib/nav-playback";
import { motionEnabled } from "@/lib/motion";
import {
  HERO_DESTINATION_ID,
  HERO_DURATION_SEC,
  HERO_STEPS,
  heroHighlightId,
  heroStepAt,
  heroStepIndex,
  isHeroDemoId,
  markHeroPreviewPlayed,
  readHeroPreviewPlayed,
  sheetPointsForHero,
  shouldAutoplayHero,
  southToL2Keyframes,
} from "@/lib/south-to-l2";
import { VENUE_CONNECTORS, connectorTitle } from "@/lib/venue-connectors";
import { buildSchematic } from "@/lib/venue-schematic";
import { cn } from "@/lib/utils";
import { selectedRoomId, useAppState } from "@/state/app-state";
import { Locate } from "lucide-react";
import { FloorPlan } from "./FloorPlan";
import { FloorSwitcher } from "./FloorSwitcher";
import { MapLegend } from "./MapLegend";
import { wayfinding } from "@/lib/catalog";
import { useEffect, useMemo, useState } from "react";

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
    clearSelection,
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
    setSponsorPref,
    startNavTo255,
    goToStep,
  } = useAppState();
  const [building, setBuilding] = useState<(typeof BUILDINGS)[number]>("all");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("all");
  const [connectorId, setConnectorId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [navPlaying, setNavPlaying] = useState(false);
  const [navProgress, setNavProgress] = useState(0);
  const [journey, setJourney] = useState<"hero" | "sample" | null>(null);
  const [followActive, setFollowActive] = useState(false);
  const [explored, setExplored] = useState(false);
  const [mustOnly, setMustOnly] = useState(false);
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
  const topicalBooth = rankedBooths.find((row) => row.matchedTags.length > 0 || row.matchedQueries.length > 0)?.item;

  const expoPins = placedExpoPins(catalog.booths, sponsorPrefs).map((pin) => ({
    id: pin.id,
    nx: pin.nx,
    ny: pin.ny,
    label: pin.label,
    booth: pin.booth,
    pref: pin.pref,
    recommended: pin.mustGo || mustBooth?.id === pin.id,
    kind: "booth" as const,
    logoSrc: pin.booth.logo,
    logoOnDark: pin.booth.logoOnDark,
    mustGo: pin.mustGo,
  }));
  const visibleExpoPins = mustOnly ? expoPins.filter((pin) => pin.pref === "must") : expoPins;
  const unplacedBooths = catalog.booths.filter((b) => !b.pinAvailable);

  useEffect(() => {
    if (mapSurface !== "expo") return;
    if (selectedBooth) setDetailsOpen(true);
  }, [selectedBooth, mapSurface]);

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
  const connectorPins: Map3DPin[] = VENUE_CONNECTORS.filter((c) =>
    building === "all" ? true : c.building === building,
  ).map((c) => ({
    id: c.id,
    nx: c.nx,
    ny: c.ny,
    label: connectorTitle(c),
    kind: "connector",
    sublabel: c.matchedText,
  }));
  const threeVenuePins: Map3DPin[] = [
    ...venuePins.map((p) => ({ ...p, kind: "room" as const })),
    ...connectorPins,
  ];
  const sampleFrames = useMemo(() => sample255Keyframes(), []);
  const heroFrames = useMemo(() => southToL2Keyframes(), []);
  const navFrames = journey === "sample" ? sampleFrames : heroFrames;
  const navPose = useMemo(() => {
    if (journey !== "hero" && !(journey === "sample" && showPath)) return null;
    const t = reducedMotion && journey === "hero" ? (navProgress > 0 ? navProgress : 1) : navProgress;
    return interpolateNav(navFrames, t);
  }, [journey, showPath, navFrames, navProgress, reducedMotion]);

  useEffect(() => {
    const conflicting =
      Boolean(roomId) && !isHeroDemoId(roomId) && roomId !== EAST_REGISTRATION_ID && mapSurface !== "venue"
        ? true
        : Boolean(roomId) && !isHeroDemoId(roomId) && roomId !== HERO_DESTINATION_ID && roomId !== SOUTH_ENTRANCE_ID;
    const share = parseMapQuery(window.location.search, window.location.pathname);
    const explicitShare =
      resolveOriginRoomId(share.origin) === SOUTH_ENTRANCE_ID &&
      resolveOriginRoomId(share.destination) === HERO_DESTINATION_ID;
    const auto = shouldAutoplayHero({
      reducedMotion,
      webgl: detectWebGL(),
      storedProjection: readStoredProjection(),
      requestedProjection: mapProjection === "flat" ? "flat" : null,
      surface: mapSurface,
      originId: SOUTH_ENTRANCE_ID,
      destinationId: conflicting ? roomId : HERO_DESTINATION_ID,
      alreadyPlayed: readHeroPreviewPlayed(),
      explicitShare,
    });
    if (mapSurface !== "venue" || conflicting) {
      if (conflicting) setJourney(null);
      return;
    }
    if (!explicitShare) {
      setJourney(null);
      setNavPlaying(false);
      setFollowActive(false);
      return;
    }
    if (reducedMotion) {
      setJourney("hero");
      setNavProgress(1);
      setNavPlaying(false);
      setFollowActive(false);
      setSchematicSheet("salt-l2");
      return;
    }
    if (auto) {
      setJourney("hero");
      setNavProgress(0);
      setNavPlaying(true);
      setFollowActive(true);
      return;
    }
    setJourney("hero");
    setNavProgress(1);
    setNavPlaying(false);
    setFollowActive(false);
    // Fresh-visit preview only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!navPlaying || reducedMotion) return;
    let frame = 0;
    let last = performance.now();
    const duration = journey === "hero" ? HERO_DURATION_SEC : 16;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setNavProgress((prev) => {
        const next = Math.min(1, prev + dt / duration);
        if (next >= 1) {
          setNavPlaying(false);
          setFollowActive(false);
          markHeroPreviewPlayed();
        }
        return next;
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [navPlaying, reducedMotion, journey]);

  useEffect(() => {
    if (journey === "hero" && navPose) {
      const sheet = navPose.floor === 2 ? "salt-l2" : "salt-l1";
      if (schematicSheet !== sheet && (mapSurface === "venue" || journey === "hero")) {
        setSchematicSheet(sheet);
      }
      return;
    }
    if (mapSurface !== "sample" || !navPose || !showPath) return;
    if (floor !== navPose.floor) setFloor(navPose.floor);
    const last = wayfinding.steps.length - 1;
    if (last > 0) {
      const idx = Math.round(navProgress * last);
      if (idx !== stepIndex) goToStep(idx);
    }
  }, [navPose, navProgress, mapSurface, showPath, floor, stepIndex, goToStep, setFloor, journey, schematicSheet, setSchematicSheet]);
  const recommendedExpo = mustBooth?.id ?? topicalBooth?.id ?? null;
  const recommendedVenue = rankedSessions[0]?.item.roomId ?? null;
  const schematic = useMemo(
    () => buildSchematic(roomAnchors.length ? roomAnchors : undefined),
    [roomAnchors],
  );

  const stopHeroForExplore = () => {
    setNavPlaying(false);
    setFollowActive(false);
    setExplored(true);
    if (journey === "hero") setJourney(null);
  };

  const pickExpoBooth = (id: string) => {
    stopHeroForExplore();
    setConnectorId(null);
    setDetailsOpen(true);
    selectBooth(id, { jump: false });
    const booth = catalog.booths.find((item) => item.id === id);
    if (booth && canPinOnExpo(booth)) requestMapFocus(id);
  };

  const onSelectRoom = (id: string) => {
    if (!isHeroDemoId(id)) stopHeroForExplore();
    if (VENUE_CONNECTORS.some((c) => c.id === id)) {
      setConnectorId(id);
      clearSelection();
      setDetailsOpen(true);
      return;
    }
    setConnectorId(null);
    setDetailsOpen(true);
    const talk = officialSessions.find((s) => s.roomId === id);
    if (talk) selectSession(talk.id, { jump: false });
    else selectSpace(id);
  };

  const playHero = (fromStart: boolean) => {
    setMapSurface("venue");
    setVenueLayer("schematic");
    setJourney("hero");
    setConnectorId(null);
    setDetailsOpen(false);
    setNavProgress(fromStart ? 0 : navProgress >= 1 ? 0 : navProgress);
    if (reducedMotion) {
      setNavProgress(fromStart ? 0 : navProgress);
      setNavPlaying(false);
      setFollowActive(false);
      if (fromStart) setSchematicSheet("salt-l1");
      return;
    }
    setNavPlaying(true);
    setFollowActive(true);
    if (fromStart) {
      setSchematicSheet("salt-l1");
      resetMapCamera();
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === " " && (journey === "hero" || journey === "sample")) {
        event.preventDefault();
        if (navPlaying) {
          setNavPlaying(false);
          setFollowActive(false);
        } else if (journey === "sample") {
          startNavTo255({ stayOnMap: true });
          setNavProgress(navProgress >= 1 ? 0 : navProgress);
          setNavPlaying(!reducedMotion);
          setFollowActive(!reducedMotion);
        } else {
          playHero(navProgress >= 1);
        }
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        playHero(true);
      }
      if (event.key === "Escape") {
        setNavPlaying(false);
        setFollowActive(false);
        setDetailsOpen(false);
      }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const next = Math.min(HERO_STEPS.length - 1, Math.max(0, heroStepIndex(navProgress) + delta));
        const step = HERO_STEPS[next]!;
        setJourney("hero");
        setNavPlaying(false);
        setFollowActive(false);
        setNavProgress(step.progress);
        setSchematicSheet(step.sheet);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [journey, navPlaying, navProgress, reducedMotion, startNavTo255]);

  const selectedSchematic = schematic.rooms.find((room) => room.id === roomId) ?? null;
  const selectedAnchor = roomAnchors.find((room) => room.id === roomId) ?? null;
  const sampleSpace = venue.spaces.find((space) => space.id === roomId) ?? null;
  const selectedRoomChip =
    !detailsOpen || selectedBooth || connectorId || !roomId
      ? null
      : {
          id: roomId,
          label:
            selectedSchematic?.labelLines.join(" ") ??
            selectedAnchor?.label ??
            sampleSpace?.label ??
            roomId,
          detail: selectedAnchor
            ? `${selectedAnchor.building ?? "Venue"} ${selectedAnchor.level != null ? `L${selectedAnchor.level}` : ""} · ${
                selectedAnchor.placed ? "official pin" : "schedule label, not a venue.pdf pin"
              }`
            : mapSurface === "sample"
              ? "SAMPLE schematic space — not the official Salt Palace."
              : "Illustrative schematic block — not a surveyed coordinate.",
          placed: selectedAnchor?.placed ?? Boolean(selectedSchematic?.placedOnOfficial),
        };
  const roomsOnSheet = schematic.rooms
    .filter((room) => room.sheet === schematicSheet)
    .map((room) => ({
      id: room.id,
      label: room.labelLines.join(" "),
      detail: room.roomOrArea ?? room.labelLines.join(" "),
      placed: Boolean(room.placedOnOfficial),
    }));
  const connector = VENUE_CONNECTORS.find((item) => item.id === connectorId) ?? null;
  const boothRecord = catalog.booths.find((item) => item.id === selectedBooth) ?? null;
  const activeDestination = connector
    ? destinationAdvice({ kind: "connector", id: connector.id, label: connectorTitle(connector) })
    : boothRecord
      ? destinationAdvice({
          kind: "booth",
          id: boothRecord.id,
          label: boothRecord.sponsor,
          placed: boothRecord.pinAvailable,
        })
      : selectedRoomChip
        ? destinationAdvice({
            kind: "room",
            id: selectedRoomChip.id,
            label: selectedRoomChip.label,
            placed: selectedRoomChip.placed,
          })
        : null;

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
  const heroSelected = journey === "hero" ? heroHighlightId(navProgress) : null;
  const threeSelected =
    mapSurface === "expo" ? selectedBooth : connectorId ?? (journey === "hero" && !detailsOpen ? heroSelected : roomId);
  const threeRecommended = mapSurface === "expo" ? recommendedExpo : recommendedVenue;
  const threePins = mapSurface === "expo" ? visibleExpoPins : mapSurface === "venue" && venueLayer === "official" ? threeVenuePins : [];
  const resetToken = mapCameraReset + (mapFocus?.token ?? 0);

  const flatLayers = (
    <MapFlatLayers
      mapSurface={mapSurface}
      venueLayer={venueLayer}
      schematicSheet={schematicSheet}
      setSchematicSheet={setSchematicSheet}
      roomId={roomId}
      connectorId={connectorId}
      selectedBooth={selectedBooth}
      recommendedExpo={recommendedExpo}
      recommendedVenue={recommendedVenue}
      expoPins={visibleExpoPins}
      venuePins={[...venuePins, ...connectorPins]}
      unplaced={unplaced}
      building={building}
      setBuilding={setBuilding}
      level={level}
      setLevel={setLevel}
      onSelectRoom={onSelectRoom}
      selectBooth={pickExpoBooth}
      roomAnchors={roomAnchors}
      mapFocus={mapFocus}
      motion={motion}
      motionPref={motionPref}
      floor={floor}
      rankByRoom={rankByRoom}
      pathPoints={pathPoints}
      youAreHere={youAreHere}
      selectSpace={selectSpace}
      journeyPoints={journey === "hero" ? sheetPointsForHero(schematicSheet) : undefined}
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
          onSelect={(id) => {
            if (mapSurface === "expo") {
              pickExpoBooth(id);
              return;
            }
            onSelectRoom(id);
          }}
          reducedMotion={reducedMotion}
          resetToken={resetToken}
          imageSrc={threeImageSrc}
          pins={threePins}
          sampleSpaces={venue.spaces}
          sampleFloor={floor}
          samplePath={mapSurface === "sample" ? pathPoints : undefined}
          fallback={flatLayers}
          onError={() => setMapProjection("flat")}
          onSheet={setSchematicSheet}
          navPath={
            journey === "hero" && threeKind === "venue-schematic"
              ? heroFrames
              : journey === "sample" && mapSurface === "sample"
                ? sampleFrames
                : undefined
          }
          navMarker={
            journey === "hero" && threeKind === "venue-schematic"
              ? navPose?.position ?? null
              : journey === "sample"
                ? navPose?.position ?? null
                : null
          }
          journeyMode={journey}
          followActive={followActive && navPlaying}
          onUserInteract={() => {
            if (navPlaying) {
              setNavPlaying(false);
              setFollowActive(false);
              setExplored(true);
            }
          }}
        />
      ) : (
        flatLayers
      )}
      <div className="pointer-events-auto absolute inset-x-0 top-1 z-30 flex flex-wrap justify-start gap-1 px-2 lg:top-2 lg:flex-nowrap lg:justify-center lg:gap-2">
        <div className="pointer-events-auto">
          <MapSwitcher
            value={mapSurface}
            onChange={(next) => {
              setMapSurface(next);
              if (next !== "venue") stopHeroForExplore();
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
            <SchematicSheetSwitcher
              value={schematicSheet}
              onChange={(id) => {
                setSchematicSheet(id);
                resetMapCamera();
                const match = schematic.rooms.find((room) => room.id === roomId && room.sheet === id);
                if (match) requestMapFocus(match.id);
              }}
            />
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
      {map3dNotice ? (
        <div className="pointer-events-none absolute right-2 top-14 z-40 max-w-[min(48vw,16rem)]">
          <p className="rounded-xl border border-border bg-card/95 px-2.5 py-1.5 text-[11px] text-foreground shadow-sm">{map3dNotice}</p>
        </div>
      ) : null}
      {mapSurface === "expo" && (
        <div className="pointer-events-none absolute left-2 right-2 top-[3.35rem] z-40 flex flex-col gap-1 sm:right-auto sm:max-w-md lg:top-14">
          <ExpoMustGoRail
            prefs={sponsorPrefs}
            selectedId={selectedBooth}
            mustOnly={mustOnly}
            onMustOnly={(value) => {
              setMustOnly(value);
              if (value && selectedBooth && sponsorPrefs[selectedBooth] !== "must") {
                setDetailsOpen(false);
                if (selection?.kind === "booth") clearSelection();
              }
            }}
            onOpen={pickExpoBooth}
          />
        </div>
      )}
      {mapSurface === "expo" && detailsOpen && selectedBooth && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[60] p-2 pr-[4.35rem] pb-[calc(0.45rem+env(safe-area-inset-bottom))] sm:pr-2">
          <ExpoBoothSheet
            boothId={selectedBooth}
            prefs={sponsorPrefs}
            rankedBooths={rankedBooths}
            onClose={() => {
              setDetailsOpen(false);
              if (selection?.kind === "booth") clearSelection();
            }}
            onSetPref={setSponsorPref}
            onOpen={pickExpoBooth}
          />
        </div>
      )}
      {mapSurface !== "expo" && (
      <JourneyHud
        journey={journey}
        selectedBoothId={selectedBooth}
        selectedRoom={selectedRoomChip}
        roomsOnSheet={roomsOnSheet}
        sponsorPrefs={sponsorPrefs}
        onSelectBooth={pickExpoBooth}
        onSelectRoom={(id) => {
          setConnectorId(null);
          setDetailsOpen(true);
          onSelectRoom(id);
          requestMapFocus(id);
        }}
        onSetPref={setSponsorPref}
        connectorId={connectorId}
        onSelectConnector={(id) => {
          setConnectorId(id);
          if (id) clearSelection();
          setDetailsOpen(Boolean(id));
        }}
        onShowOfficialConnectors={() => {
          setMapSurface("venue");
          setVenueLayer("official");
          clearSelection();
        }}
        nextSession={
          rankedSessions[0]
            ? {
                id: rankedSessions[0].item.id,
                title: rankedSessions[0].item.title,
                roomLabel: rankedSessions[0].item.roomLabel ?? rankedSessions[0].item.roomId,
                why: rankedSessions[0].why,
              }
            : null
        }
        nextBooth={
          (mustBooth ?? topicalBooth)
            ? {
                id: (mustBooth ?? topicalBooth)!.id,
                sponsor: (mustBooth ?? topicalBooth)!.sponsor,
                boothNumber: (mustBooth ?? topicalBooth)!.boothNumber,
                why: "Official exhibitor match — not walking distance.",
              }
            : null
        }
        onOpenSession={(id) => {
          stopHeroForExplore();
          setConnectorId(null);
          setDetailsOpen(true);
          selectSession(id);
          const talk = officialSessions.find((item) => item.id === id) ?? resolveSession(id);
          if (talk?.roomId) requestMapFocus(talk.roomId);
        }}
        destination={activeDestination}
        onSetDestination={() => {
          if (!activeDestination?.playable) {
            if (selectedRoomChip) requestMapFocus(selectedRoomChip.id);
            return;
          }
          if (isHeroDemoId(selectedRoomChip?.id ?? "")) {
            playHero(true);
            return;
          }
          setConnectorId(null);
          setJourney("sample");
          startNavTo255({ stayOnMap: true });
          setNavProgress(reducedMotion ? 1 : 0);
          setNavPlaying(!reducedMotion);
          requestMapFocus("255");
        }}
        onDismissDetails={() => {
          setConnectorId(null);
          setDetailsOpen(false);
          if (selection?.kind === "booth") clearSelection();
        }}
        navPlaying={navPlaying}
        navProgress={navProgress}
        reducedMotion={reducedMotion}
        stepFree={stepFree}
        onPlay={() => {
          if (journey === "sample") {
            startNavTo255({ stayOnMap: true });
            setNavProgress(reducedMotion ? 1 : navProgress >= 1 ? 0 : navProgress);
            setNavPlaying(!reducedMotion);
            setFollowActive(!reducedMotion);
            return;
          }
          playHero(false);
        }}
        onPause={() => {
          setNavPlaying(false);
          setFollowActive(false);
        }}
        onReplay={() => playHero(true)}
        onExplore={() => {
          setNavPlaying(false);
          setFollowActive(false);
          setDetailsOpen(false);
          setExplored(true);
        }}
        showRecs={explored}
        showJourneyBar
        onStep={(delta) => {
          const next = Math.min(HERO_STEPS.length - 1, Math.max(0, heroStepIndex(navProgress) + delta));
          const step = HERO_STEPS[next]!;
          setJourney("hero");
          setNavPlaying(false);
          setFollowActive(false);
          setNavProgress(step.progress);
          setSchematicSheet(step.sheet);
        }}
        statusText={journeyStatus({
          journey,
          playing: navPlaying,
          reducedMotion,
          progress: navProgress,
          label: heroStepAt(navProgress).label,
        })}
      />
      )}
      {mapProjection === "3d" && (
        <div className="pointer-events-none absolute right-2 top-[3.7rem] z-30 hidden sm:block lg:top-[3.55rem]">
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
                  <button type="button" className="min-h-11 text-left underline-offset-2 hover:underline" onClick={() => pickExpoBooth(b.id)}>
                    {b.sponsor} · booth {b.boothNumber} not verified on expo.pdf
                  </button>
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
  connectorId,
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
  journeyPoints,
}: {
  mapSurface: "expo" | "venue" | "sample";
  venueLayer: "schematic" | "official";
  schematicSheet: "salt-l1" | "salt-l2" | "hyatt";
  setSchematicSheet: (id: "salt-l1" | "salt-l2" | "hyatt") => void;
  roomId: string | null;
  connectorId: string | null;
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
  journeyPoints?: { x: number; y: number }[];
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
          journeyPoints={journeyPoints}
        />
      )}
      {mapSurface === "venue" && venueLayer === "official" && (
        <>
          <ImageFloorMap
            src="/maps/venue-overview.png"
            alt="Official venue map, Salt Palace and Hyatt"
            pins={venuePins}
            selectedId={connectorId ?? roomId}
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
