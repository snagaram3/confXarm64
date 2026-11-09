# confXarm64 Jina semantic search workflow

This YAML is the in-repo representation of a Kibana Workflow. Saving it in the
live Kibana project (`platform.workflows.*`) is a separate operator step; the
file exists so Workflows are reviewable as code.

## What it searches

- Index: `confxarm64-jina-demo`
- Query: `semantic` on field `body`
- `body` is mapped as `semantic_text` with `inference_id: confxarm64-jina-embeddings`
  (Elastic Inference Service `jina-embeddings-v5-text-small`, 1024-dim, cosine)

The workflow is manual. Default input `query` is `Jina embeddings`, which is the
connection-test phrase already verified against this index.

Optional rerank for planner recommendations uses a different named endpoint,
`confxarm64-jina-rerank` (`jina-reranker-v3.5`), from the Node API — not this
workflow.

Do not put API keys in this directory.
