import { Dash0Dashboard } from "@/components/tools/Dash0Dashboard";
import {
  fetchTool,
  fetchToolsIndex,
  toolStatusLabel,
  type ToolFrame,
  type ToolState,
  type ToolTab,
} from "@/lib/tools";
import { useCallback, useEffect, useState, type ReactNode } from "react";

const LABELS: Record<ToolTab, string> = {
  elasticsearch: "Elasticsearch",
  dash0: "Dash0",
  radar: "Radar",
  gitar: "Gitar",
  sonar: "Sonar",
};

const LOOP: Array<{
  id: ToolTab;
  step: string;
  title: string;
  line: string;
  accent: "teal" | "navy" | "gold" | "coral";
}> = [
  {
    id: "elasticsearch",
    step: "01 find",
    title: "Elasticsearch",
    line: "Ranks the talk from the official schedule.",
    accent: "teal",
  },
  {
    id: "dash0",
    step: "02 journey",
    title: "Dash0",
    line: "Shows this process’s traces — not a self-hosted Dash0.",
    accent: "navy",
  },
  {
    id: "radar",
    step: "03 cluster",
    title: "Radar",
    line: "Skyhook Radar runs the app on the CNH cluster.",
    accent: "navy",
  },
  {
    id: "gitar",
    step: "04 land",
    title: "Gitar",
    line: "Reviews the fix as a pull request on GitHub.",
    accent: "gold",
  },
  {
    id: "sonar",
    step: "05 verify",
    title: "Sonar",
    line: "Optional quality check — never invented, never CI.",
    accent: "coral",
  },
];

function pillClass(state: ToolState | undefined): string {
  if (state === "ok") return "fg-pill fg-pill-ok";
  if (state === "not_configured") return "fg-pill fg-pill-setup";
  if (state === "empty") return "fg-pill fg-pill-empty";
  if (state === "error") return "fg-pill fg-pill-error";
  return "fg-pill fg-pill-setup";
}

export function ToolsPanel({
  tab,
  onTab,
}: {
  tab: ToolTab;
  onTab: (next: ToolTab) => void;
}) {
  const [index, setIndex] = useState<Partial<Record<ToolTab, ToolFrame>>>({});

  useEffect(() => {
    const ac = new AbortController();
    fetchToolsIndex(ac.signal)
      .then((data) => {
        const next: Partial<Record<ToolTab, ToolFrame>> = {};
        for (const id of Object.keys(LABELS) as ToolTab[]) {
          const frame = data[id];
          if (frame && typeof frame === "object" && "state" in frame) next[id] = frame;
        }
        setIndex(next);
      })
      .catch(() => {
        /* per-pane fetch still reports honest errors */
      });
    return () => ac.abort();
  }, [tab]);

  return (
    <div className="fg-page flex max-w-full min-w-0 flex-col gap-8 overflow-x-clip pb-10">
      <header className="fg-page-head">
        <p className="fg-eyebrow">Health · tools</p>
        <h1>
          How this planner is <em>wired</em>
        </h1>
        <p className="fg-lede">
          Elasticsearch finds the talk. Dash0 shows the user journey. Radar runs the app on the
          cluster. Gitar lands the fix as a reviewed PR. Sonar verifies quality — when a server is
          actually configured. Missing credentials stay Needs setup. Nothing here is a fake dashboard.
        </p>
      </header>

      <section aria-label="Tool loop">
        <div className="fg-loop">
          {LOOP.map((item) => {
            const frame = index[item.id];
            const current = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className="fg-loop-card"
                data-accent={item.accent}
                aria-current={current ? "true" : undefined}
                onClick={() => onTab(item.id)}
              >
                <span className="fg-step">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.line}</p>
                <span className={pillClass(frame?.state)}>{toolStatusLabel(frame?.state)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div
        className="fg-seg"
        role="tablist"
        aria-label="Tool results"
      >
        {(Object.keys(LABELS) as ToolTab[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTab(id)}
          >
            {LABELS[id]}
          </button>
        ))}
      </div>

      {tab === "elasticsearch" ? <ElasticPane /> : null}
      {tab === "dash0" ? <Dash0Pane /> : null}
      {tab === "radar" ? <RadarPane /> : null}
      {tab === "gitar" ? <GitarPane /> : null}
      {tab === "sonar" ? <SonarPane /> : null}
    </div>
  );
}

function useTool<T extends ToolFrame>(tab: ToolTab) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchTool<T>(tab));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    fetchTool<T>(tab, ac.signal)
      .then(setData)
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [tab]);

  return { data, loading, error, refresh };
}

function Status({ frame }: { frame: ToolFrame | null }) {
  if (!frame) return <span className="fg-pill fg-pill-setup">Loading</span>;
  return <span className={pillClass(frame.state)}>{toolStatusLabel(frame.state)}</span>;
}

function Shell({
  title,
  frame,
  loading,
  error,
  onRefresh,
  children,
}: {
  title: string;
  frame: ToolFrame | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <section className="fg-card fg-card-pad flex flex-col gap-4" aria-labelledby="tool-pane-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="tool-pane-heading" className="font-display text-2xl font-medium tracking-[-0.02em]">
          {title}
        </h2>
        <Status frame={frame} />
        <button type="button" className="fg-btn-ghost ml-auto" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      {loading && (
        <p className="text-sm text-[color:var(--fg-muted)]" role="status">
          Loading {title}…
        </p>
      )}
      {error && (
        <p role="alert" className="fg-alert fg-alert-error break-words">
          {error}
        </p>
      )}
      {frame?.error && (
        <p role="alert" className="fg-alert fg-alert-error break-words">
          {frame.error}
        </p>
      )}
      {frame?.missingEnv.length ? (
        <p className="fg-mono text-xs break-all text-[color:var(--fg-muted)]">
          Missing {frame.missingEnv.join(", ")}
        </p>
      ) : null}
      {frame && (
        <p className="fg-mono text-xs text-[color:var(--fg-muted)]">
          {frame.source}
          {frame.window ? ` · ${frame.window}` : ""}
          {frame.fetchedAt ? ` · ${new Date(frame.fetchedAt).toLocaleString()}` : ""}
        </p>
      )}
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <dl className="fg-metric">
      <dt>{label}</dt>
      <dd>{value === null || value === undefined || value === "" ? "unavailable" : value}</dd>
    </dl>
  );
}

function SonarPane() {
  const { data, loading, error, refresh } = useTool<
    ToolFrame & {
      host: string | null;
      uiUrl: string | null;
      projectKey: string | null;
      qualityGate: { status: string | null; conditions: Array<{ metric: string; status: string; actual?: string }> };
      lastAnalysis: string | null;
      measures: Record<string, string | null>;
      issues: Array<{ key: string; type: string; severity: string; message: string }>;
    }
  >("sonar");
  return (
    <Shell title="Sonar" frame={data} loading={loading} error={error} onRefresh={refresh}>
      <p className="text-sm text-[color:var(--fg-muted)]">
        Optional quality adapter. Gitar is the Never Merge Broken track — this pane is not CI and
        does not invent a quality gate.
      </p>
      {data?.uiUrl ? (
        <p className="text-sm">
          <a className="fg-link underline" href={data.uiUrl} target="_blank" rel="noreferrer">
            Open Sonar
          </a>
          <span className="text-[color:var(--fg-muted)]">
            {" "}
            — this is the server at SONAR_HOST_URL, not invented scan results.
          </span>
        </p>
      ) : null}
      {data?.configured && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Host" value={data.host} />
            <Metric label="Project" value={data.projectKey} />
            <Metric label="Quality gate" value={data.qualityGate.status} />
            <Metric label="Last analysis" value={data.lastAnalysis} />
            <Metric label="Bugs" value={data.measures.bugs} />
            <Metric label="Vulnerabilities" value={data.measures.vulnerabilities} />
            <Metric label="Security hotspots" value={data.measures.security_hotspots} />
            <Metric label="Coverage" value={data.measures.coverage} />
            <Metric label="Duplication %" value={data.measures.duplicated_lines_density} />
            <Metric label="Lines" value={data.measures.ncloc} />
          </div>
          {data.issues.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {data.issues.map((issue) => (
                <li key={issue.key} className="rounded-[14px] border border-[color:var(--fg-line)] px-3 py-2">
                  <span className="fg-mono text-[11px] text-[color:var(--fg-muted)]">
                    {issue.severity} · {issue.type}
                  </span>
                  <span className="block">{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Shell>
  );
}

function Dash0Pane() {
  const { data, loading, error, refresh } = useTool<
    ToolFrame & {
      exporter: { configured: boolean; kind: string; ingestHost: string | null; serviceName: string; note: string };
      local: {
        source: string;
        requests: number;
        errors: number;
        rankCalls: number;
        avgLatencyMs: number | null;
        lastTraceId: string | null;
      };
      remote: {
        queried: boolean;
        apiHost: string | null;
        spanCount: number | null;
        traces: Array<{ traceId: string; name: string }>;
        note: string;
      };
      dashboardUrl: string | null;
      floorwiseToolsPath: "/tools/dash0";
      syntheticOtel?: { enabled: boolean; note: string };
    }
  >("dash0");
  return (
    <Shell title="Dash0" frame={data} loading={loading} error={error} onRefresh={refresh}>
      {data && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="OTLP exporter" value={data.exporter.configured ? data.exporter.kind : "off"} />
            <Metric label="Remote spans" value={data.remote.queried ? data.remote.spanCount : "not queried"} />
            <Metric label="Local API calls" value={data.local.requests} />
            <Metric label="Avg latency ms" value={data.local.avgLatencyMs} />
          </div>
          <p className="text-sm">
            This page is confXarm64 Tools → Dash0 (<span className="fg-mono">{data.floorwiseToolsPath}</span>
            ). There is no self-hosted Dash0 product in-cluster.
          </p>
          {data.dashboardUrl ? (
            <p className="text-sm">
              <a className="fg-link underline" href={data.dashboardUrl} target="_blank" rel="noreferrer">
                Open Dash0
              </a>
              <span className="text-[color:var(--fg-muted)]">
                {" "}
                — {data.dashboardUrl} (needs your org login; not a fake dashboard).
              </span>
            </p>
          ) : (
            <p className="text-sm text-[color:var(--fg-muted)]">
              Set DASH0_API_BASE_URL + DASH0_AUTH_TOKEN to query Dash0 and to show https://app.dash0.com here.
            </p>
          )}
          <p className="text-xs text-[color:var(--fg-muted)]">{data.local.source}</p>
          {data.local.lastTraceId && (
            <p className="fg-mono text-[11px] break-all">Last local trace {data.local.lastTraceId}</p>
          )}
          <Dash0Dashboard connection={data} />
        </>
      )}
    </Shell>
  );
}

function RadarPane() {
  const { data, loading, error, refresh } = useTool<
    ToolFrame & {
      venue: { label: string; note: string };
      skyhook: { uiUrl: string | null; note: string };
    }
  >("radar");

  return (
    <Shell title="Radar" frame={data} loading={loading} error={error} onRefresh={refresh}>
      {data && (
        <>
          <section className="rounded-[16px] border border-[color:var(--fg-line)] bg-[color:var(--fg-sunk)] p-4" aria-labelledby="skyhook-radar-heading">
            <h3 id="skyhook-radar-heading" className="font-display text-lg font-medium">
              Skyhook Radar
            </h3>
            <p className="mt-1 text-sm text-[color:var(--fg-muted)]">{data.skyhook.note}</p>
            {data.skyhook.uiUrl ? (
              <p className="mt-2 text-sm">
                <a className="fg-link underline" href={data.skyhook.uiUrl} target="_blank" rel="noreferrer">
                  Open Skyhook Radar UI
                </a>
                <span className="fg-mono text-xs text-[color:var(--fg-muted)]"> {data.skyhook.uiUrl}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-[color:var(--fg-muted)]">
                Needs setup. This tab does not call api.radar.io (a different company) and does not
                invent geofences. Set RADAR_UI_URL only for a real Skyhook Radar UI (minikube:
                http://radar.&lt;minikube-ip&gt;.nip.io).
              </p>
            )}
          </section>
          <p className="text-sm text-[color:var(--fg-muted)]">{data.venue.note}</p>
        </>
      )}
    </Shell>
  );
}

function ElasticPane() {
  const { data, loading, error, refresh } = useTool<
    ToolFrame & {
      cluster: { name: string | null; version: string | null; status: string | null; nodes: number | null; ok: boolean };
      index: { name: string; docs: number | null; storeBytes: number | null };
      sampleHits: Array<{ id: string; score: number; rank: string; why: string }>;
      tookMs: number | null;
      notice: string;
    }
  >("elasticsearch");
  return (
    <Shell title="Elasticsearch" frame={data} loading={loading} error={error} onRefresh={refresh}>
      {data && (
        <>
          <p className="text-sm">{data.notice}</p>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Cluster" value={data.cluster.name} />
            <Metric label="Version" value={data.cluster.version} />
            <Metric label="Health" value={data.cluster.status} />
            <Metric label="Nodes" value={data.cluster.nodes} />
            <Metric label="Index" value={data.index.name} />
            <Metric label="Documents" value={data.index.docs} />
            <Metric label="Last query ms" value={data.tookMs} />
          </div>
          {data.sampleHits.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {data.sampleHits.map((hit) => (
                <li key={hit.id} className="rounded-[14px] border border-[color:var(--fg-line)] px-3 py-2">
                  <span className="font-medium">{hit.id}</span>
                  <span className="ml-2 fg-mono text-[11px]">
                    {hit.rank} · {hit.score.toFixed(1)}
                  </span>
                  <span className="block text-xs text-[color:var(--fg-muted)]">{hit.why}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Shell>
  );
}

function GitarPane() {
  const { data, loading, error, refresh } = useTool<
    ToolFrame & {
      repo: string;
      repoUrl: string;
      pullsUrl: string;
      connectUrl: string;
      files: Array<{ path: string; present: boolean }>;
      autoApply: { how: string; note: string };
      ci: { workflow: string; jobs: string; note: string };
      notice: string;
    }
  >("gitar");
  return (
    <Shell title="Gitar" frame={data} loading={loading} error={error} onRefresh={refresh}>
      {data && (
        <>
          <p className="text-sm">{data.notice}</p>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Repo" value={data.repo} />
            <Metric label="CI jobs" value={data.ci.jobs} />
          </div>
          <p className="text-sm text-[color:var(--fg-muted)]">{data.ci.note}</p>
          <p className="text-sm">{data.autoApply.how}</p>
          <p className="text-xs text-[color:var(--fg-muted)]">{data.autoApply.note}</p>
          <ul className="flex flex-col gap-1 text-sm">
            {data.files.map((file) => (
              <li
                key={file.path}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-[color:var(--fg-line)] px-3 py-2"
              >
                <span className="fg-mono text-[12px]">{file.path}</span>
                <span className={file.present ? "fg-pill fg-pill-ok" : "fg-pill fg-pill-empty"}>
                  {file.present ? "In repo" : "Missing"}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <a className="fg-btn" href={data.pullsUrl} target="_blank" rel="noreferrer">
              Open GitHub pull requests
            </a>
            <a className="fg-btn-ghost" href={data.repoUrl} target="_blank" rel="noreferrer">
              Open {data.repo}
            </a>
            <a className="fg-btn-ghost" href={data.connectUrl} target="_blank" rel="noreferrer">
              Connect Gitar to GitHub
            </a>
          </div>
        </>
      )}
    </Shell>
  );
}
