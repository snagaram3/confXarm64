import { Client } from "@elastic/elasticsearch";

export const INDEX = process.env.ELASTICSEARCH_INDEX ?? "floorwise";

export const es = new Client({
  node: process.env.ELASTICSEARCH_URL ?? "http://127.0.0.1:9200",
  requestTimeout: 15_000,
});

export async function waitForElasticsearch(timeoutMs = 90_000): Promise<void> {
  const start = Date.now();
  let last = "not started";
  while (Date.now() - start < timeoutMs) {
    try {
      const health = await es.cluster.health({});
      last = health.status;
      if (health.status === "green" || health.status === "yellow") return;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    await sleep(2000);
  }
  throw new Error(`Elasticsearch not ready after ${timeoutMs}ms (${last})`);
}

export async function pingCluster() {
  const health = await es.cluster.health({});
  const info = await es.info();
  return {
    ok: health.status === "green" || health.status === "yellow",
    status: health.status,
    cluster: info.cluster_name,
    version: info.version.number,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
