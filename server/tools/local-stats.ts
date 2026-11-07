export type RankSample = {
  tookMs: number;
  hitCount: number;
  top: Array<{ id: string; score: number; rank: string }>;
  at: string;
};

const startedAt = new Date().toISOString();
let requests = 0;
let errors = 0;
let rankCalls = 0;
let lastRank: RankSample | null = null;
let lastTraceId: string | null = null;
const latencies: number[] = [];

export function noteRequest(status: number, ms: number): void {
  requests += 1;
  if (status >= 500) errors += 1;
  latencies.push(ms);
  if (latencies.length > 40) latencies.shift();
}

export function noteRank(sample: RankSample, traceId: string | null): void {
  rankCalls += 1;
  lastRank = sample;
  if (traceId) lastTraceId = traceId;
}

export function localStatsSnapshot() {
  const avg =
    latencies.length === 0 ? null : Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  return {
    source: "local process counters — not proof Dash0 ingested anything",
    startedAt,
    requests,
    errors,
    rankCalls,
    avgLatencyMs: avg,
    lastRank,
    lastTraceId,
  };
}
