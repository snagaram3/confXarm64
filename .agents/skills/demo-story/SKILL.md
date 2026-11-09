---
name: demo-story
description: Write the team's 5:30 demo story from Radar for confXarm64.
---

# The 5:30 story

The judges look for: the project running on Kubernetes with Radar connected, Radar used throughout, an AI investigation, and something that makes conferences easier. confXarm64 is a planner-first KubeCon trip companion; Elasticsearch ranks sessions.

Team `confxarm64`. Call `list_clusters` and use the `id` named exactly `confxarm64`. If Radar MCP is 403, say so and do not invent a story from live data.

1. **What happened.** `get_changes` namespace `team-confxarm64`, `since` covering the day. `git log` on GitHub `main`; bot `deploy:` commits only mark builds.
2. **Checks after.** `get_cluster_audit` for `team-confxarm64`. Compare with `STORY.md` `## Before` if present.
3. **The investigation.** Ask which one they ran. Link `https://app.radarhq.io/c/<cluster-id>/investigations`.
4. **Write it.** Add `## The story` to `STORY.md` only if they ask you to commit: planner, GitOps (push → GHCR → Argo CD), what Radar showed, investigation, Checks.
5. **Screenshots:** timeline; Application `app`; Checks for `team-confxarm64`; live URL https://confxarm64.cnh.radarhq.io (planner, not a 3D map home).

Ask before committing `STORY.md`.
