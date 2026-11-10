import { Dash0Dashboard } from "@/components/tools/Dash0Dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchTool, type ToolFrame, type ToolTab } from "@/lib/tools";
import { useCallback, useEffect, useState, type ReactNode } from "react";

const LABELS: Record<ToolTab, string> = {
  sonar: "Code Quality",
  dash0: "Dash0",
  radar: "Radar",
  elasticsearch: "Elasticsearch",
};

export function ToolsPanel({
  tab,
  onTab,
}: {
  tab: ToolTab;
  onTab: (next: ToolTab) => void;
}) {
  return (
    <div className="flex max-w-full min-w-0 flex-col gap-3 overflow-x-clip">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Integrations</p>
        <h2 className="font-display text-2xl font-semibold">Tools</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live adapters for this confXarm64 process. Missing credentials show Needs setup — never a fake healthy dashboard.
        </p>
      </div>
      <Tabs value={tab} onValueChange={(v) => onTab(v as ToolTab)}>
        <TabsList aria-label="Tool results">
          {(Object.keys(LABELS) as ToolTab[]).map((id) => (
            <TabsTrigger key={id} value={id}>
              {LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="sonar">
          <SonarPane />
        </TabsContent>
        <TabsContent value="dash0">
          <Dash0Pane />
        </TabsContent>
        <TabsContent value="radar">
          <RadarPane />
        </TabsContent>
        <TabsContent value="elasticsearch">
          <ElasticPane />
        </TabsContent>
      </Tabs>
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
  if (!frame) return null;
  const label =
    frame.state === "not_configured"
      ? "Needs setup"
      : frame.state === "ok"
        ? "Connected"
        : frame.state === "empty"
          ? "No results"
          : "Error";
  const variant =
    frame.state === "ok" ? "must" : frame.state === "not_configured" ? "maybe" : frame.state === "empty" ? "unrated" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
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
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <Status frame={frame} />
        <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={onRefresh}>
          Refresh
        </Button>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading {title}…</p>}
      {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
      {frame?.error && frame.state !== "not_configured" && (
        <p role="alert" className="break-words text-sm text-destructive">{frame.error}</p>
      )}
      {frame?.missingEnv.length ? (
        <p className="break-all font-mono text-xs text-muted-foreground">Missing {frame.missingEnv.join(", ")}</p>
      ) : null}
      {frame && (
        <p className="text-xs text-muted-foreground">
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
    <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-sm">{value === null || value === undefined || value === "" ? "unavailable" : value}</p>
    </div>
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
    <Shell title="Code Quality" frame={data} loading={loading} error={error} onRefresh={refresh}>
          <p className="text-sm text-muted-foreground">
        This project uses <a className="font-semibold text-primary underline" href="https://gitar.ai" target="_blank" rel="noreferrer">Gitar</a> for code review and quality checks.
        Gitar analyzes GitHub CI results (npm test and npm run build) on pull requests.
      </p>
      {data?.uiUrl ? (
        <p className="text-sm">
          <a className="font-semibold text-primary underline" href={data.uiUrl} target="_blank" rel="noreferrer">
            Open External Quality Gate
          </a>
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
                <li key={issue.key} className="rounded-lg border border-border px-2 py-1">
                  <span className="font-mono text-[11px] text-muted-foreground">
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
            This page is confXarm64 Tools → Dash0 (<span className="font-mono">{data.floorwiseToolsPath}</span>). There is no
            self-hosted Dash0 product in-cluster.
          </p>
          {data.dashboardUrl ? (
            <p className="text-sm">
              <a className="font-semibold text-primary underline" href={data.dashboardUrl} target="_blank" rel="noreferrer">
                Open Dash0
              </a>
              <span className="text-muted-foreground"> — {data.dashboardUrl} (needs your org login; not a fake dashboard).</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Set DASH0_API_BASE_URL + DASH0_AUTH_TOKEN to query Dash0 and to show https://app.dash0.com here.
            </p>
          )}
          <p className="text-xs text-muted-foreground">{data.local.source}</p>
          {data.local.lastTraceId && (
            <p className="font-mono text-[11px] break-all">Last local trace {data.local.lastTraceId}</p>
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
          <section className="rounded-xl border border-border bg-secondary/30 p-3" aria-labelledby="skyhook-radar-heading">
            <h4 id="skyhook-radar-heading" className="text-sm font-semibold">
              Skyhook Radar
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">{data.skyhook.note}</p>
            {data.skyhook.uiUrl ? (
              <p className="mt-2 text-sm">
                <a className="font-semibold text-primary underline" href={data.skyhook.uiUrl} target="_blank" rel="noreferrer">
                  Open Skyhook Radar UI
                </a>
                <span className="font-mono text-xs text-muted-foreground"> {data.skyhook.uiUrl}</span>
              </p>
            ) : null}
          </section>
          <p className="text-sm text-muted-foreground">{data.venue.note}</p>
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
      cloud?: {
        state: ToolFrame["state"];
        configured: boolean;
        missingEnv: string[];
        projectAlias: string;
        region: string;
        kibanaUrl: string;
        embeddingsInferenceId: string;
        rerankInferenceId: string;
        demoIndex: string;
        notice: string;
        embeddings: { inferenceId: string; model: string; dims: number; used: boolean };
        rerank: { inferenceId: string; model: string; used: boolean };
        semanticHits: Array<{ id: string; score: number; body: string }>;
        error: string | null;
      };
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
                <li key={hit.id} className="rounded-lg border border-border px-2 py-1">
                  <span className="font-medium">{hit.id}</span>
                  <span className="ml-2 font-mono text-[11px]">
                    {hit.rank} · {hit.score.toFixed(1)}
                  </span>
                  <span className="block text-xs text-muted-foreground">{hit.why}</span>
                </li>
              ))}
            </ul>
          )}
          {data.cloud ? (
            <section className="rounded-xl border border-border bg-secondary/30 p-3" aria-labelledby="elastic-cloud-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 id="elastic-cloud-heading" className="text-sm font-semibold">
                  Elastic Cloud · Jina
                </h4>
                <Status
                  frame={{
                    ...data,
                    state: data.cloud.state,
                    error: data.cloud.error,
                    missingEnv: data.cloud.missingEnv,
                  }}
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{data.cloud.notice}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Metric label="Project" value={data.cloud.projectAlias} />
                <Metric label="Region" value={data.cloud.region} />
                <Metric label="Embeddings" value={data.cloud.embeddings.inferenceId} />
                <Metric label="Rerank" value={data.cloud.rerank.inferenceId} />
                <Metric label="Demo index" value={data.cloud.demoIndex} />
                <Metric
                  label="Jina used"
                  value={
                    data.cloud.embeddings.used || data.cloud.rerank.used
                      ? `embed ${data.cloud.embeddings.used ? "yes" : "no"} · rerank ${data.cloud.rerank.used ? "yes" : "no"}`
                      : "no"
                  }
                />
              </div>
              {data.cloud.missingEnv.length > 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Needs setup. Missing {data.cloud.missingEnv.join(", ")} (Kubernetes Secret confxarm64-secrets). Public
                  URLs are in GitOps; the API key is not.
                </p>
              ) : null}
              {data.cloud.error && data.cloud.state !== "not_configured" ? (
                <p className="mt-2 text-sm text-muted-foreground">{data.cloud.error}</p>
              ) : null}
              {data.cloud.semanticHits.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {data.cloud.semanticHits.map((hit) => (
                    <li key={hit.id} className="rounded-lg border border-border px-2 py-1">
                      <span className="font-medium">{hit.id}</span>
                      <span className="ml-2 font-mono text-[11px]">{hit.score.toFixed(3)}</span>
                      <span className="block text-xs text-muted-foreground">{hit.body}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Kibana {data.cloud.kibanaUrl} — login required; this tab does not invent Cloud results.
              </p>
            </section>
          ) : null}
        </>
      )}
    </Shell>
  );
}
