import type { estypes } from "@elastic/elasticsearch";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { embed } from "./embed.ts";
import { es, INDEX } from "./es.ts";
import { noteRank } from "./tools/local-stats.ts";

export type Rank = "must" | "maybe" | "meh";

export interface HitExplanation {
  engine: "elasticsearch";
  mode: "hybrid-bm25-knn";
  score: number;
  rank: Rank;
  matchedQueries: string[];
  matchedTags: string[];
  highlights: string[];
  why: string;
}

export interface RankHit {
  id: string;
  kind: string;
  explanation: HitExplanation;
}

function classify(score: number, tagCount: number): Rank {
  if (tagCount >= 3 || score >= 16) return "must";
  if (tagCount >= 1 || score >= 8) return "maybe";
  return "meh";
}

function namedQueries(interests: string[], textQuery: string, role: string) {
  const should: estypes.QueryDslQueryContainer[] = [];
  for (const tag of interests) {
    should.push({
      term: { "tags.raw": { value: tag, boost: 3.2, _name: `tag:${tag}` } },
    });
  }
  const keyword = [textQuery, ...interests].filter(Boolean).join(" ").trim();
  if (keyword) {
    should.push({
      multi_match: {
        query: keyword,
        fields: ["title^3", "abstract", "tags^2", "track", "speaker", "role"],
        fuzziness: "AUTO",
        _name: "bm25_keyword",
      },
    });
  }
  if (role) {
    should.push({
      match: { role: { query: role, _name: "role_boost", boost: 1.4 } },
    });
    should.push({
      match: { title: { query: role, _name: "role_in_title", boost: 0.8 } },
    });
  }
  return should;
}

function stripTags(html: string): string {
  return html.replace(/<\/?em>/g, "").replace(/\s+/g, " ").trim();
}

function explain(
  score: number,
  matchedQueries: string[],
  highlights: string[],
  docTags: string[],
  interests: string[],
): HitExplanation {
  const matchedTags = docTags.filter((tag) =>
    interests.some((interest) => interest.toLowerCase() === tag.toLowerCase()),
  );
  const rank = classify(score, matchedTags.length);
  const bits: string[] = [`ES hybrid ${score.toFixed(1)}`];
  if (matchedTags.length) bits.push(`tag overlap ${matchedTags.join(", ")}`);
  else if (matchedQueries.some((q) => q.startsWith("tag:"))) {
    bits.push(
      `named queries ${matchedQueries.filter((q) => q.startsWith("tag:")).join(", ")}`,
    );
  }
  if (matchedQueries.includes("bm25_keyword")) bits.push("BM25 keyword");
  if (matchedQueries.some((q) => q.startsWith("role"))) bits.push("role field");
  bits.push("kNN cosine on dense_vector");
  if (highlights[0]) bits.push(`matched “${highlights[0]}”`);
  return {
    engine: "elasticsearch",
    mode: "hybrid-bm25-knn",
    score,
    rank,
    matchedQueries,
    matchedTags,
    highlights,
    why: bits.join(" · "),
  };
}

export async function hybridSearch(opts: {
  kind: "session" | "booth" | "visitor";
  interests: string[];
  role?: string;
  q?: string;
  boothId?: string;
  size?: number;
}): Promise<{ hits: RankHit[]; took: number }> {
  const tracer = trace.getTracer("floorwise-search");
  return tracer.startActiveSpan("floorwise.hybridSearch", async (span) => {
    span.setAttribute("floorwise.search.kind", opts.kind);
    try {
      const result = await runHybridSearch(opts);
      span.setAttribute("floorwise.search.hits", result.hits.length);
      span.setAttribute("floorwise.search.took_ms", result.took);
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

async function runHybridSearch(opts: {
  kind: "session" | "booth" | "visitor";
  interests: string[];
  role?: string;
  q?: string;
  boothId?: string;
  size?: number;
}): Promise<{ hits: RankHit[]; took: number }> {
  const interests = opts.interests ?? [];
  const textQuery = (opts.q ?? "").trim();
  const role = opts.role ?? "";
  const qvec = embed([textQuery, role, ...interests]);
  const should = namedQueries(interests, textQuery, role);
  const size = opts.size ?? (opts.kind === "session" ? 40 : 50);

  const filters: estypes.QueryDslQueryContainer[] = [{ term: { kind: opts.kind } }];
  if (opts.boothId) filters.push({ term: { boothId: opts.boothId } });

  const response = await es.search({
    index: INDEX,
    size,
    query: {
      function_score: {
        query: {
          bool: {
            filter: filters,
            should,
          },
        },
        functions: [
          {
            script_score: {
              script: {
                source:
                  "double knn = cosineSimilarity(params.qvec, 'embedding') + 1.0; return knn * 4.0;",
                params: { qvec },
              },
            },
          },
        ],
        score_mode: "sum",
        boost_mode: "sum",
      },
    },
    highlight: {
      fields: {
        title: { number_of_fragments: 1, fragment_size: 120 },
        abstract: { number_of_fragments: 1, fragment_size: 140 },
        tags: { number_of_fragments: 4 },
      },
      pre_tags: ["<em>"],
      post_tags: ["</em>"],
    },
  });

  const hits: RankHit[] = response.hits.hits.map((hit) => {
    const src = (hit._source ?? {}) as {
      id: string;
      kind: string;
      tags?: string[];
    };
    const matchedQueries = ((hit as { matched_queries?: string[] }).matched_queries ??
      []) as string[];
    const highlight = (hit.highlight ?? {}) as Record<string, string[]>;
    const highlights = [
      ...(highlight.title ?? []),
      ...(highlight.abstract ?? []),
      ...(highlight.tags ?? []),
    ].map(stripTags);
    const score = hit._score ?? 0;
    return {
      id: src.id,
      kind: src.kind,
      explanation: explain(score, matchedQueries, highlights, src.tags ?? [], interests),
    };
  });

  hits.sort((a, b) => b.explanation.score - a.explanation.score);
  return { hits, took: response.took ?? 0 };
}
