import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toolsPath, type ToolFrame } from "@/lib/tools";
import { useCallback, useEffect, useMemo, useState } from "react";

type Mode = "synthetic" | "live";

type SessionRow = {
  id: string;
  title: string;
  speaker: string;
  track: string;
  tags: string[];
  start: string;
  end: string;
  phase: "ended" | "in_progress" | "upcoming";
  plannedFull: number;
  plannedPartial: number;
  observedFull: number;
  observedPartial: number;
  unknown: number;
  activeNow: number;
  onTrackForFull: number;
};

type Person = {
  id: string;
  displayName: string;
  role: string;
  contact: string;
  topics: string[];
  intent: "plans_full" | "plans_partial" | "none";
  presence: "full" | "partial" | "unknown";
  onTrackForFull: boolean;
  activeNow: boolean;
  evidence: string;
  sessionId: string | null;
  sessionTitle: string | null;
};

type Synthetic = {
  mode: "synthetic";
  label: string;
  source: string;
  window: string;
  fetchedAt: string;
  demo: { date: string; clock: string; timezone: string; note: string };
  rules: { fullSession: string; intentVsPresence: string; gps: string };
  totals: {
    participants: number;
    activeNow: number;
    plannedFull: number;
    plannedPartial: number;
    observedFull: number;
    observedPartial: number;
    unknownPresence: number;
  };
  topics: Array<{ topic: string; interested: number }>;
  sessions: SessionRow[];
  heatmap: Array<{ sessionId: string; topic: string; count: number }>;
  timeline: Array<{ clock: string; arrivals: number; departures: number; occupancy: number }>;
  people: Person[];
  filters: { topic: string | null; sessionId: string | null };
};

type Live = {
  mode: "live";
  available: boolean;
  label: string;
  source: string;
  window: string;
  error: string;
  data: null;
};

function readMode(search: string): Mode {
  const v = new URLSearchParams(search).get("mode");
  return v === "synthetic" ? "synthetic" : "live";
}

export function Dash0Dashboard({
  connection,
}: {
  connection: (ToolFrame & {
    exporter?: { configured: boolean; kind: string; ingestHost: string | null; note: string };
    remote?: { queried: boolean; spanCount: number | null; note: string };
    syntheticOtel?: { enabled: boolean; note: string };
  }) | null;
}) {
  const [mode, setMode] = useState<Mode>(() => readMode(window.location.search));
  const [topic, setTopic] = useState<string>(() => new URLSearchParams(window.location.search).get("topic") ?? "");
  const [session, setSession] = useState<string>(() => new URLSearchParams(window.location.search).get("session") ?? "");
  const [data, setData] = useState<Synthetic | Live | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncUrl = useCallback((next: { mode: Mode; topic: string; session: string }) => {
    window.history.replaceState(
      {},
      "",
      toolsPath("dash0", {
        mode: next.mode,
        topic: next.topic || undefined,
        session: next.session || undefined,
      }),
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ mode });
      if (topic) params.set("topic", topic);
      if (session) params.set("session", session);
      const res = await fetch(`/api/tools/dash0/engagement?${params}`);
      const json = (await res.json()) as Synthetic | Live | { error?: string };
      if (!res.ok) throw new Error(("error" in json && json.error) || res.statusText);
      setData(json as Synthetic | Live);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [mode, topic, session]);

  useEffect(() => {
    void load();
  }, [load]);

  function setFilters(next: Partial<{ mode: Mode; topic: string; session: string }>) {
    const merged = {
      mode: next.mode ?? mode,
      topic: next.topic ?? topic,
      session: next.session ?? session,
    };
    setMode(merged.mode);
    setTopic(merged.topic);
    setSession(merged.session);
    syncUrl(merged);
  }

  const synthetic = data?.mode === "synthetic" ? data : null;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="status"
        className="rounded-2xl border-2 border-cta bg-peach px-3 py-2 text-sm font-semibold text-foreground"
      >
        {mode === "synthetic"
          ? "Synthetic demo data — not live attendance"
          : "Live attendance is not available — this is not a fallback mix with demo numbers"}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Engagement data mode">
        <Button
          type="button"
          size="sm"
          variant={mode === "synthetic" ? "default" : "outline"}
          onClick={() => setFilters({ mode: "synthetic" })}
        >
          Synthetic
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "live" ? "default" : "outline"}
          onClick={() => setFilters({ mode: "live" })}
        >
          Live
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
          Refresh
        </Button>
        <a
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
          href="/api/tools/dash0/dashboard.json"
        >
          Perses JSON
        </a>
      </div>

      <p className="text-xs text-muted-foreground">
        {connection?.exporter?.note} {connection?.remote?.note} {connection?.syntheticOtel?.note}
      </p>

      {loading && <p className="text-sm text-muted-foreground">Loading engagement…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {mode === "live" && data?.mode === "live" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-display text-lg font-semibold">{data.label}</h3>
          <p className="mt-1 text-sm">{data.error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {data.source} · {data.window}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Switch to Synthetic for a labeled SAMPLE-catalog demo. Those numbers stay out of Live totals.
          </p>
        </div>
      )}

      {synthetic && <SyntheticViews data={synthetic} topic={topic} session={session} onFilter={setFilters} />}
    </div>
  );
}

function SyntheticViews({
  data,
  topic,
  session,
  onFilter,
}: {
  data: Synthetic;
  topic: string;
  session: string;
  onFilter: (next: Partial<{ topic: string; session: string }>) => void;
}) {
  const maxTopic = Math.max(1, ...data.topics.map((t) => t.interested));
  const maxOcc = Math.max(1, ...data.timeline.map((t) => t.occupancy));
  const topics = useMemo(() => {
    const set = new Set(data.heatmap.map((h) => h.topic));
    return [...set];
  }, [data.heatmap]);
  const maxHeat = Math.max(1, ...data.heatmap.map((h) => h.count));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {data.source} · {data.window} · updated {new Date(data.fetchedAt).toLocaleString()}
      </p>
      <p className="text-sm">{data.demo.note}</p>
      <p className="text-xs text-muted-foreground">{data.rules.fullSession}</p>
      <p className="text-xs text-muted-foreground">{data.rules.intentVsPresence}</p>

      <div className="flex flex-wrap gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Topic
          <select
            className="ml-2 min-h-11 rounded-md border border-border bg-card px-2 text-sm text-foreground"
            value={topic}
            onChange={(e) => onFilter({ topic: e.target.value })}
          >
            <option value="">All topics</option>
            {data.topics.map((t) => (
              <option key={t.topic} value={t.topic}>
                {t.topic}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Session
          <select
            className="ml-2 min-h-11 max-w-[14rem] rounded-md border border-border bg-card px-2 text-sm text-foreground"
            value={session}
            onChange={(e) => onFilter({ session: e.target.value })}
          >
            <option value="">Demo clock focus</option>
            {data.sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.start} {s.title}
              </option>
            ))}
          </select>
        </label>
        {(topic || session) && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onFilter({ topic: "", session: "" })}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Kpi label="Participants" value={data.totals.participants} hint="Synthetic people in this scenario" />
        <Kpi label="Active now" value={data.totals.activeNow} hint={`Join evidence at ${data.demo.clock}, not GPS`} />
        <Kpi label="Plans full session" value={data.totals.plannedFull} hint="Intention only" />
        <Kpi label="Observed full dwell" value={data.totals.observedFull} hint="90% rule, SAMPLE sessions" />
        <Kpi label="Partial dwell" value={data.totals.observedPartial} hint="Had join/leave, below 90%" />
        <Kpi label="No presence evidence" value={data.totals.unknownPresence} hint="Unknown — not zero" />
      </div>

      <section className="rounded-2xl border border-border p-3">
        <h4 className="font-display text-base font-semibold">Who cares about which topics</h4>
        <p className="mb-2 text-xs text-muted-foreground">Click a bar to filter. Interests are stated topics, not attendance.</p>
        <ul className="flex flex-col gap-1">
          {data.topics.map((t) => (
            <li key={t.topic}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-2 text-left"
                onClick={() => onFilter({ topic: t.topic })}
                aria-pressed={topic === t.topic}
              >
                <span className="w-28 shrink-0 truncate text-xs font-medium">{t.topic}</span>
                <span className="relative h-4 flex-1 overflow-hidden rounded-full bg-secondary">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    style={{ width: `${(t.interested / maxTopic) * 100}%` }}
                  />
                </span>
                <span className="w-8 text-right font-mono text-xs">{t.interested}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border p-3">
        <h4 className="font-display text-base font-semibold">Plans vs observed dwell</h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Left: people who planned the SAMPLE session. Right: evidence-backed dwell. Upcoming talks stay unknown.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] text-left text-xs">
            <caption className="sr-only">Session intention versus observed dwell</caption>
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-1 pr-2">Session</th>
                <th>Phase</th>
                <th>Plan full</th>
                <th>Plan part</th>
                <th>Full dwell</th>
                <th>Partial</th>
                <th>Unknown</th>
                <th>Now</th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2 pr-2">
                    <button type="button" className="text-left font-medium text-primary" onClick={() => onFilter({ session: s.id })}>
                      {s.start} {s.title}
                    </button>
                    <span className="block text-[10px] text-muted-foreground">SAMPLE · {s.speaker}</span>
                  </td>
                  <td>
                    <Badge variant={s.phase === "in_progress" ? "cta" : s.phase === "ended" ? "unrated" : "maybe"}>
                      {s.phase.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="font-mono">{s.plannedFull}</td>
                  <td className="font-mono">{s.plannedPartial}</td>
                  <td className="font-mono">{s.observedFull}</td>
                  <td className="font-mono">{s.observedPartial}</td>
                  <td className="font-mono">{s.unknown}</td>
                  <td className="font-mono">{s.activeNow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border p-3">
        <h4 className="font-display text-base font-semibold">Arrivals, departures, occupancy</h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Demo-day 15-minute buckets from join/leave records. Occupancy is not a hall sensor.
        </p>
        <svg viewBox="0 0 320 90" className="h-28 w-full" role="img" aria-label="Occupancy over the demo day">
          {data.timeline.map((pt, i) => {
            const x = (i / Math.max(1, data.timeline.length - 1)) * 300 + 10;
            const h = (pt.occupancy / maxOcc) * 70;
            return (
              <rect key={pt.clock} x={x} y={80 - h} width={6} height={h} rx={1} fill={pt.clock === data.demo.clock ? "#d62293" : "#113e82"}>
                <title>{`${pt.clock} occupancy ${pt.occupancy}, +${pt.arrivals} / −${pt.departures}`}</title>
              </rect>
            );
          })}
        </svg>
        <p className="text-[10px] text-muted-foreground">Pink bar marks demo clock {data.demo.clock}. Navy is occupancy.</p>
      </section>

      <section className="rounded-2xl border border-border p-3">
        <h4 className="font-display text-base font-semibold">Topic × session heatmap</h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Count of synthetic people interested in a topic who also planned or have evidence for that SAMPLE session.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] text-center text-[10px]">
            <caption className="sr-only">Heatmap of topic interest against SAMPLE sessions</caption>
            <thead>
              <tr>
                <th className="text-left">Session</th>
                {topics.map((t) => (
                  <th key={t} className="px-1 font-medium">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.id}>
                  <th className="truncate py-1 text-left font-normal">{s.title}</th>
                  {topics.map((t) => {
                    const cell = data.heatmap.find((h) => h.sessionId === s.id && h.topic === t);
                    const n = cell?.count ?? 0;
                    const alpha = 0.12 + (n / maxHeat) * 0.88;
                    return (
                      <td key={t}>
                        <button
                          type="button"
                          className="h-8 w-full rounded-sm text-[10px] font-mono"
                          style={{
                            backgroundColor: `rgba(17, 62, 130, ${alpha})`,
                            color: n / maxHeat > 0.45 ? "#fefefe" : "#0b0f1f",
                          }}
                          onClick={() => onFilter({ topic: t, session: s.id })}
                        >
                          {n || "·"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border p-3">
        <h4 className="font-display text-base font-semibold">Who is here (synthetic)</h4>
        <p className="mb-2 text-xs text-muted-foreground">
          Fictional names and @example.test contacts. Not sponsor leads. Presence is evidence-backed or unknown.
        </p>
        <ul className="flex flex-col gap-2">
          {data.people.slice(0, 24).map((p) => (
            <li key={p.id} className="rounded-xl border border-border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{p.displayName}</p>
                <Badge variant={p.activeNow ? "cta" : p.presence === "full" ? "must" : p.presence === "partial" ? "maybe" : "unrated"}>
                  {p.activeNow ? "active now" : p.onTrackForFull ? "on track" : p.presence}
                </Badge>
                <Badge variant="outline">{p.intent.replace("_", " ")}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {p.role} · {p.contact} · {p.topics.join(", ")}
              </p>
              <p className="mt-1 text-xs">{p.evidence}</p>
              {p.sessionTitle && <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.sessionTitle}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/50 px-3 py-2" title={hint}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-semibold text-primary">{value}</p>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
