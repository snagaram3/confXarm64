# confXarm64 infra

Single home for cluster, deploy, and sponsor-tool bootstrap. Product: **confXarm64** (app catalog/code still uses the existing Floorwise identifiers where changing them would break Elasticsearch or localStorage).

```bash
./infra/bootstrap.sh --print-plan   # always safe; no cluster required
./infra/bootstrap.sh                # apply Helm to the CNH cluster
```

Do **not** `docker compose down -v`. Do **not** wipe `floorwise_esdata` or a laptop Compose ES on **:19200**. Do **not** commit kubeconfigs, `rhc_` tokens, or Dash0/Sonar secrets. Tools tabs stay honest (needs setup / connected / empty / error).

## Layout

| Path | What |
| --- | --- |
| `infra/bootstrap.sh` | Entrypoint. CNH cluster is default. |
| `infra/charts/confxarm64` | Helm chart (source of truth for the app + in-cluster ES). |
| `infra/charts/confxarm64/values-cnh.yaml` | CNH sizing + Service `app` port 80. |
| `infra/argocd/application.yaml` | Argo CD Application (needs a public GitHub repo URL). |
| `infra/overlays/local/` | Values for optional local Radar / Dash0 operator / SonarQube charts. |
| `infra/local-minikube.sh` | **Secondary** minikube fallback. |
| `infra/sonar-scan.sh` | Local / in-cluster Sonar scan (token required). |
| `.gitar/review/README.md` | Gitar (Sonar) review brief. |
| `.github/workflows/ci.yml` | GitHub Actions only — GitHub requires this path. |

There is no second copy of the Kubernetes manifests. `helm template` is the kubectl-apply path:

```bash
helm template confxarm64 infra/charts/confxarm64 \
  -n team-confxarm64 \
  -f infra/charts/confxarm64/values.yaml \
  -f infra/charts/confxarm64/values-cnh.yaml
```

Thin wrappers `scripts/minikube-up.sh` and `scripts/sonar-scan.sh` only exec the infra scripts so old commands still work.

## 1. Radar — CNH cluster (primary)

The team **already exists**. Do not create another team name. Do not treat minikube as the judged path.

| | |
| --- | --- |
| Team slug | `confxarm64` |
| Namespace | `team-confxarm64` |
| URL | https://confxarm64.cnh.radarhq.io |
| Starter | https://github.com/skyhook-io/cnh-starter (`./scripts/setup.sh confxarm64` in that template; we ship our own chart instead of their `app/`) |
| MCP | https://api.radarhq.io/mcp — pick **Cloud Native Hackathon** |
| Budget | 2 CPU / 4 GiB requests, 4 CPU / 8 GiB limits, 4 PVCs / 20 GiB |
| Refused | privileged, hostNetwork, hostPath, hostPID |

The platform routes `https://confxarm64.cnh.radarhq.io` to **Service `app` port 80** in `team-confxarm64`. The chart enables that Service via `values-cnh.yaml`. Radar itself is already installed on the cluster — **do not** `helm upgrade --install radar skyhook/radar` there.

Connect an agent: Radar Cloud → Agents, or `claude mcp add --scope user radar-cloud --transport http https://api.radarhq.io/mcp`, then authenticate and pick Cloud Native Hackathon. Ship through Radar MCP (apply `infra/argocd/application.yaml` once the public GitHub repo exists).

kubectl: copy Secret `kubeconfig` in namespace `default`, key `config`, to a file **outside this repo**. Token lasts ~12–24 hours. Never commit it.

```bash
export KUBECONFIG=~/cnh-kubeconfig
./infra/bootstrap.sh
```

Push images to a public registry the cluster can pull, then:

```bash
IMAGE_API=ghcr.io/OWNER/REPO/confxarm64-api:TAG \
IMAGE_WEB=ghcr.io/OWNER/REPO/confxarm64-web:TAG \
./infra/bootstrap.sh
```

This Origin repository cannot run GitHub Actions or host Argo CD's repo URL. Replace `OWNER/REPO` in `infra/argocd/application.yaml` after you create a **public** GitHub mirror.

Tools → Radar shows `RADAR_UI_URL` (`https://confxarm64.cnh.radarhq.io`) as **Skyhook Radar**, labeled separately from the optional `api.radar.io` geofence adapter.

### Optional local fallback

Only if the CNH cluster is unavailable. Uses your own Radar Cloud org, not Cloud Native Hackathon.

```bash
./infra/bootstrap.sh --local
# or: ./infra/local-minikube.sh
```

kind / k3d: load images, then `helm upgrade --install confxarm64 infra/charts/confxarm64 -n confxarm64 --create-namespace`.

## 2. Dash0

Official operator only: [install docs](https://www.dash0.com/docs/dash0/monitoring/kubernetes/dash0-operator/installation).

- gRPC ingest: `ingress.<region>.aws.dash0.com:4317` (always starts with `ingress.` and ends `dash0.com:4317`)
- App HTTP ingest: `OTEL_EXPORTER_OTLP_ENDPOINT=https://ingress.<region>.aws.dash0.com`
- Query: `DASH0_API_BASE_URL` + `DASH0_AUTH_TOKEN` (no `Bearer ` in the token)
- Dashboard link: `https://app.dash0.com` only when query creds exist. Floorwise/confXarm64 `/tools/dash0` is this app's Tools tab, not a self-hosted Dash0.

On CNH the operator is **off by default** (budget). Wire app env through Helm values/secrets. Export stays disabled until Secret `dash0-system/dash0-auth` key `token` exists:

```bash
./infra/bootstrap.sh --with-dash0-operator
```

`FLOORWISE_SYNTHETIC_OTEL` stays `0` unless you intend demo gauges. Tools → Dash0 is needs-setup without credentials — never a fake live dashboard.

## 3. Gitar / Sonar

Two related things, kept distinct:

1. **Tools → Sonar** talks to `SONAR_HOST_URL`. Honest adapter states. Never invent a quality gate.
2. **Gitar (Sonar)** Never Merge Broken: [`.gitar/review/README.md`](../.gitar/review/README.md). CI: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (tests + `SonarSource/sonarqube-scan-action@v5` against `SONAR_HOST_URL` / `SONAR_TOKEN` secrets).

**Origin will not execute GitHub Actions.** A public GitHub repository is required for Gitar and Actions. The path that works immediately:

```bash
npm test && npm run build
./infra/sonar-scan.sh    # refuses to upload without SONAR_TOKEN
```

Do not install the SonarQube Helm chart on CNH (it will not fit the quota). Use SonarCloud (`https://sonarcloud.io`) or a server you already operate. Local minikube `--with-sonar` is optional and heavy.

## 4. Elasticsearch

In-cluster: `http://elasticsearch:9200`, cluster name **`floorwise`**, one PVC (4Gi of the 20Gi CNH cap). Seed Job rebuilds the `floorwise` index on first Helm install — do not re-run it against a live demo.

Laptop Compose: project `-p floorwise`, host **:19200**, volume `floorwise_esdata`. Leave it alone. A red cluster on host `:9200` is a different process.

The API does not invent rank hits. Tools → Elasticsearch shows the real cluster or needs-setup/error.

## Secrets (never commit)

Helm `lookup()` will not wipe `confxarm64-secrets` on upgrade.

| Secret | Keys |
| --- | --- |
| `team-confxarm64/confxarm64-secrets` | `DASH0_AUTH_TOKEN`, `OTEL_EXPORTER_OTLP_HEADERS`, `SONAR_TOKEN`, optional `RADAR_SECRET_KEY` / `RADAR_PUBLISHABLE_KEY` |
| `dash0-system/dash0-auth` | `token` plus env `DASH0_OTLP_GRPC_ENDPOINT`, `DASH0_API_ENDPOINT`, `DASH0_OTLP_HTTP_ENDPOINT` |

Then `kubectl -n team-confxarm64 rollout restart deploy/api`.

## Sponsor portal (local)

Gitignored keys. Skip if they already exist:

```bash
npm run sponsor:provision -- <exhibitor-id>
npm run vapid:provision
```

## Judge URLs (CNH)

- App / planner: https://confxarm64.cnh.radarhq.io/
- Tools → Dash0: https://confxarm64.cnh.radarhq.io/tools/dash0
- Tools → Radar: https://confxarm64.cnh.radarhq.io/tools/radar
- Tools → Sonar: https://confxarm64.cnh.radarhq.io/tools/sonar
- Dash0 product: https://app.dash0.com
- Radar Cloud: https://confxarm64.cnh.radarhq.io
