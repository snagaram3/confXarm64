import type { estypes } from "@elastic/elasticsearch";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { es, INDEX } from "./es.ts";
import { noteRank } from "./tools/local-stats.ts";
import {
  boostedTopicNames,
  engineModeFor,
  explainMode,
  interestShould,
  kindFilter,
  keywordQuery,
  matchedFieldsFromHighlight,
  parseQueryMode,
  parseTopicWeights,
  queryVector,
  rrfRetriever,
  topicWeightShould,
  type QueryMode,
  type RankEngineMode,
} from "./search-query.ts";

export type Rank = "must" | "maybe" | "meh";
export type { QueryMode, RankEngineMode };
export { parseQueryMode };

export interface HitExplanation {
  engine: "elasticsearch";
  mode: RankEngineMode;
  score: number;
  rank: Rank;
  matchedQueries: string[];
  matchedTags: string[];
  highlights: string[];
  highlightHtml: string[];
  matchedFields: string[];
  why: string;
  retriever: string;
}

export interface RankHit {
  id: string;
  kind: string;
  /** Title + abstract + tags for Cloud Jina rerank. Not sent to the client. */
  rerankText?: string;
  explanation: HitExplanation;
}

export function rerankTextFromSource(src: {
  title?: string;
  abstract?: string;
  speaker?: string;
  tags?: string[];
}): string | undefined {
  const text = [src.title, src.abstract, src.speaker, ...(src.tags ?? [])]
    .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
    .join(" ")
    .slice(0, 2000);
  return text || undefined;
}

const HIGHLIGHT = {
  fields: {
    title: { number_of_fragments: 1, fragment_size: 120 },
    abstract: { number_of_fragments: 2, fragment_size: 160 },
    tags: { number_of_fragments: 4 },
  },
  pre_tags: ["<em>"],
  post_tags: ["</em>"],
};

export async function hybridSearch(opts: {
  kind: "session" | "booth" | "visitor";
  interests: string[];
  role?: string;
  q?: string;
  boothId?: string;
  track?: string;
  mode?: QueryMode;
  size?: number;
  topicWeights?: Record<string, number>;
}): Promise<{ hits: RankHit[]; took: number; mode: RankEngineMode; retriever: string }> {
  const tracer = trace.getTracer("confxarm64-search");
  const mode = parseQueryMode(opts.mode);
  return tracer.startActiveSpan("confxarm64.hybridSearch", async (span) => {
    span.setAttribute("confxarm64.search.kind", opts.kind);
    span.setAttribute("confxarm64.search.mode", mode);
    try {
      const result = await runSearch({ ...opts, mode });
      span.setAttribute("confxarm64.search.hits", result.hits.length);
      span.setAttribute("confxarm64.search.took_ms", result.took);
      span.setAttribute("confxarm64.search.retriever", result.retriever);
      const ctx = span.spanContext();
      noteRank(
        {
          tookMs: result.took,
          hitCount: result.hits.length,
          top: result.hits.slice(0, 5).map((h) => ({
            id: h.id,
            score: h.explanation.score,
            rank: h.explanation.rank,
          })),
          at: new Date().toISOString(),
        },
        ctx.traceId && ctx.traceId !== "00000000000000000000000000000000" ? ctx.traceId : null,
      );
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}

async function runSearch(opts: {
  kind: "session" | "booth" | "visitor";
  interests: string[];
  role?: string;
  q?: string;
  boothId?: string;
  track?: string;
  mode: QueryMode;
  size?: number;
  topicWeights?: Record<string, number>;
}): Promise<{ hits: RankHit[]; took: number; mode: RankEngineMode; retriever: string }> {
  const interests = opts.interests ?? [];
  const topicWeights = parseTopicWeights(opts.topicWeights);
  const textQuery = (opts.q ?? "").trim();
  const role = opts.role ?? "";
  const size = opts.size ?? (opts.kind === "session" ? 40 : 50);
  const filters = kindFilter(opts.kind, opts.boothId, opts.track);
  const qvec = queryVector(textQuery, role, [...interests, ...boostedTopicNames(topicWeights)]);
  const keyword = keywordQuery(textQuery) ?? keywordQuery([...interests, ...boostedTopicNames(topicWeights)].join(" "));

  if (opts.mode === "hybrid" && (textQuery || interests.length)) {
    try {
      const rrf = await searchRrf({ filters, keyword, qvec, size, mode: opts.mode, interests, topicWeights });
      if (rrf.hits.length) return rrf;
    } catch {
      /* mapping or license may reject retrievers — fall back */
    }
  }

  return searchFunctionScore({
    mode: opts.mode,
    filters,
    interests,
    topicWeights,
    textQuery,
    role,
    qvec,
    size,
  });
}

async function searchRrf(opts: {
  filters: estypes.QueryDslQueryContainer[];
  keyword: estypes.QueryDslQueryContainer | null;
  qvec: number[];
  size: number;
  mode: QueryMode;
  interests: string[];
  topicWeights: Record<string, number>;
}): Promise<{ hits: RankHit[]; took: number; mode: RankEngineMode; retriever: string }> {
  const response = await es.search({
    index: INDEX,
    size: opts.size,
    retriever: rrfRetriever({
      kind: "session",
      qvec: opts.qvec,
      keyword: opts.keyword,
      filters: opts.filters,
      extraShould: topicWeightShould(opts.topicWeights),
    }) as never,
    highlight: HIGHLIGHT,
  });
  return packHits(response, opts.mode, opts.interests, "rrf");
}

async function searchFunctionScore(opts: {
  mode: QueryMode;
  filters: estypes.QueryDslQueryContainer[];
  interests: string[];
  topicWeights: Record<string, number>;
  textQuery: string;
  role: string;
  qvec: number[];
  size: number;
}): Promise<{ hits: RankHit[]; took: number; mode: RankEngineMode; retriever: string }> {
  const should =
    opts.mode === "semantic"
      ? []
      : interestShould(opts.interests, opts.textQuery, opts.role, opts.topicWeights);
  const knnFn =
    opts.mode === "keyword"
      ? []
      : [
          {
            script_score: {
              script: {
                source:
                  "double knn = cosineSimilarity(params.qvec, 'embedding') + 1.0; return knn * 4.0;",
                params: { qvec: opts.qvec },
              },
            },
          },
        ];

  const query: estypes.QueryDslQueryContainer =
    opts.mode === "semantic"
      ? {
          function_score: {
            query: { bool: { filter: opts.filters } },
            functions: knnFn,
            score_mode: "sum",
            boost_mode: "replace",
          },
        }
      : opts.mode === "keyword"
        ? {
            bool: {
              filter: opts.filters,
              should,
              minimum_should_match: should.length ? 1 : 0,
            },
          }
        : {
            function_score: {
              query: { bool: { filter: opts.filters, should } },
              functions: knnFn,
              score_mode: "sum",
              boost_mode: "sum",
            },
          };

  const response = await es.search({
    index: INDEX,
    size: opts.size,
    query,
    highlight: HIGHLIGHT,
  });
  const retriever = opts.mode === "keyword" ? "standard" : opts.mode === "semantic" ? "knn" : "function_score";
  return packHits(response, opts.mode, opts.interests, retriever);
}

/** Named queries Elasticsearch actually returned. Do not stamp semantic_knn on every hybrid hit. */
export function reportedMatchedQueries(hit: { matched_queries?: string[] }): string[] {
  return [...(hit.matched_queries ?? [])];
}

function packHits(
  response: estypes.SearchResponse,
  mode: QueryMode,
  interests: string[],
  retriever: string,
): { hits: RankHit[]; took: number; mode: RankEngineMode; retriever: string } {
  const hits: RankHit[] = response.hits.hits.map((hit) => {
    const src = (hit._source ?? {}) as {
      id: string;
      kind: string;
      tags?: string[];
      title?: string;
      abstract?: string;
      speaker?: string;
    };
    const matchedQueries = reportedMatchedQueries(hit as { matched_queries?: string[] });
    const highlight = (hit.highlight ?? {}) as Record<string, string[]>;
    const highlightHtml = [
      ...(highlight.title ?? []),
      ...(highlight.abstract ?? []),
      ...(highlight.tags ?? []),
    ];
    const score = hit._score ?? 0;
    const explanation = explainMode(mode, score, matchedQueries, highlightHtml, src.tags ?? [], interests, retriever);
    return {
      id: src.id,
      kind: src.kind,
      rerankText: rerankTextFromSource(src),
      explanation: {
        ...explanation,
        highlightHtml,
        matchedFields: matchedFieldsFromHighlight(highlight),
      },
    };
  });
  hits.sort((a, b) => b.explanation.score - a.explanation.score);
  return {
    hits,
    took: response.took ?? 0,
    mode: engineModeFor(mode),
    retriever,
  };
}
