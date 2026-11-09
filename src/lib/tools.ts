export const TOOL_TABS = ["elasticsearch", "dash0", "radar", "gitar", "sonar"] as const;
export type ToolTab = (typeof TOOL_TABS)[number];

const TAB_RE = "elasticsearch|dash0|radar|gitar|sonar";

export function parseToolsPath(pathname: string): ToolTab | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const match = new RegExp(`^/tools(?:/(${TAB_RE}))?$`).exec(clean);
  if (!match) return null;
  return (match[1] as ToolTab | undefined) ?? "elasticsearch";
}

export function toolsPath(tab: ToolTab, query?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) params.set(k, v);
    }
  }
  const qs = params.toString();
  return qs ? `/tools/${tab}?${qs}` : `/tools/${tab}`;
}

export type ToolState = "not_configured" | "ok" | "error" | "empty";

export interface ToolFrame {
  tool: ToolTab;
  state: ToolState;
  configured: boolean;
  fetchedAt: string | null;
  source: string;
  window: string | null;
  error: string | null;
  missingEnv: string[];
}

export function toolStatusLabel(state: ToolState | undefined): string {
  if (state === "not_configured") return "Needs setup";
  if (state === "ok") return "Connected";
  if (state === "empty") return "No results";
  if (state === "error") return "Error";
  return "Loading";
}

export async function fetchTool<T>(tab: ToolTab, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api/tools/${tab}`, { signal });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export async function fetchToolsIndex(signal?: AbortSignal): Promise<Record<string, ToolFrame>> {
  const res = await fetch("/api/tools", { signal });
  const data = (await res.json()) as Record<string, ToolFrame> & { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export async function fetchEngagement(
  mode: "synthetic" | "live",
  filters: { topic?: string; session?: string } = {},
  signal?: AbortSignal,
): Promise<unknown> {
  const params = new URLSearchParams({ mode });
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.session) params.set("session", filters.session);
  const res = await fetch(`/api/tools/dash0/engagement?${params}`, { signal });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export async function postRadarLookup(body: {
  consent: true;
  action?: "geocode_venue";
  latitude?: number;
  longitude?: number;
  accuracyM?: number | null;
}): Promise<unknown> {
  const res = await fetch("/api/tools/radar/lookup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}
