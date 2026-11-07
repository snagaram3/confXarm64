import { Edges, Html, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PALETTE } from "@/theme/tokens";
import { venue } from "@/lib/catalog";
import {
  WORLD_FLOOR_GAP,
  WORLD_SCALE,
  focusWorldBox,
  isometricPose,
  labeledRoomIds,
  relatedSheets,
  roomWorldCenter,
  sheetPlate,
  worldPoint,
  type WorldBox,
  type WorldPoint,
} from "@/lib/map-3d-world";
import { HERO_ORIGIN_ID, HERO_DESTINATION_ID, HERO_SHAFT_LABEL, heroShaftWorld } from "@/lib/south-to-l2";
import { PORTALS, SHEETS, type SchematicRoom, type SchematicSheetId } from "@/lib/venue-schematic";
import type { Space } from "@/lib/types";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type Map3DKind = "venue-schematic" | "image-plane" | "sample";
export type MapJourneyMode = "hero" | "sample" | null;

export interface Map3DPin {
  id: string;
  nx: number;
  ny: number;
  label: string;
  kind?: "booth" | "connector" | "room";
  logoSrc?: string | null;
  logoOnDark?: boolean;
  sublabel?: string;
}

const CAMERA_FOV = 42;
const HERO_L2_SHIFT = 24;

export default function Map3DView({
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
  onSheet?: (id: SchematicSheetId) => void;
  navPath?: WorldPoint[];
  navMarker?: WorldPoint | null;
  journeyMode?: MapJourneyMode;
  followActive?: boolean;
  onUserInteract?: () => void;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const hero = journeyMode === "hero";

  return (
    <div className="absolute inset-0 min-h-0 min-w-0 bg-map-canvas pt-[3.35rem] pb-[7.25rem] sm:pb-[7.5rem] lg:pt-14 lg:pb-24">
      <Canvas
        camera={{ fov: CAMERA_FOV, near: 0.1, far: 5000, position: [48, 72, 96] }}
        dpr={[1, 1.75]}
        frameloop={reducedMotion ? "demand" : "always"}
        gl={{ antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor(PALETTE.mapCanvas);
          gl.domElement.setAttribute("aria-hidden", "true");
          gl.domElement.tabIndex = -1;
        }}
      >
        <fog attach="fog" args={[PALETTE.mapCanvas, 90, 320]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[48, 110, 36]} intensity={1.45} />
        <directionalLight position={[-40, 28, -24]} intensity={0.28} color={PALETTE.peach} />
        <hemisphereLight args={["#e8eef6", "#7d8ca3", 0.42]} />
        <Suspense fallback={null}>
          {kind === "venue-schematic" && (
            <SchematicScene
              rooms={rooms}
              selectedId={selectedId}
              recommendedId={recommendedId}
              focusSheet={focusSheet}
              onSelect={onSelect}
              reducedMotion={reducedMotion}
              resetToken={resetToken}
              compact={compact || hero}
              onSheet={onSheet}
              navPath={hero ? navPath : undefined}
              navMarker={hero ? navMarker ?? null : null}
              hero={hero}
              followActive={Boolean(followActive && hero)}
              onUserInteract={onUserInteract}
            />
          )}
          {kind === "image-plane" && imageSrc && (
            <ImagePlaneScene
              src={imageSrc}
              pins={pins ?? []}
              selectedId={selectedId}
              recommendedId={recommendedId}
              onSelect={onSelect}
              reducedMotion={reducedMotion}
              resetToken={resetToken}
              onUserInteract={onUserInteract}
            />
          )}
          {kind === "sample" && (
            <SampleScene
              spaces={sampleSpaces ?? []}
              floor={sampleFloor ?? 1}
              selectedId={selectedId}
              path={samplePath}
              onSelect={onSelect}
              reducedMotion={reducedMotion}
              resetToken={resetToken}
              navPath={navPath}
              navMarker={navMarker}
              followActive={Boolean(followActive)}
              onUserInteract={onUserInteract}
            />
          )}
        </Suspense>
      </Canvas>
      <p className="sr-only">
        Drag to orbit. Pinch zoom. Fit resets the camera. Keyboard: Space pause, R replay, Escape explore, arrows for steps.
      </p>
    </div>
  );
}

function SchematicScene({
  rooms,
  selectedId,
  recommendedId,
  focusSheet,
  onSelect,
  reducedMotion,
  resetToken,
  compact,
  onSheet,
  navPath,
  navMarker,
  hero,
  followActive,
  onUserInteract,
}: {
  rooms: SchematicRoom[];
  selectedId: string | null;
  recommendedId: string | null;
  focusSheet: SchematicSheetId;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  resetToken: number;
  compact: boolean;
  onSheet?: (id: SchematicSheetId) => void;
  navPath?: WorldPoint[];
  navMarker?: WorldPoint | null;
  hero: boolean;
  followActive: boolean;
  onUserInteract?: () => void;
}) {
  const visibleSheets = relatedSheets(focusSheet);
  const labelIds = useMemo(() => {
    const ids = labeledRoomIds(rooms, focusSheet, selectedId, recommendedId, compact || hero);
    if (hero) {
      ids.add(HERO_ORIGIN_ID);
      ids.add(HERO_DESTINATION_ID);
    }
    return ids;
  }, [rooms, focusSheet, selectedId, recommendedId, compact, hero]);
  const box = useMemo(() => {
    const base = focusWorldBox({ focusSheet, rooms, selectedId: hero ? null : selectedId });
    if (hero && !compact) {
      base.max.x += HERO_L2_SHIFT;
      base.center.x += HERO_L2_SHIFT * 0.5;
    }
    return base;
  }, [focusSheet, rooms, selectedId, hero, compact]);
  const shaft = heroShaftWorld();

  return (
    <>
      <CameraRig
        box={box}
        resetToken={resetToken}
        reducedMotion={reducedMotion}
        followPoint={followActive ? shiftHeroPoint(navMarker ?? null, hero && !compact) : null}
        onUserInteract={onUserInteract}
        profile={hero ? "hero" : "default"}
      />
      {SHEETS.filter((sheet) => visibleSheets.includes(sheet.id)).map((sheet) => {
        const sheetRooms = rooms.filter((room) => room.sheet === sheet.id);
        const plate = sheetPlate(sheet.id, rooms);
        const focused = sheet.id === focusSheet;
        const showFloor = hero || focused;
        const shiftX = hero && !compact && sheet.id === "salt-l2" ? HERO_L2_SHIFT : 0;
        return (
          <group key={sheet.id} position={[shiftX, 0, 0]}>
            <mesh position={[plate.center.x, plate.center.y, plate.center.z]} receiveShadow>
              <boxGeometry args={[plate.width, 0.38, plate.depth]} />
              <meshStandardMaterial
                color={sheet.id === "hyatt" ? "#edc9b0" : focused ? "#8ea3bf" : "#b7c4d6"}
                transparent={!focused}
                opacity={hero ? (focused ? 1 : 0.72) : focused ? 1 : 0.34}
                depthWrite={focused || hero}
                roughness={0.72}
              />
            </mesh>
            <Html
              position={[plate.center.x, plate.center.y + (focused ? 3.6 : 7.4), plate.center.z - plate.depth * 0.46]}
              center
              sprite
              zIndexRange={[12, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div
                className={
                  focused
                    ? "rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground shadow-md"
                    : "rounded-md bg-[#0b0f1f]/80 px-2 py-0.5 text-[10px] font-semibold text-white shadow"
                }
              >
                {sheet.title}
              </div>
            </Html>
            {sheetRooms.map((room) => (
              <RoomMesh
                key={room.id}
                room={room}
                selected={room.id === selectedId}
                recommended={room.id === recommendedId}
                dimmed={!showFloor}
                showLabel={labelIds.has(room.id) && (hero ? room.id === selectedId || room.id === HERO_ORIGIN_ID || room.id === HERO_DESTINATION_ID || room.kind === "entrance" : true) && (focused || hero)}
                onSelect={onSelect}
              />
            ))}
          </group>
        );
      })}
      {hero ? <DemoShaft x={shaft.x} z={shaft.z} compact={compact} /> : null}
      {navPath && navPath.length > 1 ? (
        <JourneyRibbon path={navPath.map((point) => shiftHeroPoint(point, hero && !compact)!)} marker={shiftHeroPoint(navMarker ?? null, hero && !compact)} />
      ) : null}
      {navMarker ? (
        <ProgressMarker
          point={shiftHeroPoint(navMarker, hero && !compact)!}
          caption={hero ? null : "SAMPLE walker · not GPS"}
        />
      ) : null}
      {!hero &&
        PORTALS.filter((portal) => portal.sheet === focusSheet).map((portal) => {
          const point = worldPoint(portal.sheet, portal.point, 3.2);
          return (
            <Html key={`${portal.sheet}-${portal.toSheet}`} position={[point.x, point.y, point.z]} center sprite zIndexRange={[24, 0]}>
              <button
                type="button"
                className="rounded-md border border-border bg-[#0b0f1f] px-2 py-1 text-[10px] font-semibold text-white shadow"
                onClick={(event) => {
                  event.stopPropagation();
                  onSheet?.(portal.toSheet);
                }}
              >
                {portal.label} · schematic link, not stairs
              </button>
            </Html>
          );
        })}
    </>
  );
}

function shiftHeroPoint(point: WorldPoint | null, hero: boolean): WorldPoint | null {
  if (!point) return null;
  if (!hero || point.y < WORLD_FLOOR_GAP * 0.75) return point;
  return { ...point, x: point.x + HERO_L2_SHIFT };
}

function DemoShaft({ x, z, compact }: { x: number; z: number; compact: boolean }) {
  const h = WORLD_FLOOR_GAP + 1.4;
  const shift = compact ? 0 : HERO_L2_SHIFT * 0.35;
  return (
    <group position={[x + shift, h / 2, z]}>
      <mesh>
        <cylinderGeometry args={[1.05, 1.35, h, 24, 1, true]} />
        <meshStandardMaterial
          color={PALETTE.cta}
          transparent
          opacity={0.28}
          emissive={PALETTE.cta}
          emissiveIntensity={0.32}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, h, 8]} />
        <meshStandardMaterial color={PALETTE.highlight} emissive={PALETTE.highlight} emissiveIntensity={0.6} />
      </mesh>
      {compact ? null : (
        <Html position={[0, h / 2 + 0.35, 0]} center sprite zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
          <div className="max-w-[8.5rem] rounded-md bg-cta px-2 py-1 text-center text-[10px] font-bold leading-tight text-white shadow-md">
            {HERO_SHAFT_LABEL}
          </div>
        </Html>
      )}
    </group>
  );
}

function JourneyRibbon({ path, marker }: { path: WorldPoint[]; marker: WorldPoint | null }) {
  const traveled = useMemo(() => {
    if (!marker || path.length < 2) return path.length - 1;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < path.length; i += 1) {
      const point = path[i]!;
      const d = Math.hypot(point.x - marker.x, point.y - marker.y, point.z - marker.z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }, [path, marker]);
  return (
    <>
      {path.slice(1).map((point, i) => {
        const prev = path[i]!;
        const vertical = Math.abs(point.y - prev.y) > Math.hypot(point.x - prev.x, point.z - prev.z);
        const done = i < traveled;
        return (
          <Segment
            key={`rib-${i}`}
            a={prev}
            b={point}
            color={vertical ? PALETTE.cta : PALETTE.primary}
            radius={done ? 0.42 : 0.2}
            opacity={done ? 1 : 0.28}
          />
        );
      })}
    </>
  );
}

function ProgressMarker({ point, caption }: { point: WorldPoint; caption: string | null }) {
  return (
    <mesh position={[point.x, point.y + 0.7, point.z]}>
      <sphereGeometry args={[0.78, 20, 20]} />
      <meshStandardMaterial color={PALETTE.highlight} emissive={PALETTE.cta} emissiveIntensity={0.5} />
      {caption ? (
        <Html position={[1.8, 0.9, 0]} center sprite zIndexRange={[50, 0]} style={{ pointerEvents: "none" }}>
          <div className="rounded-md bg-[#0b0f1f] px-2 py-1 text-[10px] font-semibold text-white shadow">{caption}</div>
        </Html>
      ) : null}
    </mesh>
  );
}

function RoomMesh({
  room,
  selected,
  recommended,
  dimmed,
  showLabel,
  onSelect,
}: {
  room: SchematicRoom;
  selected: boolean;
  recommended: boolean;
  dimmed: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
}) {
  const height = selected ? 2.7 : room.kind === "entrance" ? 1.35 : room.kind === "hall" ? 2.05 : 2.15;
  const center = roomWorldCenter(room, height / 2);
  const color = selected
    ? PALETTE.primary
    : recommended
      ? PALETTE.highlight
      : room.placedOnOfficial
        ? "#eef3f9"
        : "#e2d3a8";
  return (
    <mesh
      position={[center.x, center.y, center.z]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(room.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <boxGeometry args={[Math.max(0.55, room.rect.w * WORLD_SCALE - 0.28), height, Math.max(0.55, room.rect.h * WORLD_SCALE - 0.28)]} />
      <meshStandardMaterial color={color} transparent={dimmed} opacity={dimmed ? 0.32 : 1} depthWrite={!dimmed} roughness={0.55} />
      {!dimmed ? <Edges threshold={80} color={selected ? PALETTE.highlight : PALETTE.primary} /> : null}
      {showLabel && !dimmed ? (
        <RoomLabel text={room.labelLines.join(" ")} strong={selected} position={[0, height / 2 + 0.15, 0]} />
      ) : null}
    </mesh>
  );
}

function RoomLabel({
  text,
  strong,
  position,
}: {
  text: string;
  strong: boolean;
  position: [number, number, number];
}) {
  return (
    <Html position={position} center sprite zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
      <div
        className={
          strong
            ? "max-w-[11rem] rounded-md bg-primary px-2 py-1 text-center text-[12px] font-semibold leading-tight text-primary-foreground shadow-md"
            : "max-w-[10rem] rounded-md bg-[#0b0f1f] px-2 py-1 text-center text-[11px] font-semibold leading-tight text-white shadow-md"
        }
      >
        {text}
      </div>
    </Html>
  );
}

function ImagePlaneScene({
  src,
  pins,
  selectedId,
  recommendedId,
  onSelect,
  reducedMotion,
  resetToken,
  onUserInteract,
}: {
  src: string;
  pins: Map3DPin[];
  selectedId: string | null;
  recommendedId: string | null;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  resetToken: number;
  onUserInteract?: () => void;
}) {
  const texture = useTexture(src);
  texture.colorSpace = THREE.SRGBColorSpace;
  const image = texture.image as { width?: number; height?: number } | undefined;
  const aspect = image?.height ? (image.width ?? 1) / image.height : 1.35;
  const width = 110;
  const depth = width / aspect;
  const selected = pins.find((pin) => pin.id === selectedId);
  const box = useMemo<WorldBox>(() => {
    const min = { x: -width / 2, y: 0, z: -depth / 2 };
    const max = { x: width / 2, y: 3, z: depth / 2 };
    if (selected) {
      const x = (selected.nx - 0.5) * width;
      const z = (selected.ny - 0.5) * depth;
      return {
        min: { x: x - 14, y: 0, z: z - 14 },
        max: { x: x + 14, y: 4, z: z + 14 },
        center: { x, y: 1.2, z },
      };
    }
    return {
      min,
      max,
      center: { x: 0, y: 0.4, z: 0 },
    };
  }, [selected, width, depth]);
  return (
    <>
      <CameraRig box={box} resetToken={resetToken} reducedMotion={reducedMotion} onUserInteract={onUserInteract} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {pins.map((pin) => {
        const x = (pin.nx - 0.5) * width;
        const z = (pin.ny - 0.5) * depth;
        const selectedPin = pin.id === selectedId;
        const rec = pin.id === recommendedId;
        const connector = pin.kind === "connector";
        const booth = pin.kind === "booth";
        const showLabel = selectedPin || rec || connector;
        return (
          <group key={pin.id} position={[x, selectedPin ? 1.4 : 0.85, z]}>
            <mesh
              onClick={(event) => {
                event.stopPropagation();
                onSelect(pin.id);
              }}
              onPointerOver={(event) => {
                event.stopPropagation();
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "auto";
              }}
            >
              <cylinderGeometry
                args={[
                  selectedPin ? 1.05 : booth ? 0.7 : 0.55,
                  selectedPin ? 1.05 : booth ? 0.7 : 0.55,
                  selectedPin ? 2.4 : 1.2,
                  12,
                ]}
              />
              <meshStandardMaterial
                color={
                  selectedPin ? PALETTE.primary : rec ? PALETTE.must : connector ? "#4b5d78" : PALETTE.cta
                }
              />
            </mesh>
            {showLabel ? (
              <Html center sprite zIndexRange={[28, 0]} style={{ pointerEvents: "auto" }} position={[0, selectedPin ? 2.2 : 1.35, 0]}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(pin.id);
                  }}
                  className={
                    selectedPin
                      ? "flex max-w-[9rem] items-center gap-1 rounded-md bg-primary px-1.5 py-1 text-left text-[11px] font-semibold text-primary-foreground shadow"
                      : connector
                        ? "rounded-md bg-[#0b0f1f] px-1.5 py-1 text-[10px] font-semibold text-white shadow"
                        : "flex max-w-[8.5rem] items-center gap-1 rounded-md bg-card px-1.5 py-1 text-left text-[10px] font-semibold text-foreground shadow"
                  }
                  aria-label={pin.label}
                >
                  {pin.logoSrc ? (
                    <img
                      src={pin.logoSrc}
                      alt=""
                      className={pin.logoOnDark ? "size-6 rounded bg-primary object-contain p-0.5" : "size-6 rounded bg-white object-contain"}
                    />
                  ) : null}
                  <span className="leading-tight">{pin.label}</span>
                </button>
              </Html>
            ) : null}
          </group>
        );
      })}
    </>
  );
}

function SampleScene({
  spaces,
  floor,
  selectedId,
  path,
  onSelect,
  reducedMotion,
  resetToken,
  navPath,
  navMarker,
  followActive,
  onUserInteract,
}: {
  spaces: Space[];
  floor: number;
  selectedId: string | null;
  path?: [number, number][];
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  resetToken: number;
  navPath?: WorldPoint[];
  navMarker?: WorldPoint | null;
  followActive?: boolean;
  onUserInteract?: () => void;
}) {
  const S = WORLD_SCALE;
  const stacked = Boolean(navPath && navPath.length > 1);
  const visible = useMemo(
    () => (stacked ? spaces.filter((space) => space.floor === 1 || space.floor === 2) : spaces.filter((space) => space.floor === floor)),
    [spaces, floor, stacked],
  );
  const selected = visible.find((space) => space.id === selectedId);
  const box = useMemo<WorldBox>(() => {
    const { w, h } = venue.viewBox;
    const top = stacked ? WORLD_FLOOR_GAP + 6 : 4;
    const min = { x: 0, y: 0, z: 0 };
    const max = { x: w * S, y: top, z: h * S };
    const center = { x: (w / 2) * S, y: stacked ? WORLD_FLOOR_GAP * 0.45 : 1.2, z: (h / 2) * S };
    if (!selected || stacked) return { min, max, center };
    const x = (selected.x + selected.w / 2) * S;
    const z = (selected.y + selected.h / 2) * S;
    return {
      min: { x: x - 12, y: 0, z: z - 12 },
      max: { x: x + 12, y: 4, z: z + 12 },
      center: { x, y: 2, z },
    };
  }, [selected, S, stacked]);
  const { w, h } = venue.viewBox;
  const floors = stacked ? [1, 2] : [floor];
  return (
    <>
      <CameraRig
        box={box}
        resetToken={resetToken}
        reducedMotion={reducedMotion}
        followPoint={followActive ? navMarker ?? null : null}
        onUserInteract={onUserInteract}
      />
      {floors.map((lvl) => (
        <mesh key={`plate-${lvl}`} position={[(w / 2) * S, (lvl - 1) * WORLD_FLOOR_GAP - 0.2, (h / 2) * S]}>
          <boxGeometry args={[w * S, 0.3, h * S]} />
          <meshStandardMaterial color={lvl === floor ? "#9eb1c9" : "#c5d0e0"} transparent={lvl !== floor} opacity={lvl === floor ? 1 : 0.4} />
        </mesh>
      ))}
      {visible.map((space) => {
        const height =
          space.kind === "vertical" ? 3.4 : space.kind === "room" ? 2.2 : space.kind === "hall" ? 1.4 : 0.8;
        const selectedSpace = space.id === selectedId;
        return (
          <mesh
            key={space.id}
            position={[(space.x + space.w / 2) * S, (space.floor - 1) * WORLD_FLOOR_GAP + height / 2, (space.y + space.h / 2) * S]}
            onClick={(event) => {
              event.stopPropagation();
              if (space.kind === "room" || space.kind === "hall" || space.kind === "vertical") onSelect(space.id);
            }}
          >
            <boxGeometry args={[space.w * S, height, space.h * S]} />
            <meshStandardMaterial color={selectedSpace ? PALETTE.primary : space.kind === "vertical" ? "#334155" : "#e8eef6"} />
            <Edges color={PALETTE.primary} />
            {selectedSpace || space.kind === "entrance" || space.kind === "vertical" ? (
              <RoomLabel
                text={space.kind === "vertical" ? `SAMPLE ${space.label}` : space.label}
                strong={selectedSpace || space.kind === "vertical"}
                position={[0, height / 2 + 0.2, 0]}
              />
            ) : null}
          </mesh>
        );
      })}
      {navPath && navPath.length > 1 ? (
        <JourneyRibbon path={navPath} marker={navMarker ?? null} />
      ) : path && path.length > 1 ? (
        path.slice(1).map((point, i) => {
          const prev = path[i]!;
          const a = { x: prev[0] * S, y: 0.5, z: prev[1] * S };
          const b = { x: point[0] * S, y: 0.5, z: point[1] * S };
          return <Segment key={i} a={a} b={b} color={PALETTE.primary} />;
        })
      ) : null}
      {navMarker ? <ProgressMarker point={navMarker} caption="SAMPLE walker · not live GPS" /> : null}
    </>
  );
}

function Segment({
  a,
  b,
  color = PALETTE.primary,
  radius = 0.28,
  opacity = 1,
}: {
  a: WorldPoint;
  b: WorldPoint;
  color?: string;
  radius?: number;
  opacity?: number;
}) {
  const start = new THREE.Vector3(a.x, a.y, a.z);
  const end = new THREE.Vector3(b.x, b.y, b.z);
  const dir = end.clone().sub(start);
  const length = Math.max(dir.length(), 0.01);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={opacity > 0.5 ? 0.22 : 0.05}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity > 0.5}
      />
    </mesh>
  );
}

function CameraRig({
  box,
  resetToken,
  reducedMotion,
  followPoint = null,
  onUserInteract,
  profile = "default",
}: {
  box: WorldBox;
  resetToken: number;
  reducedMotion: boolean;
  followPoint?: WorldPoint | null;
  onUserInteract?: () => void;
  profile?: "default" | "hero";
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const controls = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);
  const boxRef = useRef(box);
  boxRef.current = box;
  const ignoreStart = useRef(0);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const applyPose = () => {
    const pose = isometricPose(boxRef.current, size.width / Math.max(size.height, 1), CAMERA_FOV, profileRef.current);
    ignoreStart.current = 2;
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
    if (controls.current) {
      controls.current.target.set(pose.target.x, pose.target.y, pose.target.z);
      controls.current.update();
    }
    invalidate();
  };

  useLayoutEffect(() => {
    applyPose();
    // Snap only on Fit / explicit reset — not on every selection, which caused settle jitter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken, camera, invalidate, size.width, size.height]);

  useFrame((_, dt) => {
    if (!followPoint || !controls.current) return;
    const pose = isometricPose(boxRef.current, size.width / Math.max(size.height, 1), CAMERA_FOV, profileRef.current);
    const mix = 0.42;
    const target = new THREE.Vector3(
      followPoint.x * mix + pose.target.x * (1 - mix),
      followPoint.y + 1.6,
      followPoint.z * mix + pose.target.z * (1 - mix),
    );
    const offset = new THREE.Vector3(
      pose.position.x - pose.target.x,
      pose.position.y - pose.target.y,
      pose.position.z - pose.target.z,
    );
    const desired = target.clone().add(offset);
    const t = Math.min(1, dt * 2.1);
    controls.current.target.lerp(target, t);
    camera.position.lerp(desired, t);
    controls.current.update();
  });

  return (
    <OrbitControls
      ref={controls as never}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      enablePan
      screenSpacePanning
      minDistance={12}
      maxDistance={280}
      maxPolarAngle={Math.PI / 2.12}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      makeDefault
      onStart={() => {
        if (ignoreStart.current > 0) {
          ignoreStart.current -= 1;
          return;
        }
        onUserInteract?.();
      }}
    />
  );
}
