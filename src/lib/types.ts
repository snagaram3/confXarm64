export type Rank = "must" | "maybe" | "meh";
export type Floor = 1 | 2 | 3;
export type AppView = "home" | "map" | "agenda" | "navigate" | "sponsor" | "plan" | "tools";
export type MapSurface = "expo" | "venue" | "sample";
export type VenueLayer = "schematic" | "official";
export type SpaceKind = "hall" | "room" | "entrance" | "vertical" | "lobby";
export type DisplayTimeZone = "America/Denver" | "America/Chicago";

export type SwipeChoice = "love" | "maybe" | "skip";

export interface TasteSwipe {
  sessionId: string;
  choice: SwipeChoice;
}

export interface TasteProfile {
  topicWeights: Record<string, number>;
  levelWeights: Record<string, number>;
  formatWeights: { talks: number; handsOn: number };
  /** 0 = broad overview (Beginner), 1 = deep-dive (Advanced). */
  depth: number;
  /** 0 = talks-first, 1 = hands-on / expo time. */
  expoShare: number;
  /** 0 = relaxed day, 1 = packed day. */
  packed: number;
  swipes: TasteSwipe[];
}

export interface Profile {
  name: string;
  role: string;
  interests: string[];
  goals: string[];
  attendanceDays: string[];
  onboarded: boolean;
  demoPersona: boolean;
  taste: TasteProfile;
}

export interface CrowdTake {
  id: string;
  author: string;
  role: string;
  photo: string;
  take: string;
  minutesAgo: number;
}

export interface SessionSpeaker {
  id: string;
  fullName: string;
  tagLine?: string;
  bio?: string;
  photo?: string | null;
  isTopSpeaker?: boolean;
}

export interface Session {
  id: string;
  dataset?: "main" | "sample";
  title: string;
  speaker: string;
  company: string;
  roomId: string;
  roomLabel?: string;
  building?: string | null;
  level?: number | null;
  floor: number;
  start: string;
  end: string;
  startIso?: string;
  endIso?: string;
  timezone?: string;
  track: string;
  tags: string[];
  abstract: string;
  descriptionHtml?: string;
  sessionUrl?: string;
  speakers?: SessionSpeaker[];
  sessionTypeLabels?: string[];
  /** Official Sessionize “Audience Level” when published: Beginner, Advanced, Any Level. */
  audienceLevel?: string | null;
  crowdTakes: CrowdTake[];
  access?: {
    soldOut: boolean;
    separateRegistration: boolean;
    allAccessColocated: boolean;
    notes: string[];
  };
  isServiceSession?: boolean;
  isPlenum?: boolean;
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
  pinNx?: number;
  pinNy?: number;
  pinMethod?: string;
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

export type QueryMode = "keyword" | "semantic" | "hybrid";
export type RankEngineMode = "keyword-bm25" | "semantic-knn" | "hybrid-bm25-knn";

export interface SearchExplanation {
  engine: "elasticsearch";
  mode: RankEngineMode;
  score: number;
  rank: Rank;
  matchedQueries: string[];
  matchedTags: string[];
  highlights: string[];
  highlightHtml?: string[];
  matchedFields?: string[];
  retriever?: string;
  why: string;
}

export interface Ranked<T> extends SearchExplanation {
  item: T;
}

export interface CloudRankMeta {
  state: "not_configured" | "ok" | "error" | "empty";
  configured: boolean;
  missingEnv: string[];
  projectAlias: string;
  region: string;
  kibanaUrl: string;
  embeddings: {
    inferenceId: string;
    model: string;
    dims: number;
    similarity: "cosine";
    used: boolean;
  };
  rerank: {
    inferenceId: string;
    model: string;
    used: boolean;
  };
  demoIndex: {
    name: string;
    semanticField: string;
    hits: number;
  };
  error: string | null;
}

export interface RankMeta {
  engine: "elasticsearch";
  mode: RankEngineMode;
  tookMs: number;
  retriever?: string;
  queryMode?: QueryMode;
  cloud?: CloudRankMeta;
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
  askSchedule?: {
    available: boolean;
    reason: string;
  };
  elasticCloud?: {
    configured: boolean;
    state: "not_configured" | "ok" | "error" | "empty";
    missingEnv: string[];
    projectAlias: string;
    region: string;
    kibanaUrl: string;
    embeddingsInferenceId: string;
    rerankInferenceId: string;
    demoIndex: string;
    notice: string;
  };
}
