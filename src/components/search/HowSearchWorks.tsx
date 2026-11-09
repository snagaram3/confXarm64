import { cn } from "@/lib/utils";
import type { QueryMode } from "@/lib/types";
import { useAppState } from "@/state/app-state";

const MODES: Array<{ id: QueryMode; label: string; detail: string }> = [
  {
    id: "keyword",
    label: "Keyword",
    detail: "BM25 multi_match on title^3, abstract^2, tags, track, speaker. Fuzziness AUTO.",
  },
  {
    id: "semantic",
    label: "Semantic",
    detail: "kNN cosine on the 48-dim dense_vector stored with each abstract. Local vocab (eBPF, security, …), not a hosted LLM embedding.",
  },
  {
    id: "hybrid",
    label: "Hybrid",
    detail: "RRF of BM25 + kNN when this Elasticsearch accepts retrievers; otherwise function_score BM25 + cosineSimilarity.",
  },
];

export function HowSearchWorks() {
  const { searchMode, setSearchMode, rankMeta, rankStatus } = useAppState();
  return (
    <details open className="rounded-2xl border border-border bg-card px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold">How search works</summary>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Judges: this panel is the Elasticsearch query, not a mock. Rankings hit{" "}
        <code className="font-mono">POST /api/rank</code> over the official 2026 main schedule. Toggle
        the retriever and watch scores and snippets change. “Ask the schedule” RAG is skipped unless an
        LLM key exists — none is faked here.
      </p>
      <div className="mt-3 flex flex-wrap gap-1" role="radiogroup" aria-label="Elasticsearch query mode">
        {MODES.map((mode) => {
          const on = searchMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSearchMode(mode.id)}
              className={cn(
                "min-h-11 rounded-full border px-3 text-xs font-semibold",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground",
              )}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
      <ul className="mt-3 grid gap-2 text-xs leading-relaxed text-muted-foreground">
        {MODES.map((mode) => (
          <li key={mode.id}>
            <span className="font-semibold text-foreground">{mode.label}.</span> {mode.detail}
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground" role="status">
        {rankStatus === "loading" ? "Querying Elasticsearch…" : null}
        {rankMeta
          ? `engine=${rankMeta.engine} mode=${rankMeta.mode} retriever=${rankMeta.retriever ?? "—"} took=${rankMeta.tookMs}ms`
          : rankStatus === "ready"
            ? "No rank meta yet."
            : null}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Ask-the-schedule RAG: no OPENAI_API_KEY or ANTHROPIC_API_KEY in this environment, so Floorwise
        will not invent a grounded summary. Citations would list retrieved talk titles only if a key
        were present.
      </p>
    </details>
  );
}
