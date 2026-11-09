# Elastic Cloud, Jina, Workflows

Public identifiers for the team's Elastic Cloud Serverless project. This is a
separate path from the in-cluster Elasticsearch that ranks the planner catalog.

| In-cluster (live demo) | Elastic Cloud (Jina + Workflows) |
| --- | --- |
| `http://elasticsearch:9200` | `https://confxarm64-f141cd.es.us-central1.gcp.elastic.cloud` |
| Cluster name `floorwise` | Project alias `confxarm64-f141cd` |
| Index `floorwise` | Demo index `confxarm64-jina-demo` |
| 48-dim local token vectors | `confxarm64-jina-embeddings` (jina-embeddings-v5-text-small, 1024-dim, cosine) |

Do **not** wipe, reseed, or retarget the in-cluster `floorwise` cluster. Cloud is
additional official capability.

## Secrets

The Elasticsearch/Kibana API key is **not** in this folder. Patch it into
Kubernetes Secret `confxarm64-secrets` as `ELASTIC_CLOUD_API_KEY` (same pattern
as `DASH0_AUTH_TOKEN`). Locally, set that name in gitignored `.env`.

Without the key, `/api/rank` still uses in-cluster hybrid search, and Tools →
Elasticsearch shows Elastic Cloud as **Needs setup**. The app does not invent
Jina hits.

## Files

- `cloud.json` — public URLs, project alias, named inference ids
- `workflows/confxarm64-jina-semantic-search.yaml` — Kibana Workflow as code
