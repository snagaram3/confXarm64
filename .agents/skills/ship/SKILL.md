---
name: ship
description: Deploy a change to the confxarm64 CNH cluster and confirm it is live. Use after editing the planner, Helm chart, or Argo CD app, when asked to ship, deploy, release or push a change.
---

# Ship a change and prove it's live

Deploys are GitOps on **GitHub** https://github.com/snagaram3/confXarm64.git: push to `main`, the `build-and-deploy` Action builds `docker/web.Dockerfile` and `docker/api.Dockerfile`, pushes lowercase GHCR images, and commits tags into `infra/charts/confxarm64/values-images.yaml`. Argo CD syncs Helm chart `infra/charts/confxarm64`. A push is not a deploy. You're done only when the planner answers at https://confxarm64.cnh.radarhq.io.

Radar Cloud cluster name: `confxarm64`. Namespace: `team-confxarm64`. Argo CD Application: `app` in that namespace. Service `app` port 80 must remain.

**Every Radar MCP call takes `cluster` and `namespace: team-confxarm64`.** Call `list_clusters` once, take the `id` whose `name` is exactly `confxarm64`. If Radar MCP is missing or HTTP 403, do not invent results and do not apply the Application.

## 0. First time only

Skip if `get_resource` (kind `Application`, group `argoproj.io`, name `app`, namespace `team-confxarm64`) finds the Application.

1. Confirm `infra/argocd/application.yaml` repoURL is `https://github.com/snagaram3/confXarm64.git` and `targetRevision: main`.
2. Push (step 1) and wait for the first build (step 2).
3. GHCR packages must be public. New pods that pull and run prove it.
4. Apply `infra/argocd/application.yaml` with `apply_resource` (with `cluster`) **only if** you can list this team's cluster. Keep app manifests in GitOps.

## 1. Push

Commit and push to GitHub `main`. Note the full commit SHA and seven-character image tag.

The Action skips pushes that change only Markdown and/or `infra/charts/confxarm64/values-images.yaml`.

## 2. Wait for the build, then pull its deploy commit

`gh run list --workflow build-and-deploy --commit <full-sha>`, then `gh run watch <id> --exit-status`. If the run failed, read logs, fix, push again.

**Then pull.** `git pull --rebase` so you have the bot's `deploy: <sha> [skip ci]` commit.

## 3. Sync

Call `manage_gitops` with `cluster`, `tool: argocd`, `action: sync`, `namespace: team-confxarm64`, `name: app`.

Then `get_resource` on the Application: `status.sync.revision` equals `origin/main`; health `Healthy` or `Progressing`.

## 4. Wait for the rollout

Confirm live Deployment `web` image matches `image.web` in remote `values-images.yaml`, and Deployment `api` matches `image.api`. Call `wait_for` for `kind: deployment` names `web` and `api`, up to about 5 minutes.

`ImagePullBackOff`: the person makes GHCR public (Packages → Package settings → Change visibility → Public). You can't do this for them.

A pod `Pending` with Warning `SyncError` `exceeded quota: team-quota` is over the budget (2 CPU / 4Gi requests, 4 CPU / 8Gi limits, 4 PVCs / 20Gi). Privileged / hostPath / hostNetwork / hostPID are refused.

## 5. Verify from outside

`curl -sS https://confxarm64.cnh.radarhq.io/healthz` should be `ok`. The HTML at `/` is the **trip planner**, not a 3D map as the primary experience, and not the CNH starter sample `version <sha>` page.

If anything is red, switch to the `debug-failure` skill.

## Don't

- Don't call a Radar tool without `cluster`.
- Don't apply Argo CD-owned app manifests with `apply_resource`.
- Don't hand-edit tags in `values-images.yaml`; the Action owns them.
- Don't report "deployed" after the push. Report what step 5 showed.
- Don't use minikube as the judged path.
