import { catalog, wayfinding } from "@/lib/catalog";
import { selectedRoomId, useAppState } from "@/state/app-state";
import { FloorPlan } from "./FloorPlan";
import { FloorSwitcher } from "./FloorSwitcher";
import { MapLegend } from "./MapLegend";

export function VenueMap() {
  const {
    floor,
    setFloor,
    rankByRoom,
    rankByBooth,
    selection,
    selectSpace,
    selectBooth,
    navigating,
    stepIndex,
    view,
    sponsorBoothId,
    rankedVisitors,
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

  const booth = catalog.booths.find((b) => b.id === sponsorBoothId);
  const visitors =
    view === "sponsor" && booth
      ? rankedVisitors.map((row, i) => {
          const angle = (i / Math.max(rankedVisitors.length, 1)) * Math.PI * 1.6 - 0.4;
          const dist = 28 + row.item.metersAway * 1.4;
          return {
            id: row.item.id,
            x: booth.x + booth.w / 2 + Math.cos(angle) * dist,
            y: booth.y + booth.h / 2 + Math.sin(angle) * dist,
            rank: row.rank,
            label: `${row.item.name} · ${row.rank} · ${row.item.metersAway}m`,
          };
        })
      : [];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-[#071018]">
      <FloorPlan
        floor={floor}
        rankByRoom={rankByRoom}
        rankByBooth={rankByBooth}
        selectedRoomId={roomId}
        selectedBoothId={selectedBooth}
        pathPoints={pathPoints}
        youAreHere={youAreHere}
        visitors={visitors}
        showBooths={floor === 1}
        onSelectSpace={selectSpace}
        onSelectBooth={selectBooth}
      />
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
        <div className="pointer-events-auto">
          <FloorSwitcher floor={floor} onChange={setFloor} />
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3">
        <div className="pointer-events-auto">
          <MapLegend />
        </div>
      </div>
    </div>
  );
}
