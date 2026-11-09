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
    label: "Lexical vector",
    detail: "kNN cosine on a 48-dim local token-count vector (eBPF, security, …). Not a hosted LLM or Jina embedding.",
  },
  {
    id: "hybrid",
    label: "Hybrid",
    detail: "RRF of BM25 + lexical kNN when this Elasticsearch accepts retrievers; otherwise function_score BM25 + cosineSimilarity.",
  },
];

export function HowSearchWorks() {
  const { searchMode, setSearchMode, rankMeta, rankStatus, esHealth } = useAppState();
  const askReason =
    esHealth?.askSchedule?.reason ??
    "Ask-the-schedule RAG is not wired unless an LLM key is set on the server. This app will not invent a grounded summary.";
  return (
    <details open className="fg-card px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold">How search works</summary>
      <p className="mt-2 text-xs leading-relaxed text-[color:var(--fg-muted)]">
        Talk rankings come from Elasticsearch (<code className="font-mono">POST /api/rank</code>) over the official 2026
        main schedule — not a mock list. Toggle the retriever and watch scores and snippets change. Topic weights are
        sent as Elasticsearch boosts. “Ask the schedule” RAG is skipped unless an LLM key exists — none is faked here.
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
                "fg-chip text-xs",
                on && "is-on",
              )}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
      <ul className="mt-3 grid gap-2 text-xs leading-relaxed text-[color:var(--fg-muted)]">
        {MODES.map((mode) => (
          <li key={mode.id}>
            <span className="font-semibold text-foreground">{mode.label}.</span> {mode.detail}
          </li>
        ))}
      </ul>
      <p className="fg-mono mt-3 rounded-xl bg-[color:var(--fg-sunk)] px-3 py-2 text-[11px] leading-relaxed" role="status">
        {rankStatus === "loading" ? "Querying Elasticsearch…" : null}
        {rankMeta
          ? `engine=${rankMeta.engine} mode=${rankMeta.mode} retriever=${rankMeta.retriever ?? "—"} took=${rankMeta.tookMs}ms`
          : rankStatus === "ready"
            ? "No rank meta yet."
            : null}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">{askReason}</p>
    </details>
  );
}
