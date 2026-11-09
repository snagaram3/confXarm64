export function livenessBody(): { ok: true; live: true } {
  return { ok: true, live: true };
}

export function readinessOk(esReachable: boolean, esHealthy: boolean, indexReady: boolean): boolean {
  return esReachable && esHealthy && indexReady;
}

export function readinessStatusCode(ready: boolean): 200 | 503 {
  return ready ? 200 : 503;
}

export function askScheduleStatus(env: NodeJS.ProcessEnv = process.env): {
  available: boolean;
  reason: string;
} {
  const hasKey = Boolean(env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY);
  return {
    available: hasKey,
    reason: hasKey
      ? "An LLM key is present on the server. Ask-the-schedule is still not wired in this build — the app will not invent a RAG summary."
      : "No LLM key is configured on the server. The app will not invent a grounded schedule summary.",
  };
}
