import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchHealth, fetchRank, fetchVisitors } from "@/lib/api";
import {
  FEATURED_BOOTH_ID,
  LATE_SESSION_ID,
  catalog,
  sessionById,
  sessionsInRoom,
  wayfinding,
} from "@/lib/catalog";
import { DEFAULT_PROFILE, rankWeight } from "@/lib/ranking";
import type {
  AppView,
  Booth,
  EsHealth,
  Floor,
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
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<AppView>("map");
  const [floor, setFloor] = useState<Floor>(1);
  const [selection, setSelection] = useState<Selection>({
    kind: "session",
    id: LATE_SESSION_ID,
  });
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
  }, [profile, searchQuery]);

  useEffect(() => {
    const ac = new AbortController();
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

  const selectSession = useCallback((id: string, opts?: { jump?: boolean }) => {
    const session = sessionById(id);
    if (!session) return;
    setSelection({ kind: "session", id });
    if (opts?.jump !== false) setFloor(session.floor);
  }, []);

  const selectBooth = useCallback((id: string, opts?: { jump?: boolean }) => {
    const booth = catalog.booths.find((b) => b.id === id);
    if (!booth) return;
    setSelection({ kind: "booth", id });
    setSponsorBoothId(id);
    if (opts?.jump !== false) setFloor(booth.floor);
  }, []);

  const selectSpace = useCallback(
    (id: string) => {
      const inRoom = sessionsInRoom(id);
      if (inRoom[0]) {
        selectSession(inRoom[0].id);
        return;
      }
      const booth = catalog.booths.find((b) => b.hallId === id);
      if (booth) {
        selectBooth(booth.id);
        return;
      }
      setSelection({ kind: "space", id });
    },
    [selectBooth, selectSession],
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
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

export function selectedRoomId(selection: Selection): string | null {
  if (!selection) return null;
  if (selection.kind === "space") return selection.id;
  if (selection.kind === "session") {
    return sessionById(selection.id)?.roomId ?? null;
  }
  if (selection.kind === "booth") {
    return catalog.booths.find((b) => b.id === selection.id)?.hallId ?? null;
  }
  return null;
}
