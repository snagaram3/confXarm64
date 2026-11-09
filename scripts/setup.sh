#!/usr/bin/env bash
# Point this repo at the CNH team and this GitHub remote.
#   ./scripts/setup.sh confxarm64
# Team, namespace, and live URL are already wired. This script fills any leftover
# OWNER/REPO placeholders and prints the GHCR names (must be lowercase).
set -euo pipefail

team="${1:-confxarm64}"
if [[ "$team" != "confxarm64" ]]; then
  echo "This product ships as team confxarm64 (namespace team-confxarm64)." >&2
  echo "usage: $0 confxarm64" >&2
  exit 1
fi

remote="$(git remote get-url origin 2>/dev/null || true)"
repo="$(printf '%s' "$remote" | sed -E 's#.*github.com[:/]##; s#\.git$##')"
if [[ ! "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "Couldn't read the GitHub repo from origin (got: ${remote:-nothing})." >&2
  echo "Clone https://github.com/snagaram3/confXarm64.git and run this inside it." >&2
  exit 1
fi
repo_lower="$(printf '%s' "$repo" | tr '[:upper:]' '[:lower:]')"

files=$(grep -rl -e OWNER/REPO infra AGENTS.md 2>/dev/null || true)
for f in $files; do
  if [[ "$f" == *values-images.yaml ]]; then
    continue
  fi
  sed -i.bak -e "s#ghcr.io/OWNER/REPO#ghcr.io/${repo_lower}#g" \
             -e "s#OWNER/REPO#${repo}#g" \
             -e "s#__TEAM__#${team}#g" "$f"
  rm -f "$f.bak"
done

cat <<EOF
Done. Cluster ${team} in Radar Cloud, namespace team-${team},
URL https://${team}.cnh.radarhq.io, Service app port 80.

GitHub (forge of record): https://github.com/${repo}.git
GHCR (lowercase): ghcr.io/${repo_lower} (web) and ghcr.io/${repo_lower}-api (api)

Next:
  1. git commit (if this script changed files) && git pull --rebase && git push
     The GitHub Action builds images and writes infra/charts/confxarm64/values-images.yaml.
     Wait for it to go green (Actions tab).
  2. Make both GHCR packages Public (repo → Packages → Package settings) if they are Private.
  3. Connect Radar MCP, pick Cloud Native Hackathon, then apply infra/argocd/application.yaml
     only if list_clusters shows confxarm64. HTTP 403: ask the Radar table to add your email.
  4. Connect Gitar while signed in via Settings → Configuration (not Marketplace while signed out):
     https://docs.gitar.ai/connecting-code/github
EOF
