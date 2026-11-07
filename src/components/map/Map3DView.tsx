import { OrbitControls, useTexture } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { PALETTE } from "@/theme/tokens";
import { venue } from "@/lib/catalog";
import { plateFromRects, roomWorldCenter, WORLD_SCALE, type WorldPoint } from "@/lib/map-3d-world";
import { SHEETS, type SchematicRoom, type SchematicSheetId } from "@/lib/venue-schematic";
import type { Space } from "@/lib/types";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type Map3DKind = "venue-schematic" | "image-plane" | "sample";

export interface Map3DPin {
  id: string;
  nx: number;
  ny: number;
  label: string;
}

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
}) {
  return (
    <div className="absolute inset-0 min-h-0 min-w-0 bg-map-canvas">
      <Canvas
        camera={{ fov: 40, near: 0.1, far: 5000, position: [48, 72, 96] }}
        dpr={[1, 1.5]}
        frameloop={reducedMotion ? "demand" : "always"}
        gl={{ antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.setClearColor(PALETTE.mapCanvas);
          gl.domElement.setAttribute("aria-hidden", "true");
          gl.domElement.tabIndex = -1;
        }}
      >
        <ambientLight intensity={1.45} />
        <directionalLight position={[50, 120, 70]} intensity={1.15} />
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
            />
          )}
        </Suspense>
      </Canvas>
      <p className="pointer-events-none absolute bottom-1 left-2 max-w-[min(72%,24rem)] text-[10px] leading-snug text-foreground/80">
        {kind === "venue-schematic" &&
          "WebGL 3D extrusion of the Floorwise schematic — not to scale, not indoor GPS, not surveyed heights."}
        {kind === "image-plane" &&
          "Official floorplan image on a 3D plane. Pins are image-relative anchors, not extruded buildings."}
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
}: {
  rooms: SchematicRoom[];
  selectedId: string | null;
  recommendedId: string | null;
  focusSheet: SchematicSheetId;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  resetToken: number;
}) {
  const selected = rooms.find((r) => r.id === selectedId);
  const focus = useMemo(() => {
    const points: WorldPoint[] = [];
    for (const sheet of SHEETS) {
      const sheetRooms = rooms.filter((r) => r.sheet === sheet.id);
      const rects = [...sheet.corridors, ...sheetRooms.map((r) => r.rect), ...sheet.zones.map((z) => z.rect)];
      if (rects.length === 0) continue;
      const plate = plateFromRects(sheet.id, rects);
      points.push(plate.center);
      if (sheet.id === focusSheet) {
        points.push({ x: plate.center.x + plate.width * 0.35, y: plate.center.y, z: plate.center.z + plate.depth * 0.35 });
        points.push({ x: plate.center.x - plate.width * 0.35, y: plate.center.y, z: plate.center.z - plate.depth * 0.35 });
      }
    }
    if (selected) points.push(roomWorldCenter(selected, 2.4));
    return points;
  }, [rooms, selected, focusSheet]);

  return (
    <>
      <CameraRig points={focus} resetToken={resetToken} reducedMotion={reducedMotion} />
      {SHEETS.map((sheet) => {
        const sheetRooms = rooms.filter((r) => r.sheet === sheet.id);
        const rects = [...sheet.corridors, ...sheetRooms.map((r) => r.rect), ...sheet.zones.map((z) => z.rect)];
        if (rects.length === 0) return null;
        const plate = plateFromRects(sheet.id, rects);
        return (
          <mesh key={sheet.id} position={[plate.center.x, plate.center.y, plate.center.z]}>
            <boxGeometry args={[plate.width, 0.35, plate.depth]} />
            <meshStandardMaterial
              color={sheet.id === "hyatt" ? PALETTE.peach : PALETTE.secondary}
              transparent={sheetFloorLift(sheet.id) > 0}
              opacity={sheetFloorLift(sheet.id) > 0 ? 0.62 : 1}
              depthWrite={sheetFloorLift(sheet.id) === 0}
            />
            <LabelSprite
              text={sheet.title}
              strong={sheet.id === focusSheet}
              position={[0, 2.2, plate.depth * 0.42]}
            />
          </mesh>
        );
      })}
      {rooms.map((room) => (
        <RoomMesh
          key={room.id}
          room={room}
          selected={room.id === selectedId}
          recommended={room.id === recommendedId}
          showLabel={room.id === selectedId || room.id === recommendedId || room.kind === "entrance"}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function sheetFloorLift(sheet: SchematicSheetId): number {
  return sheet === "salt-l1" ? 0 : 1;
}

function RoomMesh({
  room,
  selected,
  recommended,
  showLabel,
  onSelect,
}: {
  room: SchematicRoom;
  selected: boolean;
  recommended: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
}) {
  const height = room.kind === "entrance" ? 0.9 : room.kind === "hall" ? 1.6 : 2.1;
  const center = roomWorldCenter(room, height / 2);
  const color = selected ? PALETTE.primary : recommended ? PALETTE.highlight : room.placedOnOfficial ? PALETTE.card : PALETTE.maybeWash;
  return (
    <mesh
      position={[center.x, center.y, center.z]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(room.id);
      }}
    >
      <boxGeometry args={[Math.max(0.4, room.rect.w * WORLD_SCALE - 0.35), height, Math.max(0.4, room.rect.h * WORLD_SCALE - 0.35)]} />
      <meshStandardMaterial color={color} />
      {showLabel ? <LabelSprite text={room.labelLines.join(" ")} strong={selected} position={[0, height / 2 + 1.8, 0]} /> : null}
    </mesh>
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
  const selected = pins.find((p) => p.id === selectedId);
  const focus = useMemo<WorldPoint[]>(
    () =>
      selected
        ? [{ x: (selected.nx - 0.5) * width, y: 1.2, z: (selected.ny - 0.5) * depth }]
        : [{ x: 0, y: 0, z: 0 }],
    [selected, width, depth],
  );
  return (
    <>
      <CameraRig points={focus} resetToken={resetToken} reducedMotion={reducedMotion} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {pins.map((pin) => {
        const x = (pin.nx - 0.5) * width;
        const z = (pin.ny - 0.5) * depth;
        const selectedPin = pin.id === selectedId;
        const rec = pin.id === recommendedId;
        return (
          <mesh
            key={pin.id}
            position={[x, selectedPin ? 1.4 : 0.9, z]}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(pin.id);
            }}
          >
            <cylinderGeometry args={[selectedPin ? 1.15 : 0.85, selectedPin ? 1.15 : 0.85, selectedPin ? 2.6 : 1.6, 12]} />
            <meshStandardMaterial color={selectedPin ? PALETTE.primary : rec ? PALETTE.must : PALETTE.cta} />
            {selectedPin ? <LabelSprite text={pin.label} strong position={[0, 2.4, 0]} /> : null}
          </mesh>
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
}: {
  spaces: Space[];
  floor: number;
  selectedId: string | null;
  path?: [number, number][];
  onSelect: (id: string) => void;
  reducedMotion: boolean;
  resetToken: number;
}) {
  const S = WORLD_SCALE;
  const visible = useMemo(() => spaces.filter((s) => s.floor === floor), [spaces, floor]);
  const selected = visible.find((s) => s.id === selectedId);
  const focus = useMemo<WorldPoint[]>(() => {
    if (selected) {
      return [{ x: (selected.x + selected.w / 2) * S, y: 2, z: (selected.y + selected.h / 2) * S }];
    }
    return visible.slice(0, 8).map((s) => ({ x: (s.x + s.w / 2) * S, y: 1, z: (s.y + s.h / 2) * S }));
  }, [selected, visible, S]);
  const { w, h } = venue.viewBox;
  return (
    <>
      <CameraRig points={focus} resetToken={resetToken} reducedMotion={reducedMotion} />
      <mesh position={[(w / 2) * S, -0.2, (h / 2) * S]}>
        <boxGeometry args={[w * S, 0.3, h * S]} />
        <meshStandardMaterial color={PALETTE.secondary} />
      </mesh>
      {visible.map((space) => {
        const height = space.kind === "room" ? 2.2 : space.kind === "hall" ? 1.4 : 0.8;
        const selectedSpace = space.id === selectedId;
        return (
          <mesh
            key={space.id}
            position={[(space.x + space.w / 2) * S, height / 2, (space.y + space.h / 2) * S]}
            onClick={(event) => {
              event.stopPropagation();
              if (space.kind === "room" || space.kind === "hall") onSelect(space.id);
            }}
          >
            <boxGeometry args={[space.w * S, height, space.h * S]} />
            <meshStandardMaterial color={selectedSpace ? PALETTE.primary : PALETTE.card} />
            <LabelSprite text={space.label} strong={selectedSpace} position={[0, height / 2 + 1.6, 0]} />
          </mesh>
        );
      })}
      {path && path.length > 1
        ? path.slice(1).map((point, i) => {
            const prev = path[i]!;
            const a = { x: prev[0] * S, y: 0.5, z: prev[1] * S };
            const b = { x: point[0] * S, y: 0.5, z: point[1] * S };
            return <Segment key={i} a={a} b={b} />;
          })
        : null}
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
  points,
  resetToken,
  reducedMotion,
}: {
  points: WorldPoint[];
  resetToken: number;
  reducedMotion: boolean;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);

  useLayoutEffect(() => {
    if (points.length === 0) return;
    const box = new THREE.Box3();
    for (const point of points) box.expandByPoint(new THREE.Vector3(point.x, point.y, point.z));
    const center = box.getCenter(new THREE.Vector3());
    const span = Math.max(box.getSize(new THREE.Vector3()).length(), 72);
    camera.position.set(center.x + span * 0.32, center.y + span * 0.62, center.z + span * 0.88);
    camera.lookAt(center);
    if (controls.current) {
      controls.current.target.copy(center);
      controls.current.update();
    }
  }, [camera, points, resetToken]);

  return (
    <OrbitControls
      ref={controls as never}
      enableDamping={!reducedMotion}
      dampingFactor={0.08}
      enablePan
      screenSpacePanning
      minDistance={8}
      maxDistance={420}
      maxPolarAngle={Math.PI / 2.08}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      makeDefault
    />
  );
}

function LabelSprite({ text, strong, position }: { text: string; strong: boolean; position: [number, number, number] }) {
  const texture = useMemo(() => makeLabelTexture(text, strong), [text, strong]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  const width = Math.min(18, 4.2 + text.length * 0.72);
  return (
    <sprite position={position} scale={[width, 2.8, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

function makeLabelTexture(text: string, strong: boolean): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = strong ? "rgba(17,62,130,0.96)" : "rgba(255,255,255,0.94)";
  context.beginPath();
  context.roundRect(12, 28, 1000, 104, 52);
  context.fill();
  context.fillStyle = strong ? "#fefefe" : "#0b0f1f";
  context.font = "700 60px Source Sans 3, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text.slice(0, 42), 512, 82);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

