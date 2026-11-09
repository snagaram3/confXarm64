---
name: get-started
description: Get this person set up for the hackathon on confXarm64, from GitHub GitOps to the planner live through Radar. Use when they ask to get set up or what to do first.
---

# Get set up for the hackathon

Product: **confXarm64** planner (not the CNH starter sample app). Team `confxarm64`, namespace `team-confxarm64`, URL https://confxarm64.cnh.radarhq.io. Forge of record: https://github.com/snagaram3/confXarm64.git.

Check first, then set up. Keep replies short. At a check that fails, say what to do, and wait.

## Check (read only)

1. **Team.** Already `confxarm64`. Helm chart `infra/charts/confxarm64`. Argo CD `infra/argocd/application.yaml` must point at this GitHub repo, `targetRevision: main`.

2. **Radar connected?** If you have no Radar tools, or a call says the server needs authentication, the person signs in.
   - Claude Code: `claude mcp add --scope user radar-cloud --transport http https://api.radarhq.io/mcp`, then Authenticate, pick **Cloud Native Hackathon**.
   - Other agents: Radar Cloud → Agents.

   Sign in with an email the team listed. HTTP 403: that email is not on the CNH org / team yet. Send them to the Radar table. Do not invent cluster state.

3. **Cluster found?** `list_clusters`, name exactly `confxarm64`. If missing and so is `cnh`, they picked the wrong organization. If `cnh` is there but `confxarm64` isn't, check spelling and `https://join.cnh.radarhq.io/status/confxarm64`.

4. **Readable?** `list_resources` kind `deployments`, namespace `team-confxarm64`. Access can lag a minute after sign-up.

## Set up (ask once, then run it through)

Say what's left and ask once: "Shall I set it up? I'll push to GitHub and deploy through Radar if the cluster is visible."

1. If origin is this GitHub repo, `./scripts/setup.sh confxarm64` is optional confirmation. Push to `main` if files changed.
2. Follow the `ship` skill from step 0: wait for `build-and-deploy`, apply `infra/argocd/application.yaml` **only if Radar can see the cluster**, sync, wait for `web` and `api` pods, check `/healthz` and the planner homepage.
3. Record Checks "before" with `get_cluster_audit` namespace `team-confxarm64` if Radar works. Write `STORY.md` only if they want the 5:30 log.

Connect Gitar separately (you cannot install the GitHub App interactively): the person signs into Gitar, then Settings → Configuration → Connect GitHub, grant `snagaram3/confXarm64`. Do not fake an install. https://docs.gitar.ai/connecting-code/github

## The day

- **Before:** screenshot Radar Cloud → cluster `confxarm64` → Checks, namespace `team-confxarm64`.
- **Build** the planner. Ship with the `ship` skill. Elasticsearch stays the ranking brain. Homepage stays planner-first.
- **One AI investigation** (judges look for it).
- **By 5:30:** `demo-story` skill.

Do not use minikube as the primary path. Do not add SonarQube CI.
