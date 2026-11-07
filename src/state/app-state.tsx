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
  OPENING_KEYNOTE_ID,
  catalog,
  sampleSessionById,
  sessionsInRoom,
  wayfinding,
} from "@/lib/catalog";
import { CONFERENCE_TZ, type DisplayTimeZone } from "@/lib/timezone";
import { MOTION_KEY, motionEnabled, readMotionPref, type MotionPref } from "@/lib/motion";
import { DEFAULT_PROFILE, rankWeight } from "@/lib/ranking";
import { PREF_STORAGE_KEY, parseSponsorPrefs } from "@/lib/sponsor-prefs";
import { parseToolsPath } from "@/lib/tools";
import type {
  AppView,
  Booth,
  EsHealth,
  Floor,
  MapSurface,
  Profile,
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
  selectSpace: (id: string) => void;
  clearSelection: () => void;
  navigating: boolean;
  stepIndex: number;
  startNavTo255: () => void;
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

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function readSponsorPrefs(): Record<string, Rank> {
  try {
    return parseSponsorPrefs(localStorage.getItem(PREF_STORAGE_KEY));
  } catch {
    return {};
  }
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [searchQuery, setSearchQuery] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>(readSaved);
  const [sponsorPrefs, setSponsorPrefs] = useState<Record<string, Rank>>(readSponsorPrefs);
  const [view, setView] = useState<AppView>(() =>
    parseToolsPath(window.location.pathname) ? "tools" : "map",
  );
  const [floor, setFloor] = useState<Floor>(2);
  const [selection, setSelection] = useState<Selection>(null);
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
  const [mapSurface, setMapSurface] = useState<MapSurface>("expo");
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
  const [mapFocus, setMapFocus] = useState<{ id: string; token: number } | null>(null);

  useEffect(() => {
    document.documentElement.dataset.motion = motionEnabled(motionPref) ? "full" : "reduced";
  }, [motionPref]);

  const setMotionPref = useCallback((pref: MotionPref) => {
    setMotionPrefState(pref);
    try {
      localStorage.setItem(MOTION_KEY, pref);
    } catch {
      /* ignore */
    }
  }, []);

  const requestMapFocus = useCallback((id: string) => {
    setMapFocus({ id, token: Date.now() });
  }, []);

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
        setSelection((prev) => prev ?? { kind: "session", id: OPENING_KEYNOTE_ID });
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
      fetchRank(profile, searchQuery, ac.signal)
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
  }, [profile, searchQuery, retryTick]);

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
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
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
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(next));
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
      void fetchSessionDetail(id)
        .then((d) => {
          setSessionIndex((prev) => ({ ...prev, [id]: { ...prev[id], ...d.session } }));
        })
        .catch(() => undefined);
      if (opts?.jump !== false) {
        if (session.dataset === "sample") {
          setMapSurface("sample");
          setFloor(session.floor as Floor);
        } else if (session.track === "Solutions Showcase" || session.roomLabel?.includes("Solutions Showcase")) {
          setMapSurface("expo");
        } else {
          setMapSurface("venue");
          requestMapFocus(session.roomId);
        }
        setView("map");
      }
    },
    [sessionIndex, requestMapFocus],
  );

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
    },
    [selectSession, officialSessions],
  );

  const clearSelection = useCallback(() => setSelection(null), []);

  const goToStep = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(wayfinding.steps.length - 1, index));
    setStepIndex(clamped);
    setFloor(wayfinding.steps[clamped].floor);
  }, []);

  const startNavTo255 = useCallback(() => {
    setNavigating(true);
    setView("navigate");
    setStepIndex(0);
    setFloor(1);
    setSelection({ kind: "session", id: LATE_SESSION_ID });
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
      mapFocus,
      requestMapFocus,
    }),
    [
      profile,
      searchQuery,
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
