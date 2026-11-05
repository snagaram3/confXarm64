import { SponsorPinLayer } from "@/components/map/SponsorPinLayer";
import { sessionById, wayfinding } from "@/lib/catalog";
import { selectedRoomId, useAppState } from "@/state/app-state";
import { FloorPlan } from "./FloorPlan";
import { FloorSwitcher } from "./FloorSwitcher";
import { MapLegend } from "./MapLegend";

export function VenueMap() {
  const {
    floor,
    setFloor,
    rankByRoom,
    selection,
    selectSpace,
    selectBooth,
    navigating,
    stepIndex,
    view,
    sponsorBoothId,
    sponsorPrefs,
  } = useAppState();

  const roomId = selectedRoomId(selection);
  const selectedBooth =
    view === "sponsor"
      ? sponsorBoothId
      : selection?.kind === "booth"
        ? selection.id
        : null;

  const showPath = navigating || view === "navigate";
  const step = wayfinding.steps[stepIndex];
  const pathPoints = showPath
    ? wayfinding.polylineByFloor[String(floor)]
    : undefined;
  const youAreHere =
    showPath && step?.floor === floor ? step.youAreHere : undefined;

  const selectedSession =
    selection?.kind === "session" ? sessionById(selection.id) : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-[#efeae1]">
      <FloorPlan
        floor={floor}
        rankByRoom={rankByRoom}
        selectedRoomId={roomId}
        pathPoints={pathPoints}
        youAreHere={youAreHere}
        onSelectSpace={selectSpace}
      />
      {floor === 1 && (
        <SponsorPinLayer
          selectedId={selectedBooth}
          prefs={sponsorPrefs}
          onSelect={selectBooth}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
        <div className="pointer-events-auto">
          <FloorSwitcher floor={floor} onChange={setFloor} />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
        <div className="pointer-events-auto">
          <MapLegend />
        </div>
        {selectedSession && selectedSession.floor !== floor && (
          <button
            type="button"
            onClick={() => setFloor(selectedSession.floor)}
            className="pointer-events-auto min-h-11 rounded-full border border-border bg-card px-3 text-xs font-semibold text-primary shadow-sm"
          >
            Room {selectedSession.roomId} is on L{selectedSession.floor}
          </button>
        )}
      </div>
    </div>
  );
}
