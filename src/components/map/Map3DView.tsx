import { Edges, Html, OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
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
import { PORTALS, SHEETS, sheetById, type SchematicRoom, type SchematicSheetId } from "@/lib/venue-schematic";
import type { Space } from "@/lib/types";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type Map3DKind = "venue-schematic" | "image-plane" | "sample";

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

const CAMERA_FOV = 46;

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
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const sheet = sheetById(focusSheet);
  const selectedRoom = rooms.find((room) => room.id === selectedId);
  const selectedPin = pins?.find((pin) => pin.id === selectedId);
  const selectedName =
    selectedRoom?.labelLines.join(" ") ??
    selectedRoom?.roomOrArea ??
    selectedPin?.label ??
    (kind === "sample" ? (sampleSpaces?.find((space) => space.id === selectedId)?.label ?? "SAMPLE floor") : "Tap a room on this floor");
  const selectedElsewhere =
    selectedRoom && selectedRoom.sheet !== focusSheet && kind === "venue-schematic"
      ? `${selectedName} is on ${sheetById(selectedRoom.sheet).title}`
      : selectedName;
  const floorTitle =
    kind === "venue-schematic"
      ? sheet.title
      : kind === "sample"
        ? `SAMPLE · floor ${sampleFloor ?? 1}`
        : "Official floorplan image";

  return (
    <div className="absolute inset-0 min-h-0 min-w-0 bg-map-canvas pt-[4.5rem] pb-[15rem] lg:pt-16 lg:pb-36">
      <Canvas
        camera={{ fov: CAMERA_FOV, near: 0.1, far: 5000, position: [48, 72, 96] }}
        dpr={[1, 1.5]}
        frameloop={reducedMotion ? "demand" : "always"}
        gl={{ antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor(PALETTE.mapCanvas);
          gl.domElement.setAttribute("aria-hidden", "true");
          gl.domElement.tabIndex = -1;
        }}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[40, 90, 55]} intensity={1.35} />
        <hemisphereLight args={[PALETTE.secondary, "#8a9bb0", 0.55]} />
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
              compact={compact}
              onSheet={onSheet}
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
            />
          )}
        </Suspense>
      </Canvas>
      <aside className="pointer-events-none absolute left-2 top-[3.85rem] z-10 max-w-[min(94%,20rem)] rounded-xl border border-border bg-card/95 p-2.5 shadow-sm lg:top-[3.65rem]">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{floorTitle}</p>
        <p className="text-sm font-semibold leading-snug text-foreground">{selectedElsewhere}</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {kind === "venue-schematic"
            ? "Illustrative extrusion — not to scale, not GPS. Navy = selected. Gold = recommended."
            : kind === "image-plane"
              ? "Official image on a plane. Pins are image-relative, not buildings."
              : "SAMPLE extrusion — not the official Salt Palace."}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">Drag to orbit · two-finger pan · pinch zoom · Fit resets this floor.</p>
      </aside>
      <p className="pointer-events-none absolute bottom-1 left-2 max-w-[min(72%,22rem)] text-[10px] leading-snug text-foreground/80">
        {kind === "venue-schematic" && "WebGL 3D extrusion of the Floorwise schematic — not surveyed heights."}
        {kind === "image-plane" && "Official floorplan image on a 3D plane. Pins are not extruded buildings."}
        {kind === "sample" && "SAMPLE schematic extruded for orbit — not the official Salt Palace."}
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
}) {
  const visibleSheets = relatedSheets(focusSheet);
  const labelIds = useMemo(
    () => labeledRoomIds(rooms, focusSheet, selectedId, recommendedId, compact),
    [rooms, focusSheet, selectedId, recommendedId, compact],
  );
  const box = useMemo(
    () => focusWorldBox({ focusSheet, rooms, selectedId }),
    [focusSheet, rooms, selectedId],
  );

  return (
    <>
      <CameraRig box={box} resetToken={resetToken} reducedMotion={reducedMotion} />
      {SHEETS.filter((sheet) => visibleSheets.includes(sheet.id)).map((sheet) => {
        const sheetRooms = rooms.filter((room) => room.sheet === sheet.id);
        const plate = sheetPlate(sheet.id, rooms);
        const focused = sheet.id === focusSheet;
        return (
          <group key={sheet.id}>
            <mesh position={[plate.center.x, plate.center.y, plate.center.z]}>
              <boxGeometry args={[plate.width, 0.4, plate.depth]} />
              <meshStandardMaterial
                color={sheet.id === "hyatt" ? "#edc9b0" : focused ? "#9eb1c9" : "#c5d0e0"}
                transparent={!focused}
                opacity={focused ? 1 : 0.38}
                depthWrite={focused}
              />
            </mesh>
            <Html
              position={[plate.center.x, plate.center.y + (focused ? 3.4 : 8.2), plate.center.z - plate.depth * 0.46]}
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
                dimmed={!focused}
                showLabel={labelIds.has(room.id)}
                onSelect={onSelect}
              />
            ))}
          </group>
        );
      })}
      {PORTALS.filter((portal) => portal.sheet === focusSheet).map((portal) => {
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
  const height = selected ? 3.1 : room.kind === "entrance" ? 1.2 : room.kind === "hall" ? 2.1 : 2.4;
  const center = roomWorldCenter(room, height / 2);
  const color = selected
    ? PALETTE.primary
    : recommended
      ? PALETTE.highlight
      : room.placedOnOfficial
        ? "#e8eef6"
        : "#d9c48a";
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
      <meshStandardMaterial color={color} transparent={dimmed} opacity={dimmed ? 0.28 : 1} depthWrite={!dimmed} />
      {!dimmed ? <Edges threshold={80} color={selected ? "#fefefe" : PALETTE.primary} /> : null}
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
            ? "max-w-[12rem] rounded-md bg-primary px-2 py-1 text-center text-[12px] font-semibold leading-tight text-primary-foreground shadow-md"
            : "max-w-[11rem] rounded-md bg-[#0b0f1f] px-2 py-1 text-center text-[11px] font-semibold leading-tight text-white shadow-md"
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
}: {
  src: string;
  pins: Map3DPin[];
  selectedId: string | null;
  recommendedId: string | null;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  resetToken: number;
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
      <CameraRig box={box} resetToken={resetToken} reducedMotion={reducedMotion} />
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
                  selectedPin
                    ? PALETTE.primary
                    : rec
                      ? PALETTE.must
                      : connector
                        ? "#4b5d78"
                        : PALETTE.cta
                }
              />
            </mesh>
            {(selectedPin || rec || connector || booth) ? (
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
      <CameraRig box={box} resetToken={resetToken} reducedMotion={reducedMotion} />
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
            <meshStandardMaterial
              color={
                selectedSpace ? PALETTE.primary : space.kind === "vertical" ? "#334155" : "#e8eef6"
              }
            />
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
      {(navPath && navPath.length > 1 ? navPath : null)
        ? (navPath ?? []).slice(1).map((point, i) => {
            const prev = (navPath ?? [])[i]!;
            return <Segment key={`nav-${i}`} a={prev} b={point} />;
          })
        : path && path.length > 1
          ? path.slice(1).map((point, i) => {
              const prev = path[i]!;
              const a = { x: prev[0] * S, y: 0.5, z: prev[1] * S };
              const b = { x: point[0] * S, y: 0.5, z: point[1] * S };
              return <Segment key={i} a={a} b={b} />;
            })
          : null}
      {navMarker ? (
        <mesh position={[navMarker.x, navMarker.y + 0.6, navMarker.z]}>
          <sphereGeometry args={[0.85, 16, 16]} />
          <meshStandardMaterial color={PALETTE.cta} emissive={PALETTE.cta} emissiveIntensity={0.35} />
          <RoomLabel text="SAMPLE walker · not live GPS" strong position={[0, 1.4, 0]} />
        </mesh>
      ) : null}
    </>
  );
}

function Segment({ a, b }: { a: WorldPoint; b: WorldPoint }) {
  const start = new THREE.Vector3(a.x, a.y, a.z);
  const end = new THREE.Vector3(b.x, b.y, b.z);
  const dir = end.clone().sub(start);
  const length = Math.max(dir.length(), 0.01);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.28, 0.28, length, 8]} />
      <meshStandardMaterial color={PALETTE.primary} />
    </mesh>
  );
}

function CameraRig({
  box,
  resetToken,
  reducedMotion,
}: {
  box: WorldBox;
  resetToken: number;
  reducedMotion: boolean;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const controls = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);

  useLayoutEffect(() => {
    const pose = isometricPose(box, size.width / Math.max(size.height, 1), CAMERA_FOV);
    camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
    if (controls.current) {
      controls.current.target.set(pose.target.x, pose.target.y, pose.target.z);
      controls.current.update();
    }
    invalidate();
  }, [box, resetToken, camera, invalidate, size.width, size.height]);

  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      const pose = isometricPose(box, size.width / Math.max(size.height, 1), CAMERA_FOV);
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
      if (controls.current) {
        controls.current.target.set(pose.target.x, pose.target.y, pose.target.z);
        controls.current.update();
      }
      invalidate();
    };
    const first = window.requestAnimationFrame(apply);
    const second = window.requestAnimationFrame(() => window.requestAnimationFrame(apply));
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [box, resetToken, camera, invalidate, size.width, size.height]);

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
    />
  );
}
