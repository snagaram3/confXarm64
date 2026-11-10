import { fetchJson, ProviderHttpError, readCache, writeCache, type CacheEntry } from "./http.ts";
import { hostnameOnly, redactError } from "./redact.ts";

const cache = new Map<string, CacheEntry<SonarSnapshot>>();
const TTL = 45_000;

const BLOCKED_HOSTS = new Set(["169.254.169.254", "metadata.google.internal"]);

export type SonarSnapshot = {
  tool: "sonar";
  state: "not_configured" | "ok" | "error" | "empty";
  configured: boolean;
  fetchedAt: string | null;
  source: string;
  window: string | null;
  error: string | null;
  missingEnv: string[];
  host: string | null;
  projectKey: string | null;
  qualityGate: { status: string | null; conditions: Array<{ metric: string; status: string; actual?: string }> };
  lastAnalysis: string | null;
  measures: Record<string, string | null>;
  issues: Array<{ key: string; type: string; severity: string; message: string }>;
  uiUrl: string | null;
};

function sonarHost(): string | null {
  const raw = (process.env.SONAR_HOST_URL ?? "").replace(/\/$/, "");
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (BLOCKED_HOSTS.has(url.hostname)) return null;
  return url.origin;
}

export function sonarMissingEnv(): string[] {
  const missing: string[] = [];
  if (!sonarHost()) missing.push("SONAR_HOST_URL");
  if (!process.env.SONAR_TOKEN) missing.push("SONAR_TOKEN");
  if (!process.env.SONAR_PROJECT_KEY) missing.push("SONAR_PROJECT_KEY");
  return missing;
}

function authHeader(): string {
  return `Bearer ${process.env.SONAR_TOKEN}`;
}

export function measureValue(
  measures: Array<{ metric: string; value?: string; period?: { value?: string } }>,
  key: string,
): string | null {
  const hit = measures.find((m) => m.metric === key);
  if (!hit) return null;
  if (hit.value !== undefined && hit.value !== "") return hit.value;
  if (hit.period?.value !== undefined && hit.period.value !== "") return hit.period.value;
  return null;
}

export async function fetchSonar(): Promise<SonarSnapshot> {
  const missing = sonarMissingEnv();
  const empty: SonarSnapshot = {
    tool: "sonar",
    state: "not_configured",
    configured: missing.length === 0,
    fetchedAt: null,
    source: "Code quality via Gitar (GitHub App)",
    window: "CI diagnostics from npm test and npm run build",
    error: missing.length
      ? `This project uses Gitar for code review. SonarQube is not configured for this hackathon project.`
      : null,
    missingEnv: missing,
    host: hostnameOnly(sonarHost()),
    projectKey: process.env.SONAR_PROJECT_KEY ?? null,
    qualityGate: { status: null, conditions: [] },
    lastAnalysis: null,
    measures: {},
    issues: [],
    uiUrl: sonarHost(),
  };
  if (missing.length) return empty;

  const cached = readCache(cache, "sonar", TTL);
  if (cached) return cached;

  const host = sonarHost()!;
  const key = encodeURIComponent(process.env.SONAR_PROJECT_KEY!);
  const org = process.env.SONAR_ORGANIZATION
    ? `&organization=${encodeURIComponent(process.env.SONAR_ORGANIZATION)}`
    : "";
  const headers = { Authorization: authHeader() };

  try {
    const metrics =
      "bugs,vulnerabilities,security_hotspots,coverage,duplicated_lines_density,ncloc,alert_status,reliability_rating,security_rating";
    const [gate, measures, issues, project] = await Promise.all([
      fetchJson(`${host}/api/qualitygates/project_status?projectKey=${key}${org}`, { headers }),
      fetchJson(`${host}/api/measures/component?component=${key}&metricKeys=${metrics}${org}`, { headers }),
      fetchJson(`${host}/api/issues/search?componentKeys=${key}&ps=8&statuses=OPEN${org}`, { headers }),
      fetchJson(`${host}/api/components/show?component=${key}${org}`, { headers }),
    ]);

    if (gate.status === 401 || measures.status === 401) {
      throw new ProviderHttpError(401, "Sonar rejected the token");
    }
    if (gate.status >= 400) {
      throw new ProviderHttpError(gate.status, `quality gate HTTP ${gate.status}`);
    }

    const gateJson = gate.json as {
      projectStatus?: { status?: string; conditions?: Array<{ metricKey?: string; status?: string; actualValue?: string }> };
    };
    const measJson = measures.json as {
      component?: { measures?: Array<{ metric: string; value?: string; period?: { value?: string } }> };
    };
    const issueJson = issues.json as {
      issues?: Array<{ key: string; type?: string; severity?: string; message?: string }>;
    };
    const projJson = project.json as { component?: { analysisDate?: string } };

    const list = measJson.component?.measures ?? [];
    const keys = [
      "bugs",
      "vulnerabilities",
      "security_hotspots",
      "coverage",
      "duplicated_lines_density",
      "ncloc",
    ];
    const parsed: Record<string, string | null> = {};
    for (const k of keys) parsed[k] = measureValue(list, k);

    const snapshot: SonarSnapshot = {
      ...empty,
      state: "ok",
      configured: true,
      fetchedAt: new Date().toISOString(),
      error: null,
      missingEnv: [],
      qualityGate: {
        status: gateJson.projectStatus?.status ?? measureValue(list, "alert_status"),
        conditions: (gateJson.projectStatus?.conditions ?? []).map((c) => ({
          metric: c.metricKey ?? "unknown",
          status: c.status ?? "NONE",
          actual: c.actualValue,
        })),
      },
      lastAnalysis: projJson.component?.analysisDate ?? null,
      measures: parsed,
      issues: (issueJson.issues ?? []).slice(0, 8).map((issue) => ({
        key: issue.key,
        type: issue.type ?? "CODE_SMELL",
        severity: issue.severity ?? "INFO",
        message: (issue.message ?? "").slice(0, 180),
      })),
    };
    if (!snapshot.lastAnalysis && !snapshot.qualityGate.status) snapshot.state = "empty";
    return writeCache(cache, "sonar", snapshot);
  } catch (err) {
    return {
      ...empty,
      state: "error",
      configured: true,
      fetchedAt: new Date().toISOString(),
      error: redactError(err),
    };
  }
}
