/** Fixed 48-dim domain embedding over KubeCon-ish tags and keywords.
 *  Stored as an Elasticsearch dense_vector and queried with cosineSimilarity.
 *  This is a simple local vector, not a hosted LLM embedding. */
export const VOCAB = [
  "kubernetes",
  "k8s",
  "observability",
  "otel",
  "opentelemetry",
  "platform",
  "engineering",
  "ebpf",
  "cilium",
  "hubble",
  "security",
  "sigstore",
  "gitops",
  "helm",
  "wasm",
  "finops",
  "cost",
  "mesh",
  "istio",
  "ai",
  "ml",
  "llm",
  "gpu",
  "storage",
  "search",
  "elasticsearch",
  "grafana",
  "tracing",
  "metrics",
  "logs",
  "cncf",
  "cluster",
  "multi",
  "sre",
  "devex",
  "network",
  "policy",
  "supply",
  "chain",
  "inference",
  "dashboard",
  "collector",
  "sidecar",
  "golden",
  "path",
  "terraform",
  "vault",
  "rancher",
] as const;

export const VECTOR_DIMS = VOCAB.length;

export function embed(parts: string[]): number[] {
  const text = parts.join(" ").toLowerCase();
  const vec = new Array<number>(VECTOR_DIMS).fill(0);
  VOCAB.forEach((term, i) => {
    if (!term) return;
    let score = 0;
    let from = 0;
    while (from < text.length) {
      const at = text.indexOf(term, from);
      if (at === -1) break;
      score += 1;
      from = at + term.length;
    }
    vec[i] = score;
  });
  return l2(vec);
}

function l2(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((sum, n) => sum + n * n, 0));
  if (mag < 1e-8) {
    const fill = 1 / Math.sqrt(vec.length);
    return vec.map(() => fill);
  }
  return vec.map((n) => n / mag);
}
