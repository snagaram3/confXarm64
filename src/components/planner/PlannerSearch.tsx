import { formatModePill, inferQueryMode } from "@/lib/field-guide";
import { motionEnabled } from "@/lib/motion";
import { useAppState } from "@/state/app-state";
import { useEffect, useState } from "react";

export function PlannerSearch({
  why,
  shown,
}: {
  why: string;
  shown: string;
}) {
  const { searchQuery, setSearchQuery, setSearchMode, rankMeta, rankStatus, motionPref } = useAppState();
  const live = motionEnabled(motionPref);
  const requested = inferQueryMode(searchQuery);
  const pill = formatModePill(rankMeta?.mode ?? requested);
  const [display, setDisplay] = useState(pill);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [incoming, setIncoming] = useState(false);
  const [pulse, setPulse] = useState(false);

  const commitQuery = (value: string) => {
    setSearchQuery(value);
    setSearchMode(inferQueryMode(value));
  };

  useEffect(() => {
    if (pill === display) {
      if (rankStatus === "ready" && live) {
        setPulse(true);
        const id = window.setTimeout(() => setPulse(false), 700);
        return () => window.clearTimeout(id);
      }
      return;
    }
    if (!live) {
      setDisplay(pill);
      setOutgoing(null);
      setIncoming(false);
      return;
    }
    setOutgoing(display);
    setDisplay(pill);
    setIncoming(true);
    const raf = requestAnimationFrame(() => setIncoming(false));
    const id = window.setTimeout(() => setOutgoing(null), 300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(id);
    };
  }, [pill, display, live, rankStatus]);

  const tip = rankMeta
    ? `engine ${rankMeta.engine} · ${rankMeta.tookMs} ms`
    : rankStatus === "loading"
      ? "Querying Elasticsearch…"
      : "Elasticsearch POST /api/rank · hybrid, keyword, or semantic";

  return (
    <>
      <div className="fg-search" role="search">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <label htmlFor="q" className="fg-sr">
          Search official sessions and exhibitors
        </label>
        <input
          id="q"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="talks that make on-call less painful"
          value={searchQuery}
          onChange={(event) => commitQuery(event.target.value)}
        />
        <button
          className={searchQuery ? "fg-clear on" : "fg-clear"}
          type="button"
          aria-label="Clear search"
          onClick={() => commitQuery("")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <span className={pulse ? "fg-mode pulse" : "fg-mode"} tabIndex={0} aria-describedby="modeTip">
          {outgoing ? <span className="out">{outgoing}</span> : null}
          <span className={incoming ? "in" : undefined}>{display}</span>
        </span>
        <div className="fg-tip" id="modeTip" role="tooltip">
          index <b>sessions, exhibitors</b>
          <br />
          fusion <b>{rankMeta?.retriever === "rrf" ? "RRF" : rankMeta?.retriever ?? "BM25 + kNN"}</b>
          {rankMeta?.mode ? (
            <>
              {" "}
              · <b>{formatModePill(rankMeta.mode)}</b>
            </>
          ) : null}
          <br />
          <span style={{ opacity: 0.75 }}>{tip}</span>
        </div>
      </div>
      <div className="fg-status">
        <span>{why}</span>
        <span>{shown}</span>
      </div>
    </>
  );
}
