import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchHealth,
  fetchRank,
  fetchReminderJobs,
  fetchReminderStatus,
  fetchScheduleBootstrap,
  fetchSessionDetail,
  fetchVisitors,
  postReminderCancel,
  postReminderSchedule,
  postReminderSubscribe,
} from "@/lib/api";
import {
  FEATURED_BOOTH_ID,
  LATE_SESSION_ID,
  catalog,
  sampleSessionById,
  sessionsInRoom,
  wayfinding,
} from "@/lib/catalog";
import { parseAsk, type ConferenceDayId } from "@/lib/ask";
import { CONFERENCE_TZ, type DisplayTimeZone } from "@/lib/timezone";
import { sheetForFocus, type SchematicSheetId } from "@/lib/venue-schematic";
import {
  MAP_PROJECTION_KEY,
  bootstrapMapState,
  detectWebGL,
  initialMapProjection,
  mapSharePath,
  parseMapQuery,
  readStoredProjection,
  resolveMapProjection,
  serializeMapSearch,
  type MapProjection,
} from "@/lib/map-query";
import {
  CONTRAST_KEY,
  TEXT_SIZE_KEY,
  applyA11yPrefs,
  readContrastPref,
  readTextSizePref,
  type ContrastPref,
  type TextSizePref,
} from "@/lib/a11y-prefs";
import { MOTION_KEY, motionEnabled, readMotionPref, type MotionPref } from "@/lib/motion";
import { composeRankQuery, readPlannerProfile, writePlannerProfile } from "@/lib/planner-profile";
import { DEFAULT_PROFILE, rankWeight } from "@/lib/ranking";
import { prefStorageKey, readAttendeeSponsorPrefs } from "@/lib/sponsor-prefs";
import { parseToolsPath } from "@/lib/tools";
import type {
  AppView,
  Booth,
  EsHealth,
  Floor,
  MapSurface,
  Profile,
  QueryMode,
  VenueLayer,
  Rank,
  RankMeta,
  Ranked,
  Session,
  Visitor,
} from "@/lib/types";

export type Selection =
  | { kind: "session"; id: string }
  | { kind: "booth"; id: string }
  | { kind: "space"; id: string }
  | null;

export type RankStatus = "loading" | "ready" | "error";

interface AppStateValue {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchMode: QueryMode;
  setSearchMode: (mode: QueryMode) => void;
  trackFilter: string | "all";
  setTrackFilter: (track: string | "all") => void;
  rankedSessions: Ranked<Session>[];
  rankedBooths: Ranked<Booth>[];
  rankedVisitors: Ranked<Visitor>[];
  rankByRoom: Record<string, Rank>;
  rankByBooth: Record<string, Rank>;
  rankedSessionById: Record<string, Ranked<Session>>;
  rankStatus: RankStatus;
  rankError: string | null;
  rankMeta: RankMeta | null;
  esHealth: EsHealth | null;
  view: AppView;
  setView: (view: AppView) => void;
  floor: Floor;
  setFloor: (floor: Floor) => void;
  selection: Selection;
  selectSession: (id: string, opts?: { jump?: boolean }) => void;
  selectBooth: (id: string, opts?: { jump?: boolean }) => void;
  openExpoBooth: (id: string) => void;
  selectSpace: (id: string) => void;
  clearSelection: () => void;
  navigating: boolean;
  stepIndex: number;
  startNavTo255: (opts?: { stayOnMap?: boolean }) => void;
  stopNav: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  sponsorBoothId: string;
  setSponsorBoothId: (id: string) => void;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  retryRank: () => void;
  savedIds: string[];
  toggleSaved: (sessionId: string) => void;
  sponsorPrefs: Record<string, Rank>;
  setSponsorPref: (boothId: string, pref: Rank | undefined) => void;
  officialSessions: Session[];
  scheduleNote: string;
  featured: {
    label: string;
    disclaimer: string;
    picks: Array<{
      sessionId: string;
      title: string;
      start: string;
      end: string;
      roomLabel: string;
      why: string;
      speakers: Array<{ fullName: string; tagLine?: string; photo?: string | null }>;
    }>;
  } | null;
  roomAnchors: Array<{
    id: string;
    label: string;
    building: string | null;
    level: number | null;
    placed: boolean;
    nx?: number;
    ny?: number;
    reason?: string;
    roomOrArea?: string;
  }>;
  mapSurface: MapSurface;
  setMapSurface: (surface: MapSurface) => void;
  venueLayer: VenueLayer;
  setVenueLayer: (layer: VenueLayer) => void;
  schematicSheet: SchematicSheetId;
  setSchematicSheet: (sheet: SchematicSheetId) => void;
  mapProjection: MapProjection;
  setMapProjection: (projection: MapProjection) => void;
  map3dNotice: string | null;
  mapCameraReset: number;
  resetMapCamera: () => void;
  stepFree: boolean;
  setStepFree: (value: boolean) => void;
  dayFilter: ConferenceDayId | "all";
  setDayFilter: (day: ConferenceDayId | "all") => void;
  includeEnded: boolean;
  setIncludeEnded: (value: boolean) => void;
  askUnderstood: string[];
  applyAsk: (raw: string) => void;
  pickId: string | null;
  setPickId: (id: string | null) => void;
  timeZone: DisplayTimeZone;
  setTimeZone: (tz: DisplayTimeZone) => void;
  bufferMinutes: number;
  setBufferMinutes: (n: number) => void;
  plannerIso: string;
  setPlannerIso: (iso: string) => void;
  reminderMinutes: 5 | 10 | 15;
  setReminderMinutes: (n: 5 | 10 | 15) => void;
  reminderJobs: Array<{ sessionId: string; status: string; minutesBefore: number; fireAt: number }>;
  pushStatus: {
    webPushConfigured: boolean;
    publicKey: string | null;
    backgroundDelivery: boolean;
    foregroundOnly: boolean;
    notice: string;
  } | null;
  enablePush: () => Promise<void>;
  scheduleReminder: (sessionId: string) => Promise<void>;
  cancelReminder: (sessionId: string) => Promise<void>;
  resolveSession: (id: string) => Session | undefined;
  motionPref: MotionPref;
  setMotionPref: (pref: MotionPref) => void;
  contrastPref: ContrastPref;
  setContrastPref: (pref: ContrastPref) => void;
  textSizePref: TextSizePref;
  setTextSizePref: (pref: TextSizePref) => void;
  mapFocus: { id: string; token: number } | null;
  requestMapFocus: (id: string) => void;
}

const SAVED_KEY = "floorwise.savedSessions";
const TZ_KEY = "floorwise.displayTz";
const BUF_KEY = "floorwise.bufferMinutes";
const ATTENDEE_KEY = "floorwise.attendeeId";
const REMIND_KEY = "floorwise.reminderMinutes";

function attendeeId(): string {
  try {
    const existing = localStorage.getItem(ATTENDEE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(ATTENDEE_KEY, id);
    return id;
  } catch {
    return "local-attendee";
  }
}

function savedStorageKey(id: string): string {
  return `${SAVED_KEY}.${id}`;
}

function parseSavedList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function readSaved(): string[] {
  try {
    const id = attendeeId();
    const scoped = parseSavedList(localStorage.getItem(savedStorageKey(id)));
    if (scoped.length) return scoped;
    const legacy = parseSavedList(localStorage.getItem(SAVED_KEY));
    if (legacy.length) localStorage.setItem(savedStorageKey(id), JSON.stringify(legacy));
    return legacy;
  } catch {
    return [];
  }
}

function readSponsorPrefs(): Record<string, Rank> {
  try {
    return readAttendeeSponsorPrefs(localStorage, attendeeId());
  } catch {
    return {};
  }
}

const AppStateContext = createContext<AppStateValue | null>(null);

function readMapBootstrap() {
  if (typeof window === "undefined" || parseToolsPath(window.location.pathname)) {
    return bootstrapMapState("", "/");
  }
  return bootstrapMapState(window.location.search, window.location.pathname);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const boot = useMemo(() => readMapBootstrap(), []);
  const mapQueryActive = useRef(boot.shareActive);
  const [profile, setProfileState] = useState<Profile>(() => {
    try {
      return readPlannerProfile(attendeeId());
    } catch {
      return DEFAULT_PROFILE;
    }
  });
  const setProfile = useCallback((next: Profile) => {
    setProfileState(next);
    writePlannerProfile(attendeeId(), next);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<QueryMode>("hybrid");
  const [trackFilter, setTrackFilter] = useState<string | "all">("all");
  const [retryTick, setRetryTick] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>(readSaved);
  const [sponsorPrefs, setSponsorPrefs] = useState<Record<string, Rank>>(readSponsorPrefs);
  const [view, setViewState] = useState<AppView>(() => {
    if (parseToolsPath(window.location.pathname)) return "tools";
    if (boot.openMap) return "map";
    return "home";
  });
  const setView = useCallback((next: AppView) => {
    setViewState(next);
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const query = parseMapQuery(window.location.search, path);
    if (next === "tools") return;
    if (next === "map") {
      if (path !== "/map" && !query.mapPath && !query.projection && !query.origin && !query.destination) {
        window.history.pushState({}, "", "/map");
      }
      return;
    }
    if (path === "/map" || path.startsWith("/tools")) {
      window.history.pushState({}, "", "/");
    }
  }, []);
  const [floor, setFloor] = useState<Floor>(1);
  const [selection, setSelection] = useState<Selection>(() =>
    boot.focusId ? { kind: "space", id: boot.focusId } : null,
  );
  const [navigating, setNavigating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [sponsorBoothId, setSponsorBoothId] = useState(FEATURED_BOOTH_ID);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rankedSessions, setRankedSessions] = useState<Ranked<Session>[]>([]);
  const [rankedBooths, setRankedBooths] = useState<Ranked<Booth>[]>([]);
  const [rankedVisitors, setRankedVisitors] = useState<Ranked<Visitor>[]>([]);
  const [rankStatus, setRankStatus] = useState<RankStatus>("loading");
  const [rankError, setRankError] = useState<string | null>(null);
  const [rankMeta, setRankMeta] = useState<RankMeta | null>(null);
  const [esHealth, setEsHealth] = useState<EsHealth | null>(null);
  const [officialSessions, setOfficialSessions] = useState<Session[]>([]);
  const [scheduleNote, setScheduleNote] = useState("");
  const [featured, setFeatured] = useState<AppStateValue["featured"]>(null);
  const [roomAnchors, setRoomAnchors] = useState<AppStateValue["roomAnchors"]>([]);
  const [mapSurface, setMapSurface] = useState<MapSurface>(boot.surface ?? "venue");
  const [venueLayer, setVenueLayer] = useState<VenueLayer>("schematic");
  const [schematicSheet, setSchematicSheet] = useState<SchematicSheetId>(boot.sheet ?? "salt-l1");
  const [preferredProjection, setPreferredProjection] = useState<MapProjection>(
    boot.projectionRequested === "flat" ? "flat" : "3d",
  );
  const [mapProjection, setMapProjectionState] = useState<MapProjection>(
    boot.projectionRequested === "flat" ? "flat" : "3d",
  );
  const [map3dNotice, setMap3dNotice] = useState<string | null>(() =>
    boot.projectionRequested === "3d" && !motionEnabled(readMotionPref())
      ? "Reduced motion is on, so the flat map is open. You can switch to 3D. Selection stays the same."
      : null,
  );
  const [mapCameraReset, setMapCameraReset] = useState(0);
  const [mapOriginId] = useState<string | null>(boot.originId ?? null);
  const [mapDestinationId, setMapDestinationId] = useState<string | null>(boot.destinationId ?? boot.focusId ?? null);
  const [stepFree, setStepFree] = useState(boot.stepFree ?? false);
  const [dayFilter, setDayFilter] = useState<ConferenceDayId | "all">("all");
  const [includeEnded, setIncludeEnded] = useState(false);
  const [askUnderstood, setAskUnderstood] = useState<string[]>([]);
  const [pickId, setPickId] = useState<string | null>(null);
  const [timeZone, setTimeZoneState] = useState<DisplayTimeZone>(() => {
    try {
      const raw = localStorage.getItem(TZ_KEY);
      return raw === "America/Chicago" ? raw : CONFERENCE_TZ;
    } catch {
      return CONFERENCE_TZ;
    }
  });
  const [bufferMinutes, setBufferMinutesState] = useState(() => {
    try {
      const raw = localStorage.getItem(BUF_KEY);
      if (raw == null || raw === "") return 10;
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : 10;
    } catch {
      return 10;
    }
  });
  const [plannerIso, setPlannerIso] = useState("live");
  const [reminderMinutes, setReminderMinutesState] = useState<5 | 10 | 15>(() => {
    try {
      const n = Number(localStorage.getItem(REMIND_KEY));
      return n === 5 || n === 15 ? n : 10;
    } catch {
      return 10;
    }
  });
  const [reminderJobs, setReminderJobs] = useState<AppStateValue["reminderJobs"]>([]);
  const [pushStatus, setPushStatus] = useState<AppStateValue["pushStatus"]>(null);
  const [sessionIndex, setSessionIndex] = useState<Record<string, Session>>({});
  const foregroundTimers = useRef<Map<string, number>>(new Map());
  const [motionPref, setMotionPrefState] = useState<MotionPref>(readMotionPref);
  const [contrastPref, setContrastPrefState] = useState<ContrastPref>(readContrastPref);
  const [textSizePref, setTextSizePrefState] = useState<TextSizePref>(readTextSizePref);
  const [mapFocus, setMapFocus] = useState<{ id: string; token: number } | null>(null);

  useEffect(() => {
    document.documentElement.dataset.motion = motionEnabled(motionPref) ? "full" : "reduced";
    applyA11yPrefs(document.documentElement, { contrast: contrastPref, textSize: textSizePref });
  }, [motionPref, contrastPref, textSizePref]);

  const setMotionPref = useCallback((pref: MotionPref) => {
    setMotionPrefState(pref);
    try {
      localStorage.setItem(MOTION_KEY, pref);
    } catch {
      /* ignore */
    }
  }, []);

  const setContrastPref = useCallback((pref: ContrastPref) => {
    setContrastPrefState(pref);
    try {
      localStorage.setItem(CONTRAST_KEY, pref);
    } catch {
      /* ignore */
    }
  }, []);

  const setTextSizePref = useCallback((pref: TextSizePref) => {
    setTextSizePrefState(pref);
    try {
      localStorage.setItem(TEXT_SIZE_KEY, pref);
    } catch {
      /* ignore */
    }
  }, []);

  const requestMapFocus = useCallback((id: string) => {
    setMapFocus({ id, token: Date.now() });
  }, []);

  const setMapProjection = useCallback((requested: MapProjection) => {
    const gl = detectWebGL();
    const resolved = resolveMapProjection(requested, gl);
    setPreferredProjection(requested);
    setMapProjectionState(resolved.projection);
    try {
      localStorage.setItem(MAP_PROJECTION_KEY, requested);
    } catch {
      /* ignore */
    }
    if (resolved.error) {
      setMap3dNotice(resolved.error);
      return;
    }
    mapQueryActive.current = true;
    const reduced = !motionEnabled(motionPref);
    setMap3dNotice(
      requested === "3d" && reduced
        ? "Reduced motion is on, so 3D orbit has no easing. Selection is unchanged."
        : null,
    );
  }, [motionPref]);

  const resetMapCamera = useCallback(() => {
    setMapCameraReset((n) => n + 1);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      const tab = parseToolsPath(path);
      if (tab) {
        setViewState("tools");
        return;
      }
      const next = bootstrapMapState(window.location.search, path);
      setViewState(next.openMap ? "map" : "home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (parseToolsPath(window.location.pathname)) return;
    const reduced = !motionEnabled(readMotionPref());
    const gl = detectWebGL();
    const initial = initialMapProjection({
      requested: boot.projectionRequested,
      reducedMotion: reduced,
      webgl: gl,
      stored: readStoredProjection(),
    });
    setPreferredProjection(boot.projectionRequested ?? initial.projection);
    setMapProjectionState(initial.projection);
    setMap3dNotice(initial.notice);
    if (boot.openMap) setView("map");
    if (boot.focusId) requestMapFocus(boot.focusId);
    // Projection and origin apply once from the share URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot is stable
  }, []);

  useEffect(() => {
    if (!boot.focusId) return;
    const sheet = boot.sheet ?? sheetForFocus(boot.focusId, roomAnchors.length ? roomAnchors : undefined);
    if (sheet) setSchematicSheet(sheet);
  }, [boot.focusId, boot.sheet, roomAnchors]);

  useEffect(() => {
    const ac = new AbortController();
    fetchScheduleBootstrap(ac.signal)
      .then((data) => {
        setOfficialSessions(data.sessions);
        setScheduleNote(data.meta.note);
        setFeatured(data.featured);
        setRoomAnchors(data.roomAnchors.rooms);
        const map: Record<string, Session> = {};
        for (const s of data.sessions) map[s.id] = s;
        setSessionIndex(map);
        /* keep an empty selection on planner home */
      })
      .catch(() => undefined);
    fetchReminderStatus()
      .then(setPushStatus)
      .catch(() => undefined);
    fetchReminderJobs(attendeeId())
      .then((d) => setReminderJobs(d.jobs))
      .catch(() => undefined);
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      setRankStatus((prev) => (prev === "ready" ? prev : "loading"));
      fetchRank(profile, composeRankQuery(profile, searchQuery), ac.signal, {
        mode: searchMode,
        track: trackFilter,
      })
        .then((res) => {
          setRankedSessions(res.sessions);
          setRankedBooths(res.booths);
          setRankMeta(res.meta);
          setRankStatus("ready");
          setRankError(null);
        })
        .catch((err: unknown) => {
          if (ac.signal.aborted) return;
          setRankStatus("error");
          setRankError(err instanceof Error ? err.message : String(err));
        });
    }, 160);
    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [profile, searchQuery, searchMode, trackFilter, retryTick]);

  useEffect(() => {
    if (rankStatus !== "error") return;
    const id = window.setInterval(() => setRetryTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, [rankStatus]);

  const retryRank = useCallback(() => {
    setRankStatus("loading");
    setRetryTick((n) => n + 1);
  }, []);

  const toggleSaved = useCallback((sessionId: string) => {
    setSavedIds((prev) => {
      const removing = prev.includes(sessionId);
      const next = removing ? prev.filter((id) => id !== sessionId) : [...prev, sessionId];
      try {
        localStorage.setItem(savedStorageKey(attendeeId()), JSON.stringify(next));
      } catch {
        /* private mode */
      }
      if (removing) {
        const timer = foregroundTimers.current.get(sessionId);
        if (timer) window.clearTimeout(timer);
        foregroundTimers.current.delete(sessionId);
        void postReminderCancel(attendeeId(), sessionId)
          .then(() => fetchReminderJobs(attendeeId()))
          .then((d) => setReminderJobs(d.jobs))
          .catch(() => undefined);
      }
      return next;
    });
  }, []);

  const setSponsorPref = useCallback((boothId: string, pref: Rank | undefined) => {
    setSponsorPrefs((prev) => {
      const next = { ...prev };
      if (!pref) delete next[boothId];
      else next[boothId] = pref;
      try {
        localStorage.setItem(prefStorageKey(attendeeId()), JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    setRankedVisitors([]);
    fetchVisitors(sponsorBoothId, ac.signal)
      .then((res) => setRankedVisitors(res.visitors))
      .catch(() => setRankedVisitors([]));
    return () => ac.abort();
  }, [sponsorBoothId]);

  useEffect(() => {
    const ac = new AbortController();
    fetchHealth(ac.signal)
      .then(setEsHealth)
      .catch((err: unknown) =>
        setEsHealth({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    const id = window.setInterval(() => {
      fetchHealth(ac.signal).then(setEsHealth).catch(() => undefined);
    }, 15000);
    return () => {
      ac.abort();
      window.clearInterval(id);
    };
  }, []);

  const rankedSessionById = useMemo(() => {
    const map: Record<string, Ranked<Session>> = {};
    for (const row of rankedSessions) map[row.item.id] = row;
    return map;
  }, [rankedSessions]);

  const rankByRoom = useMemo(() => {
    const map: Record<string, Rank> = {};
    for (const row of rankedSessions) {
      const roomId = row.item.roomId;
      const prev = map[roomId];
      if (!prev || rankWeight(row.rank) > rankWeight(prev)) {
        map[roomId] = row.rank;
      }
    }
    return map;
  }, [rankedSessions]);

  const rankByBooth = useMemo(() => {
    const map: Record<string, Rank> = {};
    for (const row of rankedBooths) map[row.item.id] = row.rank;
    return map;
  }, [rankedBooths]);

  const resolveSession = useCallback(
    (id: string) => sessionIndex[id] ?? sampleSessionById(id),
    [sessionIndex],
  );

  useEffect(() => {
    if (view !== "map") return;
    const share = mapSharePath(window.location.pathname);
    if (!share && !mapQueryActive.current) return;
    if (!mapQueryActive.current) return;
    const session = selection?.kind === "session" ? resolveSession(selection.id) : null;
    const selectedId = selectedRoomId(selection, session);
    const originId = mapOriginId ?? selectedId;
    const destinationId =
      selectedId && originId && selectedId !== originId ? selectedId : mapDestinationId;
    const next = `/map${serializeMapSearch({
      projection: mapProjection === "3d" || preferredProjection === "3d" ? "3d" : "flat",
      surface: mapSurface,
      originId,
      destinationId,
      stepFree,
    })}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== next) window.history.replaceState(window.history.state, "", next);
  }, [view, mapProjection, preferredProjection, mapSurface, stepFree, selection, mapOriginId, mapDestinationId, resolveSession]);

  const setTimeZone = useCallback((tz: DisplayTimeZone) => {
    setTimeZoneState(tz);
    localStorage.setItem(TZ_KEY, tz);
  }, []);

  const setBufferMinutes = useCallback((n: number) => {
    setBufferMinutesState(n);
    localStorage.setItem(BUF_KEY, String(n));
  }, []);

  const setReminderMinutes = useCallback((n: 5 | 10 | 15) => {
    setReminderMinutesState(n);
    localStorage.setItem(REMIND_KEY, String(n));
  }, []);

  const enablePush = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
    const status = await fetchReminderStatus();
    setPushStatus(status);
    if (!status.publicKey) return;
    const reg = await navigator.serviceWorker.register("/push-sw.js");
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(status.publicKey),
    });
    await postReminderSubscribe(attendeeId(), sub);
  }, []);

  const scheduleReminder = useCallback(
    async (sessionId: string) => {
      const session = resolveSession(sessionId);
      if (session && !savedIds.includes(sessionId)) toggleSaved(sessionId);
      const existing = foregroundTimers.current.get(sessionId);
      if (existing) window.clearTimeout(existing);
      if ("Notification" in window && Notification.permission === "granted") {
        const when = session?.startIso
          ? new Date(session.startIso).getTime() - reminderMinutes * 60_000
          : 0;
        if (when > Date.now() && when - Date.now() < 2_147_000_000) {
          const timer = window.setTimeout(() => {
            new Notification("Floorwise reminder", { body: session?.title ?? "Upcoming session" });
            foregroundTimers.current.delete(sessionId);
          }, Math.max(0, when - Date.now()));
          foregroundTimers.current.set(sessionId, timer);
        }
      }
      try {
        await postReminderSchedule(attendeeId(), sessionId, reminderMinutes);
        const jobs = await fetchReminderJobs(attendeeId());
        setReminderJobs(jobs.jobs);
      } catch {
        /* foreground timer still set when Web Push is off */
      }
    },
    [resolveSession, savedIds, toggleSaved, reminderMinutes],
  );

  const cancelReminder = useCallback(async (sessionId: string) => {
    const existing = foregroundTimers.current.get(sessionId);
    if (existing) window.clearTimeout(existing);
    foregroundTimers.current.delete(sessionId);
    await postReminderCancel(attendeeId(), sessionId);
    const jobs = await fetchReminderJobs(attendeeId());
    setReminderJobs(jobs.jobs);
  }, []);

  const selectSession = useCallback(
    (id: string, opts?: { jump?: boolean }) => {
      const session = sessionIndex[id] ?? sampleSessionById(id);
      if (!session) return;
      setSelection({ kind: "session", id });
      const nextSheet = sheetForFocus(session.roomId, roomAnchors.length ? roomAnchors : undefined);
      if (nextSheet) setSchematicSheet(nextSheet);
      void fetchSessionDetail(id)
        .then((d) => {
          setSessionIndex((prev) => ({ ...prev, [id]: { ...prev[id], ...d.session } }));
        })
        .catch(() => undefined);
      if (session.roomId && mapOriginId && session.roomId !== mapOriginId) {
        setMapDestinationId(session.roomId);
      }
      if (opts?.jump !== false) {
        if (session.dataset === "sample") {
          setMapSurface("sample");
          setFloor(session.floor as Floor);
        } else if (session.track === "Solutions Showcase" || session.roomLabel?.includes("Solutions Showcase")) {
          setMapSurface("expo");
        } else {
          setMapSurface("venue");
          setVenueLayer("schematic");
          requestMapFocus(session.roomId);
        }
        setView("map");
      }
    },
    [sessionIndex, requestMapFocus, roomAnchors, mapOriginId],
  );

  const applyAsk = useCallback((raw: string) => {
    const parsed = parseAsk(raw);
    setSearchQuery(parsed.q || raw.trim());
    setAskUnderstood(parsed.understood);
    setPickId(null);
    if (parsed.day) setDayFilter(parsed.day);
    if (parsed.includeEnded != null) setIncludeEnded(parsed.includeEnded);
    if (parsed.stepFree != null) setStepFree(parsed.stepFree);
    if (parsed.surface) {
      setMapSurface(parsed.surface);
      if (parsed.surface === "venue") setVenueLayer("schematic");
    }
    if (parsed.sheet) setSchematicSheet(parsed.sheet);
    setView("agenda");
  }, []);

  const selectBooth = useCallback((id: string, opts?: { jump?: boolean }) => {
    const booth = catalog.booths.find((b) => b.id === id);
    if (!booth) return;
    setSelection({ kind: "booth", id });
    setSponsorBoothId(id);
    if (opts?.jump !== false) {
      setView("sponsor");
      setMapSurface("expo");
      setFloor(booth.floor);
      requestMapFocus(id);
    } else {
      setMapSurface("expo");
    }
  }, [requestMapFocus]);

  const openExpoBooth = useCallback((id: string) => {
    const booth = catalog.booths.find((b) => b.id === id);
    if (!booth) return;
    setSelection({ kind: "booth", id });
    setSponsorBoothId(id);
    setMapSurface("expo");
    setFloor(booth.floor);
    setView("map");
    if (booth.pinAvailable) requestMapFocus(id);
  }, [requestMapFocus, setView]);

  const selectSpace = useCallback(
    (id: string) => {
      const official = officialSessions.find((s) => s.roomId === id);
      if (official) {
        selectSession(official.id, { jump: false });
        return;
      }
      const inRoom = sessionsInRoom(id);
      if (inRoom[0]) {
        selectSession(inRoom[0].id);
        return;
      }
      setSelection({ kind: "space", id });
      if (mapOriginId && id !== mapOriginId) setMapDestinationId(id);
      const nextSheet = sheetForFocus(id, roomAnchors.length ? roomAnchors : undefined);
      if (nextSheet) setSchematicSheet(nextSheet);
    },
    [selectSession, officialSessions, roomAnchors, mapOriginId],
  );

  const clearSelection = useCallback(() => setSelection(null), []);

  const goToStep = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(wayfinding.steps.length - 1, index));
    setStepIndex(clamped);
    setFloor(wayfinding.steps[clamped].floor);
  }, []);

  const startNavTo255 = useCallback((opts?: { stayOnMap?: boolean }) => {
    setNavigating(true);
    setView(opts?.stayOnMap ? "map" : "navigate");
    setMapSurface("sample");
    setStepIndex(0);
    setFloor(1);
    setSelection({ kind: "session", id: LATE_SESSION_ID });
    const gl = detectWebGL();
    if (gl && motionEnabled(readMotionPref())) {
      setPreferredProjection("3d");
      setMapProjectionState("3d");
    }
  }, []);

  const stopNav = useCallback(() => {
    setNavigating(false);
    setView("map");
    setFloor(2);
    setSelection({ kind: "session", id: LATE_SESSION_ID });
  }, []);

  const nextStep = useCallback(() => {
    goToStep(stepIndex + 1);
  }, [goToStep, stepIndex]);

  const prevStep = useCallback(() => {
    goToStep(stepIndex - 1);
  }, [goToStep, stepIndex]);

  const value = useMemo<AppStateValue>(
    () => ({
      profile,
      setProfile,
      searchQuery,
      setSearchQuery,
      searchMode,
      setSearchMode,
      trackFilter,
      setTrackFilter,
      rankedSessions,
      rankedBooths,
      rankedVisitors,
      rankByRoom,
      rankByBooth,
      rankedSessionById,
      rankStatus,
      rankError,
      rankMeta,
      esHealth,
      view,
      setView,
      floor,
      setFloor,
      selection,
      selectSession,
      selectBooth,
      openExpoBooth,
      selectSpace,
      clearSelection,
      navigating,
      stepIndex,
      startNavTo255,
      stopNav,
      nextStep,
      prevStep,
      goToStep,
      sponsorBoothId,
      setSponsorBoothId,
      profileOpen,
      setProfileOpen,
      retryRank,
      savedIds,
      toggleSaved,
      sponsorPrefs,
      setSponsorPref,
      officialSessions,
      scheduleNote,
      featured,
      roomAnchors,
      mapSurface,
      setMapSurface,
      venueLayer,
      setVenueLayer,
      schematicSheet,
      setSchematicSheet,
      mapProjection,
      setMapProjection,
      map3dNotice,
      mapCameraReset,
      resetMapCamera,
      stepFree,
      setStepFree,
      dayFilter,
      setDayFilter,
      includeEnded,
      setIncludeEnded,
      askUnderstood,
      applyAsk,
      pickId,
      setPickId,
      timeZone,
      setTimeZone,
      bufferMinutes,
      setBufferMinutes,
      plannerIso,
      setPlannerIso,
      reminderMinutes,
      setReminderMinutes,
      reminderJobs,
      pushStatus,
      enablePush,
      scheduleReminder,
      cancelReminder,
      resolveSession,
      motionPref,
      setMotionPref,
      contrastPref,
      setContrastPref,
      textSizePref,
      setTextSizePref,
      mapFocus,
      requestMapFocus,
    }),
    [
      profile,
      searchQuery,
      searchMode,
      trackFilter,
      rankedSessions,
      rankedBooths,
      rankedVisitors,
      rankByRoom,
      rankByBooth,
      rankedSessionById,
      rankStatus,
      rankError,
      rankMeta,
      esHealth,
      view,
      floor,
      selection,
      selectSession,
      selectBooth,
      openExpoBooth,
      selectSpace,
      clearSelection,
      navigating,
      stepIndex,
      startNavTo255,
      stopNav,
      nextStep,
      prevStep,
      goToStep,
      sponsorBoothId,
      profileOpen,
      retryRank,
      savedIds,
      toggleSaved,
      sponsorPrefs,
      setSponsorPref,
      officialSessions,
      scheduleNote,
      featured,
      roomAnchors,
      mapSurface,
      venueLayer,
      schematicSheet,
      mapProjection,
      setMapProjection,
      map3dNotice,
      mapCameraReset,
      resetMapCamera,
      stepFree,
      dayFilter,
      includeEnded,
      askUnderstood,
      applyAsk,
      pickId,
      timeZone,
      bufferMinutes,
      plannerIso,
      reminderMinutes,
      reminderJobs,
      pushStatus,
      enablePush,
      scheduleReminder,
      cancelReminder,
      resolveSession,
      motionPref,
      setMotionPref,
      contrastPref,
      textSizePref,
      mapFocus,
      requestMapFocus,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

export function selectedRoomId(selection: Selection, session?: Session | null): string | null {
  if (!selection) return null;
  if (selection.kind === "space") return selection.id;
  if (selection.kind === "session") return session?.roomId ?? sampleSessionById(selection.id)?.roomId ?? null;
  return null;
}

function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + padding);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
