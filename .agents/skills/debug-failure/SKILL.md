---
name: debug-failure
description: Find the root cause of a failure in the confxarm64 CNH cluster and fix it in git.
---

# Debug a failure, fix it in git

Work from Radar evidence, name the cause, then change the GitHub repo. Argo CD reverts direct edits to resources it owns. Never commit kubeconfigs or tokens.

Namespace `team-confxarm64`. Cluster name `confxarm64`. Workloads: `web`, `api`, `elasticsearch`, Service `app` port 80. Helm: `infra/charts/confxarm64`.

**Pass `cluster` and `namespace` to every Radar MCP call.** If MCP is 403, stop and report; do not invent results.

## 1. Stop the damage

Plain Deployment broken after a push: `git revert` the bad commit and push. Don't use `manage_gitops` rollback: auto-sync puts `main` back.

## 2. Gather evidence

1. `issues` for the namespace.
2. `get_changes` `since: 1h`.
3. `diagnose` the failing workload (`web`, `api`, `elasticsearch`, or Application `app`).

## 3. Common causes

| Symptom | Usual cause | Fix |
| --- | --- | --- |
| `ImagePullBackOff`, 401/403 | GHCR package private | Person: Packages → Public. Images are `ghcr.io/snagaram3/confxarm64` and `ghcr.io/snagaram3/confxarm64-api` (lowercase). |
| `ImagePullBackOff`, not found | Action failed | `gh run view --log-failed` |
| `OOMKilled` | over `limits.memory` | Lower usage or raise limit in `values-cnh.yaml` without exceeding 8Gi total limits |
| Ready 0/N web | `/healthz` on 8080 failing | nginx in `docker/web.Dockerfile` |
| Ready 0/N api | `/api/health` or Elasticsearch not yellow | `ELASTICSEARCH_URL=http://elasticsearch:9200`, cluster name `floorwise` |
| Pod `Pending`, `exceeded quota: team-quota` | over 2 CPU / 4Gi req, 4 CPU / 8Gi lim, 4 PVCs / 20Gi | Lower requests in `values-cnh.yaml` |
| Pod `Pending`, other `SyncError` | privileged / hostPath / hostNetwork / hostPID | Drop that setting |
| URL 404 or 503, pods healthy | Service `app` missing, not port 80, or selector not `web` | `templates/app-service.yaml`; `appService.enabled: true` in `values-cnh.yaml` |

## 4. Fix, ship, confirm

Smallest git change, then the `ship` skill through `/healthz` and the planner homepage.

## Don't

- Don't rank in the browser or revert Home to a 3D map.
- Don't invent Dash0/Radar/Sonar live data while debugging Tools tabs.
