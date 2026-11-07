import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motionEnabled } from "@/lib/motion";
import {
  PORTALS,
  SCHEMATIC_DISCLAIMER,
  SCHEMATIC_FRAME,
  SHEETS,
  buildSchematic,
  rectCenter,
  sheetById,
  type SchematicRoom,
  type SchematicSheetId,
  type RoomAnchorLite,
} from "@/lib/venue-schematic";
import { PALETTE } from "@/theme/tokens";
import { Locate, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { usePanZoom } from "./use-pan-zoom";

const SCHEMATIC_SIZE = { w: SCHEMATIC_FRAME.w, h: SCHEMATIC_FRAME.h };

export function VenueSchematic({
  sheet,
  onSheet,
  selectedId,
  recommendedId,
  onSelect,
  focusId,
  focusToken,
  motionPref,
  rooms,
  journeyPoints,
  journeyMarker,
}: {
  sheet: SchematicSheetId;
  onSheet: (id: SchematicSheetId) => void;
  selectedId: string | null;
  recommendedId: string | null;
  onSelect: (id: string) => void;
  focusId?: string | null;
  focusToken?: number;
  motionPref: "full" | "reduced";
  rooms: RoomAnchorLite[];
  journeyPoints?: { x: number; y: number }[];
  journeyMarker?: { x: number; y: number } | null;
}) {
  const motion = motionEnabled(motionPref);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const built = useMemo(() => buildSchematic(rooms.length ? rooms : undefined), [rooms]);
  const pan = usePanZoom({
    containerRef,
    imageSize: SCHEMATIC_SIZE,
    motion,
    onTap: (_x, _y, target) => {
      const el = target instanceof Element ? target.closest("[data-pin-id]") : null;
      const id = el?.getAttribute("data-pin-id");
      if (id) onSelect(id);
    },
  });

  const selected = built.rooms.find((r) => r.id === selectedId);

  useEffect(() => {
    pan.fit();
    // Recenter when the selected building/level sheet changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pan identity changes every render
  }, [sheet]);

  useEffect(() => {
    if (!focusId || !focusToken) return;
    const room = built.rooms.find((r) => r.id === focusId);
    if (!room || room.sheet !== sheet) return;
    const c = rectCenter(room.rect);
    pan.focusPin(c.x / SCHEMATIC_FRAME.w, c.y / SCHEMATIC_FRAME.h, 0.42);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pan identity changes every render
  }, [focusToken, focusId, sheet, built.rooms]);

  return (
    <div className="absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden bg-map-canvas">
      <div className="pointer-events-none absolute left-2 top-[3.35rem] z-20 hidden lg:block">
        <div className="pointer-events-auto w-[13.5rem]">
          <StackedOverview
            sheet={sheet}
            rooms={built.rooms}
            selectedId={selectedId}
            onSheet={onSheet}
            motion={motion}
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 min-w-0 flex-1 cursor-grab overflow-hidden touch-none active:cursor-grabbing"
        style={{ ["--map-scale" as string]: "1" }}
        onPointerDown={pan.onPointerDown}
        onPointerMove={pan.onPointerMove}
        onPointerUp={pan.onPointerUp}
        onPointerCancel={pan.onPointerUp}
        role="application"
        aria-label={`${sheetById(sheet).title} illustrative schematic`}
        tabIndex={0}
        onKeyDown={pan.onKeyDown}
      >
        <div ref={pan.layerRef} className="absolute left-0 top-0 origin-top-left will-change-transform">
          <div style={{ width: SCHEMATIC_SIZE.w, height: SCHEMATIC_SIZE.h }}>
            <FloorSheetSvg
              sheet={sheet}
              rooms={built.rooms.filter((r) => r.sheet === sheet)}
              selectedId={selectedId}
              recommendedId={recommendedId}
              onSelect={onSelect}
              onSheet={onSheet}
              interactive
              journeyPoints={journeyPoints}
              journeyMarker={journeyMarker}
            />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-2 z-30 flex flex-col gap-1">
        <Button type="button" size="icon" variant="outline" className="pointer-events-auto size-11 bg-card/95 shadow-sm" onClick={() => pan.zoomBy(1.2)} aria-label="Zoom in">
          <Plus />
        </Button>
        <Button type="button" size="icon" variant="outline" className="pointer-events-auto size-11 bg-card/95 shadow-sm" onClick={() => pan.zoomBy(1 / 1.2)} aria-label="Zoom out">
          <Minus />
        </Button>
        <Button type="button" variant="outline" className="pointer-events-auto h-11 gap-1 bg-card/95 px-3 shadow-sm" onClick={pan.fit} aria-label="Fit schematic to screen">
          <Locate className="size-4" />
          <span className="text-[11px] font-semibold">Fit</span>
        </Button>
      </div>

      {built.unmapped.length > 0 && (
        <details className="absolute bottom-10 left-2 z-20 max-w-[min(90vw,16rem)] rounded-xl border border-border bg-card/95 p-2 text-xs shadow-sm">
          <summary className="cursor-pointer font-semibold">{built.unmapped.length} rooms unmapped</summary>
          <ul className="mt-1 max-h-28 overflow-auto text-muted-foreground">
            {built.unmapped.map((r) => (
              <li key={r.id}>
                {r.roomOrArea ?? r.label}
                {r.reason ? ` — ${r.reason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="pointer-events-none absolute bottom-1 left-2 max-w-[min(72%,24rem)] text-[10px] leading-snug text-foreground/75">
        {SCHEMATIC_DISCLAIMER}
        {selected ? ` · ${selected.roomOrArea}${selected.placedOnOfficial ? " · also on official PDF" : " · schedule label only"}` : ""}
      </p>
    </div>
  );
}

function StackedOverview({
  sheet,
  rooms,
  selectedId,
  onSheet,
  motion,
}: {
  sheet: SchematicSheetId;
  rooms: SchematicRoom[];
  selectedId: string | null;
  onSheet: (id: SchematicSheetId) => void;
  motion: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/95 p-2 shadow-sm">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Multi-level overview · illustrative
      </p>
      <div className={cn("fw-stack mt-1 flex h-[7.5rem] items-end justify-center sm:h-[8.5rem]", !motion && "fw-stack-flat")}>
        {SHEETS.map((info, i) => {
          const active = info.id === sheet;
          return (
            <button
              key={info.id}
              type="button"
              aria-pressed={active}
              aria-label={`${info.title} schematic`}
              onClick={() => onSheet(info.id)}
              className={cn("fw-plate absolute left-1/2 w-[11.5rem] -translate-x-1/2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active && "z-10")}
              style={{ ["--plate" as string]: String(i), zIndex: i + 1 }}
            >
              <MiniPlate sheet={info.id} rooms={rooms.filter((r) => r.sheet === info.id)} selectedId={selectedId} active={active} />
              <span className="sr-only">{info.title}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between gap-1 px-0.5 text-[10px] font-semibold text-muted-foreground">
        {SHEETS.map((info) => (
          <span key={info.id} className={cn("min-w-0 flex-1 truncate text-center", info.id === sheet && "text-primary")}>
            {info.id === "hyatt" ? "Hyatt" : info.id === "salt-l2" ? "SP L2" : "SP L1"}
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniPlate({
  sheet,
  rooms,
  selectedId,
  active,
}: {
  sheet: SchematicSheetId;
  rooms: SchematicRoom[];
  selectedId: string | null;
  active: boolean;
}) {
  const info = sheetById(sheet);
  return (
    <svg viewBox={`0 0 ${SCHEMATIC_FRAME.w} ${SCHEMATIC_FRAME.h}`} className={cn("h-auto w-full rounded-lg border", active ? "border-primary bg-card" : "border-border bg-secondary/80")} aria-hidden>
      <rect x="48" y="72" width="1084" height="500" rx="28" fill={PALETTE.peach} opacity={active ? 1 : 0.72} />
      {info.corridors.map((c, i) => (
        <rect key={i} {...c} rx="8" fill={PALETTE.secondary} />
      ))}
      {rooms.map((room) => (
        <rect
          key={room.id}
          {...room.rect}
          rx="10"
          fill={room.id === selectedId ? PALETTE.highlight : PALETTE.card}
          stroke={room.id === selectedId ? PALETTE.primary : PALETTE.border}
          strokeWidth={room.id === selectedId ? 8 : 2}
        />
      ))}
    </svg>
  );
}

function FloorSheetSvg({
  sheet,
  rooms,
  selectedId,
  recommendedId,
  onSelect,
  onSheet,
  interactive,
  journeyPoints,
  journeyMarker,
}: {
  sheet: SchematicSheetId;
  rooms: SchematicRoom[];
  selectedId: string | null;
  recommendedId: string | null;
  onSelect: (id: string) => void;
  onSheet: (id: SchematicSheetId) => void;
  interactive: boolean;
  journeyPoints?: { x: number; y: number }[];
  journeyMarker?: { x: number; y: number } | null;
}) {
  const info = sheetById(sheet);
  const frame = SCHEMATIC_FRAME;
  const portals = PORTALS.filter((p) => p.sheet === sheet);

  return (
    <svg
      viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
      width={frame.w}
      height={frame.h}
      className="block select-none"
      role="img"
      aria-label={`${info.title}. ${SCHEMATIC_DISCLAIMER}`}
    >
      <rect x={0} y={0} width={frame.w} height={frame.h} fill={PALETTE.mapCanvas} />
      <rect x={36} y={56} width={1108} height={548} rx={28} fill={PALETTE.background} stroke={PALETTE.border} strokeWidth={2} />
      <text x={56} y={44} fill={PALETTE.primary} fontSize={22} fontFamily="Fraunces, serif" fontWeight={650}>
        {info.title}
      </text>
      <text x={56} y={70} fill={PALETTE.mutedForeground} fontSize={13} fontFamily="Source Sans 3, sans-serif">
        {info.subtitle} · not a surveyed floor plate
      </text>

      {info.zones.map((zone) => (
        <g key={zone.label}>
          <rect {...zone.rect} rx={18} fill={PALETTE.peach} fillOpacity={0.45} stroke={PALETTE.primary} strokeWidth={1.5} strokeDasharray="8 7" />
          <text x={zone.rect.x + 14} y={zone.rect.y + 22} fill={PALETTE.primary} fontSize={12} fontWeight={700} fontFamily="Source Sans 3, sans-serif">
            {zone.label.toUpperCase()}
          </text>
        </g>
      ))}

      {info.corridors.map((c, i) => (
        <rect key={i} {...c} rx={8} fill={PALETTE.secondary} />
      ))}

      {rooms.map((room) => (
        <RoomBlock
          key={room.id}
          room={room}
          selected={selectedId === room.id}
          recommended={recommendedId === room.id}
          interactive={interactive}
          onSelect={onSelect}
        />
      ))}

      {journeyPoints && journeyPoints.length > 1 ? (
        <g aria-hidden>
          <polyline
            fill="none"
            stroke={PALETTE.primary}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={journeyPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            opacity={0.85}
          />
          {sheet === "salt-l1" || sheet === "salt-l2" ? (
            <circle cx={journeyPoints[sheet === "salt-l1" ? journeyPoints.length - 1 : 0]!.x} cy={journeyPoints[sheet === "salt-l1" ? journeyPoints.length - 1 : 0]!.y} r={14} fill={PALETTE.cta} />
          ) : null}
          {journeyMarker ? <circle cx={journeyMarker.x} cy={journeyMarker.y} r={10} fill={PALETTE.highlight} stroke={PALETTE.primary} strokeWidth={2} /> : null}
        </g>
      ) : null}

      {portals.map((portal) => {
        const w = 132;
        const h = 34;
        const x = portal.point.x - w / 2;
        const y = portal.point.y - h / 2;
        const arrow = portal.direction === "east" ? "→" : "←";
        return (
          <g
            key={`${portal.sheet}-${portal.toSheet}`}
            role="button"
            tabIndex={0}
            aria-label={`Open ${sheetById(portal.toSheet).title}. Schematic link only, not a surveyed walk.`}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSheet(portal.toSheet);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSheet(portal.toSheet);
              }
            }}
            data-portal={portal.toSheet}
          >
            <title>Schematic link — not a surveyed path or distance</title>
            <rect x={x} y={y} width={w} height={h} rx={17} fill={PALETTE.primary} />
            <text x={portal.point.x} y={portal.point.y + 5} textAnchor="middle" fill={PALETTE.primaryForeground} fontSize={13} fontWeight={700} fontFamily="Source Sans 3, sans-serif">
              {portal.direction === "east" ? `${portal.label} ${arrow}` : `${arrow} ${portal.label}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RoomBlock({
  room,
  selected,
  recommended,
  interactive,
  onSelect,
}: {
  room: SchematicRoom;
  selected: boolean;
  recommended: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
}) {
  const c = rectCenter(room.rect);
  const fill = selected ? PALETTE.peach : room.kind === "showcase" ? "#fffdf8" : PALETTE.card;
  const stroke = selected ? PALETTE.primary : recommended ? PALETTE.must : PALETTE.border;
  const dash = room.placedOnOfficial ? undefined : "7 5";
  const lineHeight = 15;
  const first = c.y - ((room.labelLines.length - 1) * lineHeight) / 2 + 4;

  return (
    <g
      data-pin-id={room.id}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      aria-label={`${room.roomOrArea}${room.placedOnOfficial ? "" : ", schedule label only"}${selected ? ", selected" : ""}`}
      className={interactive ? "cursor-pointer" : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive) onSelect(room.id);
      }}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(room.id);
        }
      }}
    >
      <rect
        x={room.rect.x}
        y={room.rect.y}
        width={room.rect.w}
        height={room.rect.h}
        rx={12}
        fill={fill}
        stroke={stroke}
        strokeWidth={selected ? 3.5 : recommended ? 2.5 : 1.4}
        strokeDasharray={dash}
      />
      {room.labelLines.map((line, i) => (
        <text
          key={line}
          x={c.x}
          y={first + i * lineHeight}
          textAnchor="middle"
          fill={PALETTE.foreground}
          fontSize={room.kind === "room" ? 14 : 12}
          fontWeight={selected ? 700 : 600}
          fontFamily="Source Sans 3, sans-serif"
        >
          {line}
        </text>
      ))}
      {!room.placedOnOfficial && (
        <text x={room.rect.x + 8} y={room.rect.y + room.rect.h - 8} fill={PALETTE.maybe} fontSize={9} fontWeight={700} fontFamily="IBM Plex Mono, monospace">
          LABEL
        </text>
      )}
    </g>
  );
}

