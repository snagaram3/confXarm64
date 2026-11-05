import { Client } from "@elastic/elasticsearch";

export const INDEX = process.env.ELASTICSEARCH_INDEX ?? "floorwise";
export const READY_WAIT_MS = Number(process.env.ELASTICSEARCH_READY_TIMEOUT_MS ?? 120_000);
const ES_URL = (process.env.ELASTICSEARCH_URL ?? "http://127.0.0.1:19200").replace(/\/$/, "");

export const es = new Client({
  node: ES_URL,
  requestTimeout: 15_000,
});

function isReadyStatus(status: string | undefined): boolean {
  return status === "green" || status === "yellow";
}

export async function waitForElasticsearch(timeoutMs = READY_WAIT_MS): Promise<void> {
  const start = Date.now();
  let last = "not started";
  while (Date.now() - start < timeoutMs) {
    const remainingMs = Math.max(500, timeoutMs - (Date.now() - start));
    const waitSec = Math.min(8, Math.max(1, Math.ceil(remainingMs / 1000)));
    const abortMs = Math.min(remainingMs, (waitSec + 1) * 1000);
    try {
      const health = await fetchClusterHealth({
        waitForYellow: true,
        waitSec,
        abortMs,
      });
      last = health.status;
      if (isReadyStatus(health.status)) return;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    await sleep(1000);
  }
  throw new Error(`Elasticsearch not ready after ${timeoutMs}ms (${last})`);
}

export async function pingCluster() {
  const health = await es.cluster.health({}, { maxRetries: 0, requestTimeout: 5000 });
  const info = await es.info({}, { maxRetries: 0, requestTimeout: 5000 });
  return {
    ok: isReadyStatus(health.status),
    status: health.status,
    cluster: info.cluster_name,
    version: info.version.number,
    timedOut: health.timed_out,
    numberOfNodes: health.number_of_nodes,
    unassignedShards: health.unassigned_shards,
  };
}

async function fetchClusterHealth(opts: {
  waitForYellow: boolean;
  waitSec: number;
  abortMs: number;
}): Promise<{ status: string }> {
  const params = opts.waitForYellow
    ? `wait_for_status=yellow&timeout=${opts.waitSec}s`
    : "timeout=1s";
  const res = await fetch(`${ES_URL}/_cluster/health?${params}`, {
    signal: AbortSignal.timeout(opts.abortMs),
  });
  const body = (await res.json()) as { status?: string };
  if (!body.status) {
    throw new Error(`health HTTP ${res.status}`);
  }
  return { status: body.status };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
