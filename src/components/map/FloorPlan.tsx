import { catalog, venue } from "@/lib/catalog";
import type { Floor, Rank, Space } from "@/lib/types";
import { spacePaint } from "./floor-colors";

interface VisitorDot {
  id: string;
  x: number;
  y: number;
  rank: Rank;
  label: string;
}

interface FloorPlanProps {
  floor: Floor;
  rankByRoom: Record<string, Rank>;
  rankByBooth: Record<string, Rank>;
  selectedRoomId: string | null;
  selectedBoothId: string | null;
  pathPoints?: [number, number][];
  youAreHere?: [number, number];
  visitors?: VisitorDot[];
  showBooths?: boolean;
  onSelectSpace: (id: string) => void;
  onSelectBooth: (id: string) => void;
}

export function FloorPlan({
  floor,
  rankByRoom,
  rankByBooth,
  selectedRoomId,
  selectedBoothId,
  pathPoints,
  youAreHere,
  visitors = [],
  showBooths = true,
  onSelectSpace,
  onSelectBooth,
}: FloorPlanProps) {
  const { w, h } = venue.viewBox;
  const spaces = venue.spaces.filter((s) => s.floor === floor);
  const hallsAndRooms = spaces.filter((s) => s.kind === "hall" || s.kind === "room");
  const other = spaces.filter((s) => s.kind !== "hall" && s.kind !== "room");
  const booths = showBooths ? catalog.booths.filter((b) => b.floor === floor) : [];
  const pathD = pathPoints && pathPoints.length > 1 ? toPath(pathPoints) : null;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-full w-full"
      role="img"
      aria-label={`Salt Palace Level ${floor} map`}
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0d8cc" strokeWidth="0.8" />
        </pattern>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#ddd4c6" strokeWidth="1" />
        </pattern>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="0" y="0" width={w} height={h} fill="#efeae1" />
      <rect x="16" y="16" width={w - 32} height={h - 32} rx="18" fill="#f7f3ec" stroke="#cfc6b8" />
      <rect x="16" y="16" width={w - 32} height={h - 32} rx="18" fill="url(#grid)" opacity="0.7" />

      <text x="40" y="38" fill="#21554c" fontSize="13" fontFamily="IBM Plex Mono, monospace">
        SALT PALACE · LEVEL {floor} · SAMPLE
      </text>
      <text x="40" y="56" fill="#6f6a62" fontSize="11" fontFamily="Source Sans 3, sans-serif">
        90 S West Temple · Halls A–E (N–S) · Halls 1–5 (E–W)
      </text>

      <g transform="translate(980, 48)">
        <circle r="16" fill="#fbf8f3" stroke="#cfc6b8" />
        <polygon points="0,-12 4,-2 -4,-2" fill="#1c1917" />
        <text y="8" textAnchor="middle" fill="#6f6a62" fontSize="9" fontFamily="IBM Plex Mono, monospace">
          N
        </text>
      </g>

      {floor > 1 && (
        <rect x="48" y="48" width="400" height="620" rx="10" fill="url(#hatch)" stroke="#ddd4c6" />
      )}

      {other.map((space) => (
        <SpaceShape
          key={space.id}
          space={space}
          selected={selectedRoomId === space.id}
          onSelect={onSelectSpace}
        />
      ))}

      {hallsAndRooms.map((space) => (
        <SpaceShape
          key={space.id}
          space={space}
          rank={rankByRoom[space.id]}
          selected={selectedRoomId === space.id}
          onSelect={onSelectSpace}
        />
      ))}

      {booths.map((booth) => {
        const paint = spacePaint("hall", rankByBooth[booth.id]);
        const selected = selectedBoothId === booth.id;
        return (
          <g
            key={booth.id}
            role="button"
            tabIndex={0}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelectBooth(booth.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectBooth(booth.id);
              }
            }}
          >
            <rect
              x={booth.x}
              y={booth.y}
              width={booth.w}
              height={booth.h}
              rx="6"
              fill={paint.fill}
              stroke={selected ? "#21554c" : paint.stroke}
              strokeWidth={selected ? 3 : 1.5}
              filter={selected ? "url(#glow)" : undefined}
            />
            <text
              x={booth.x + booth.w / 2}
              y={booth.y + booth.h / 2 + 4}
              textAnchor="middle"
              fill={paint.label}
              fontSize="11"
              fontFamily="Fraunces, serif"
              fontWeight="600"
            >
              {booth.sponsor}
            </text>
          </g>
        );
      })}

      {pathD && (
        <>
          <path d={pathD} className="map-path-ghost" />
          <path d={pathD} className="map-path" />
        </>
      )}

      {visitors.map((v) => (
        <g key={v.id}>
          <circle
            cx={v.x}
            cy={v.y}
            r="9"
            fill={spacePaint("room", v.rank).stroke}
            stroke="#f7f3ec"
            strokeWidth="2"
          />
          <title>{v.label}</title>
        </g>
      ))}

      {youAreHere && (
        <g>
          <circle cx={youAreHere[0]} cy={youAreHere[1]} r="16" fill="rgba(33,85,76,0.16)" />
          <circle
            className="you-are-here"
            cx={youAreHere[0]}
            cy={youAreHere[1]}
            r="9"
            fill="#21554c"
            stroke="#fbf8f3"
            strokeWidth="2"
          />
          <text
            x={youAreHere[0] + 16}
            y={youAreHere[1] - 12}
            fill="#21554c"
            fontSize="11"
            fontFamily="IBM Plex Mono, monospace"
          >
            YOU
          </text>
        </g>
      )}

      {floor === 1 && (
        <>
          <text
            x="1068"
            y="290"
            fill="#21554c"
            fontSize="10"
            fontFamily="IBM Plex Mono, monospace"
            textAnchor="end"
            transform="rotate(90 1068 290)"
          >
            WEST TEMPLE
          </text>
          <text
            x="250"
            y="698"
            fill="#21554c"
            fontSize="10"
            fontFamily="IBM Plex Mono, monospace"
            textAnchor="middle"
          >
            200 SOUTH
          </text>
        </>
      )}
    </svg>
  );
}

function SpaceShape({
  space,
  rank,
  selected,
  onSelect,
}: {
  space: Space;
  rank?: Rank;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const paint = spacePaint(space.kind, rank);
  const interactive = space.kind === "hall" || space.kind === "room";
  const cx = space.x + space.w / 2;
  const cy = space.y + space.h / 2;

  return (
    <g
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? space.label : undefined}
      className={interactive ? "cursor-pointer" : undefined}
      onClick={() => interactive && onSelect(space.id)}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(space.id);
        }
      }}
    >
      <rect
        x={space.x}
        y={space.y}
        width={space.w}
        height={space.h}
        rx={space.kind === "entrance" ? 4 : 10}
        fill={paint.fill}
        stroke={selected ? "#21554c" : paint.stroke}
        strokeWidth={selected ? 3.5 : 1.4}
        filter={selected ? "url(#glow)" : undefined}
        opacity={space.kind === "lobby" ? 0.85 : 1}
      />
      {space.kind === "vertical" && (
        <>
          <line
            x1={space.x + 12}
            y1={space.y + 16}
            x2={space.x + space.w - 12}
            y2={space.y + space.h - 16}
            stroke="#21554c"
            strokeWidth="2"
          />
          <line
            x1={space.x + 12}
            y1={space.y + space.h - 16}
            x2={space.x + space.w - 12}
            y2={space.y + 16}
            stroke="#21554c"
            strokeWidth="2"
          />
        </>
      )}
      <text
        x={cx}
        y={cy + (space.stack ? -4 : 4)}
        textAnchor="middle"
        fill={paint.label}
        fontSize={space.kind === "room" ? 18 : 13}
        fontFamily={space.kind === "room" ? "IBM Plex Mono, monospace" : "Fraunces, serif"}
        fontWeight="600"
      >
        {space.label}
      </text>
      {space.stack && (
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fill="#21554c"
          fontSize="9"
          fontFamily="IBM Plex Mono, monospace"
        >
          {space.stack}
        </text>
      )}
    </g>
  );
}

function toPath(points: [number, number][]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
}
