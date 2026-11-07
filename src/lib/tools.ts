export const TOOL_TABS = ["sonar", "dash0", "radar", "elasticsearch"] as const;
export type ToolTab = (typeof TOOL_TABS)[number];

export function parseToolsPath(pathname: string): ToolTab | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const match = /^\/tools(?:\/(sonar|dash0|radar|elasticsearch))?$/.exec(clean);
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

export async function fetchTool<T>(tab: ToolTab, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api/tools/${tab}`, { signal });
  const data = (await res.json()) as T & { error?: string };
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
