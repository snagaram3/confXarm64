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
| `infra/argocd/application.yaml` | Argo CD Application pointing at this GitHub repo. |
| `infra/charts/confxarm64/values-images.yaml` | GHCR tags owned by the `build-and-deploy` Action. |
| `infra/overlays/local/` | Values for optional local Radar / Dash0 operator / SonarQube charts. |
| `infra/local-minikube.sh` | **Secondary** minikube fallback. |
| `.gitar/review/` | Gitar-only review brief (Never Merge Broken). |
| `.gitar/config/apply.md` | Gitar auto-apply criteria. |
| `.github/workflows/ci.yml` | `npm test` + `npm run build` (no Sonar). |
| `.github/workflows/deploy.yaml` | Build web/api images and push lowercase GHCR. |

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
IMAGE_API=ghcr.io/snagaram3/confxarm64-api:TAG \
IMAGE_WEB=ghcr.io/snagaram3/confxarm64:TAG \
./infra/bootstrap.sh
```

GitHub https://github.com/snagaram3/confXarm64.git is the forge of record. Pushing to `main` runs `.github/workflows/deploy.yaml`, which tags `ghcr.io/snagaram3/confxarm64` (web) and `ghcr.io/snagaram3/confxarm64-api` (lowercase — GHCR rejects `confXarm64`). Make both packages **Public** after the first build. Apply `infra/argocd/application.yaml` through Radar MCP only if cluster `confxarm64` is visible; HTTP 403 means the Radar table still needs your email.

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

## 3. Gitar (Never Merge Broken)

Gitar is the review/auto-apply track. It is **not** SonarQube.

- Instructions: [`.gitar/review/`](../.gitar/review/)
- Auto-apply criteria: [`.gitar/config/apply.md`](../.gitar/config/apply.md)
- CI: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — `npm test` and `npm run build` only. Do not add Sonar jobs.

Connect Gitar while signed in via **Settings → Configuration** (not GitHub Marketplace while signed out): https://docs.gitar.ai/connecting-code/github — grant `snagaram3/confXarm64`, then `gitar auto-apply:on` or the `gitar-managed` label.

**Tools → Sonar** in the app is a separate optional adapter (`SONAR_HOST_URL`). Honest states only. Never invent a quality gate. Do not install the SonarQube Helm chart on CNH (it will not fit the quota). Local `./infra/sonar-scan.sh` still refuses to upload without a token you supply; it is not CI.

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
