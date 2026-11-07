import { Map3DErrorBoundary } from "@/components/map/Map3DErrorBoundary";
import type { Map3DKind, Map3DPin, MapJourneyMode } from "@/components/map/Map3DView";
import type { WorldPoint } from "@/lib/map-3d-world";
import type { SchematicRoom, SchematicSheetId } from "@/lib/venue-schematic";
import type { Space } from "@/lib/types";
import { lazy, Suspense, type ReactNode } from "react";

const Map3DView = lazy(() => import("@/components/map/Map3DView"));

export function Map3DSurface({
  kind,
  rooms,
  selectedId,
  recommendedId,
  focusSheet,
  onSelect,
  reducedMotion,
  resetToken,
  imageSrc,
  pins,
  sampleSpaces,
  sampleFloor,
  samplePath,
  fallback,
  onError,
  onSheet,
  navPath,
  navMarker,
  journeyMode,
  followActive,
  onUserInteract,
}: {
  kind: Map3DKind;
  rooms: SchematicRoom[];
  selectedId: string | null;
  recommendedId: string | null;
  focusSheet: SchematicSheetId;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  resetToken: number;
  imageSrc?: string;
  pins?: Map3DPin[];
  sampleSpaces?: Space[];
  sampleFloor?: number;
  samplePath?: [number, number][];
  fallback: ReactNode;
  onError: () => void;
  onSheet?: (id: SchematicSheetId) => void;
  navPath?: WorldPoint[];
  navMarker?: WorldPoint | null;
  journeyMode?: MapJourneyMode;
  followActive?: boolean;
  onUserInteract?: () => void;
}) {
  return (
    <Map3DErrorBoundary fallback={fallback} onError={onError}>
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center bg-map-canvas text-sm text-muted-foreground">
            Loading 3D map…
          </div>
        }
      >
        <Map3DView
          kind={kind}
          rooms={rooms}
          selectedId={selectedId}
          recommendedId={recommendedId}
          focusSheet={focusSheet}
          onSelect={onSelect}
          reducedMotion={reducedMotion}
          resetToken={resetToken}
          imageSrc={imageSrc}
          pins={pins}
          sampleSpaces={sampleSpaces}
          sampleFloor={sampleFloor}
          samplePath={samplePath}
          onSheet={onSheet}
          navPath={navPath}
          navMarker={navMarker}
          journeyMode={journeyMode}
          followActive={followActive}
          onUserInteract={onUserInteract}
        />
      </Suspense>
    </Map3DErrorBoundary>
  );
}
