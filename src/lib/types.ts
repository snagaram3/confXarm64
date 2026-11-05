export type Rank = "must" | "maybe" | "meh";
export type Floor = 1 | 2 | 3;
export type AppView = "map" | "agenda" | "navigate" | "sponsor";
export type SpaceKind = "hall" | "room" | "entrance" | "vertical" | "lobby";

export interface Profile {
  name: string;
  role: string;
  interests: string[];
}

export interface CrowdTake {
  id: string;
  author: string;
  role: string;
  photo: string;
  take: string;
  minutesAgo: number;
}

export interface Session {
  id: string;
  title: string;
  speaker: string;
  company: string;
  roomId: string;
  floor: Floor;
  start: string;
  end: string;
  track: string;
  tags: string[];
  abstract: string;
  crowdTakes: CrowdTake[];
}

export interface Visitor {
  id: string;
  name: string;
  role: string;
  company: string;
  interests: string[];
  photo: string;
  metersAway: number;
}

export interface Booth {
  id: string;
  sponsor: string;
  tagline: string;
  floor: Floor;
  boothNumber: string;
  locationLabel: string;
  pinAvailable: boolean;
  exhibitorSource: string;
  logo: string | null;
  logoSource: string | null;
  logoOnDark?: boolean;
  tags: string[];
  pitch: string;
  visitors: Visitor[];
}

export interface Space {
  id: string;
  label: string;
  floor: Floor;
  kind: SpaceKind;
  x: number;
  y: number;
  w: number;
  h: number;
  stack?: string;
}

export interface WayfindingStep {
  id: string;
  floor: Floor;
  title: string;
  detail: string;
  altitudeHint?: string;
  durationSec: number;
  youAreHere: [number, number];
}

export interface WayfindingRoute {
  id: string;
  destinationRoomId: string;
  title: string;
  from: string;
  floorsInvolved: Floor[];
  polylineByFloor: Record<string, [number, number][]>;
  steps: WayfindingStep[];
}

export interface SearchExplanation {
  engine: "elasticsearch";
  mode: "hybrid-bm25-knn";
  score: number;
  rank: Rank;
  matchedQueries: string[];
  matchedTags: string[];
  highlights: string[];
  why: string;
}

export interface Ranked<T> extends SearchExplanation {
  item: T;
}

export interface RankMeta {
  engine: "elasticsearch";
  mode: "hybrid-bm25-knn";
  tookMs: number;
}

export interface Catalog {
  interests: string[];
  roles: string[];
  sessions: Session[];
  booths: Booth[];
}

export interface Venue {
  name: string;
  address: string;
  viewBox: { w: number; h: number };
  floors: { id: Floor; name: string; short: string }[];
  spaces: Space[];
}

export interface EsHealth {
  ok: boolean;
  error?: string;
  elasticsearch?: {
    status: string;
    cluster: string;
    version: string;
  };
  otel?: {
    enabled: boolean;
    exporter: string;
    endpoint: string | null;
    serviceName: string;
  };
}
