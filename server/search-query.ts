import type { estypes } from "@elastic/elasticsearch";
import { embed } from "./embed.ts";

export type QueryMode = "keyword" | "semantic" | "hybrid";
export type RankEngineMode = "keyword-bm25" | "semantic-knn" | "hybrid-bm25-knn";

export function parseQueryMode(raw: unknown): QueryMode {
  if (raw === "keyword" || raw === "semantic" || raw === "hybrid") return raw;
  return "hybrid";
}

export function engineModeFor(mode: QueryMode): RankEngineMode {
  if (mode === "keyword") return "keyword-bm25";
  if (mode === "semantic") return "semantic-knn";
  return "hybrid-bm25-knn";
}

export function keywordQuery(textQuery: string): estypes.QueryDslQueryContainer | null {
  const keyword = textQuery.trim();
  if (!keyword) return null;
  return {
    multi_match: {
      query: keyword,
      fields: ["title^3", "abstract^2", "tags^2", "track", "speaker"],
      fuzziness: "AUTO",
      _name: "bm25_keyword",
    },
  };
}

export function interestShould(interests: string[], textQuery: string, role: string): estypes.QueryDslQueryContainer[] {
  const should: estypes.QueryDslQueryContainer[] = [];
  for (const tag of interests) {
    should.push({
      term: { "tags.raw": { value: tag, boost: 3.2, _name: `tag:${tag}` } },
    });
  }
  const keyword = keywordQuery([textQuery, ...interests].filter(Boolean).join(" "));
  if (keyword) should.push(keyword);
  if (role) {
    should.push({ match: { role: { query: role, _name: "role_boost", boost: 1.4 } } });
    should.push({ match: { title: { query: role, _name: "role_in_title", boost: 0.8 } } });
  }
  return should;
}

export function queryVector(textQuery: string, role: string, interests: string[]): number[] {
  return embed([textQuery, role, ...interests]);
}

export function kindFilter(kind: string, boothId?: string, track?: string): estypes.QueryDslQueryContainer[] {
  const filters: estypes.QueryDslQueryContainer[] = [{ term: { kind } }];
  if (boothId) filters.push({ term: { boothId } });
  if (track && track !== "all") filters.push({ term: { "track.raw": track } });
  return filters;
}

/** RRF retriever body for ES 8.14+. Callers fall back to function_score if rejected. */
export function rrfRetriever(opts: {
  kind: string;
  qvec: number[];
  keyword: estypes.QueryDslQueryContainer | null;
  filters: estypes.QueryDslQueryContainer[];
  k?: number;
}): Record<string, unknown> {
  const filter = opts.filters.length === 1 ? opts.filters[0] : { bool: { filter: opts.filters } };
  const retrievers: Record<string, unknown>[] = [];
  if (opts.keyword) {
    retrievers.push({
      standard: {
        query: {
          bool: {
            filter: opts.filters,
            must: [opts.keyword],
          },
        },
      },
    });
  }
  retrievers.push({
    knn: {
      field: "embedding",
      query_vector: opts.qvec,
      k: opts.k ?? 40,
      num_candidates: 80,
      filter,
    },
  });
  return {
    rrf: {
      retrievers,
      rank_window_size: 50,
      rank_constant: 60,
    },
  };
}

export function explainMode(
  mode: QueryMode,
  score: number,
  matchedQueries: string[],
  highlights: string[],
  docTags: string[],
  interests: string[],
  retriever: string,
): {
  engine: "elasticsearch";
  mode: RankEngineMode;
  score: number;
  rank: "must" | "maybe" | "meh";
  matchedQueries: string[];
  matchedTags: string[];
  highlights: string[];
  why: string;
  retriever: string;
} {
  const matchedTags = docTags.filter((tag) =>
    interests.some((interest) => interest.toLowerCase() === tag.toLowerCase()),
  );
  const rank = classify(score, matchedTags.length);
  const bits: string[] = [`ES ${mode} ${score.toFixed(1)}`];
  if (retriever === "rrf") bits.push("RRF of BM25 + kNN");
  if (matchedTags.length) bits.push(`tag overlap ${matchedTags.join(", ")}`);
  if (matchedQueries.includes("bm25_keyword")) bits.push("BM25 keyword");
  if (matchedQueries.includes("semantic_knn") || mode !== "keyword") {
    if (mode !== "keyword") bits.push("kNN cosine on dense_vector (abstract + tags)");
  }
  if (matchedQueries.some((q) => q.startsWith("role"))) bits.push("role field");
  if (highlights[0]) bits.push(`matched “${plainHighlight(highlights[0])}”`);
  return {
    engine: "elasticsearch",
    mode: engineModeFor(mode),
    score,
    rank,
    matchedQueries,
    matchedTags,
    highlights: highlights.map(plainHighlight),
    why: bits.join(" · "),
    retriever,
  };
}

export function plainHighlight(html: string): string {
  return html.replace(/<\/?em>/gi, "").replace(/\s+/g, " ").trim();
}

export function matchedFieldsFromHighlight(highlight: Record<string, string[]>): string[] {
  return Object.keys(highlight).filter((key) => (highlight[key] ?? []).length > 0);
}

function classify(score: number, tagCount: number): "must" | "maybe" | "meh" {
  if (tagCount >= 3 || score >= 16) return "must";
  if (tagCount >= 1 || score >= 8) return "maybe";
  return "meh";
}
