# Notes for your coding agent

This repo is **confXarm64** (formerly Floorwise): a personalized KubeCon trip planner. Homepage is planner-first; the map is secondary. Elasticsearch (`floorwise` index, `POST /api/rank`) is the ranking brain. Do not replace this product with the CNH starter sample `app/`.

It deploys to this team's Kubernetes cluster at the Cloud Native Hackathon: a virtual cluster that Radar Cloud lists as **`confxarm64`**, where the team is cluster-admin. The app runs in namespace `team-confxarm64`. Public URL: https://confxarm64.cnh.radarhq.io — the platform routes that host to Service `app` port 80 in `team-confxarm64`. Use Radar Cloud's MCP server (`radar-cloud`) for everything you observe or change on the cluster. Read each tool's schema; don't invent parameters.

**Pass `cluster` on every Radar call.** The organization has about 40 team clusters plus `cnh`, the platform's cluster, where teams have no access. Call `list_clusters` once per session, take the `id` of the entry whose `name` is exactly `confxarm64`, and pass that id as `cluster` on every other Radar tool call. Pass `namespace: team-confxarm64` wherever a tool takes it, unless you mean another namespace in this cluster.

Deploys are GitOps: change the repo, push to `main` on https://github.com/snagaram3/confXarm64.git, and Argo CD syncs the namespace. The image-build Action (`.github/workflows/deploy.yaml`) pushes lowercase GHCR images `ghcr.io/snagaram3/confxarm64` (web) and `ghcr.io/snagaram3/confxarm64-api` (api) and commits tags into `infra/charts/confxarm64/values-images.yaml`. Helm chart path: `infra/charts/confxarm64` with `values.yaml` + `values-cnh.yaml` + `values-images.yaml`. Argo CD Application: `infra/argocd/application.yaml` (`app` in `team-confxarm64`).

**If Radar MCP returns HTTP 403 or has no tools,** the signed-in email is not yet on the Cloud Native Hackathon org / team `confxarm64`. Finish repo-side GitOps only. Do not invent live cluster results. Do not apply the Application. Do not commit kubeconfigs. Ask the person to have the Radar table add their email.

When the person asks you to ship, that is go-ahead to commit and push to GitHub `main` only after they want it live; integration work on a PR stays on the PR branch. Argo CD runs inside this cluster (namespace `argocd`) with no web UI; drive it with `manage_gitops`. Don't apply or patch app manifests on the cluster. Argo CD's self-heal puts the repo's version back. Apply `infra/argocd/application.yaml` once to start the sync, and only if you can actually list cluster `confxarm64`.

**Run shell commands one at a time, in plain form.** Avoid `$(…)`, `$?` or shell variables in a single command when the agent asks the person to approve them.

## When to do what

- **The person asks to get set up, or what to do first.** Follow the `get-started` skill.
- **First cluster access in a session.** Call `list_clusters`, find `confxarm64`, and read the workloads in `team-confxarm64` with its id. If you have no Radar tools, or they need authentication, the person connects and signs in. If no cluster is named `confxarm64`, they haven't accepted the Radar Cloud invite, or picked a different organization (no `cnh` in the list means another organization). Ask them to sign in again and pick **Cloud Native Hackathon** under "Organization access". Don't go on until you can read the namespace — unless MCP is 403, in which case stop and report that apply is blocked.
- **After every push to main.** Follow the `ship` skill: wait for `build-and-deploy`, pull the `deploy: <sha> [skip ci]` commit, sync Argo CD, confirm web/api images, then check https://confxarm64.cnh.radarhq.io (planner home, `/healthz`).
- **A deploy or the app fails.** Procedure: the `debug-failure` skill.
- **At 5:30, or when asked for the demo story.** The `demo-story` skill.

## Never

- Replace the planner with the CNH starter sample app, or make a 3D map the primary homepage.
- Move Must/Maybe/Meh scoring off Elasticsearch into in-memory JavaScript.
- Invent Dash0, Radar, Sonar, or telemetry live data. Tools tabs stay honest (needs setup / connected / empty / error).
- Invent official venue routes, indoor GPS, or live occupancy.
- Break things on purpose, or generate load you can't bound.
- Touch `cnh` or another team's cluster, or try to get around the host's limits (privileged, hostPath, hostNetwork or hostPID pods; the resource budget).
- Remove or reconfigure what came pre-installed: Argo CD, Argo Rollouts, Prometheus, the CloudNativePG operator, the metrics setup, the AppProject `team-confxarm64`, Secret `kubeconfig` in `default`, and Radar itself (namespace `radar`). Don't upgrade Radar.
- Write a kubeconfig or token into the repo, a commit, or your output. The repo is public. No `.env`, `rhc_*`, Dash0 tokens, or `SONAR_TOKEN` values in git.
- Add SonarQube, SonarCloud, SONAR_TOKEN CI jobs, or new sonar files. Gitar is the Never Merge Broken track. `npm test` and `npm run build` must stay green.
- Poll forever. After about 5 minutes, report what's blocking.

## Skills

`.agents/skills/` has `get-started`, `ship`, `debug-failure`, and `demo-story`. Claude Code and Codex load them as skills. If your agent doesn't, read the matching `SKILL.md` before that task.

## Limits

- Budget: one total across every namespace: 2 CPU and 4 GiB of requests, 4 CPU and 8 GiB of limits, 4 PVCs and 20 GiB of storage (default StorageClass gp3). A pod over the budget stays `Pending` with a `SyncError` event `exceeded quota: team-quota`.
- The host refuses privileged pods and pods with hostPath, hostNetwork or hostPID.
- Keep Service `app` port 80 in `team-confxarm64`. No LoadBalancer or NodePort.
- GHCR images must be public and lowercase: `ghcr.io/snagaram3/confxarm64` and `ghcr.io/snagaram3/confxarm64-api`.
- kubectl works only if the person copied the kubeconfig (Secret `default/kubeconfig`). Prefer Radar's tools. Do not use minikube as the primary path.
