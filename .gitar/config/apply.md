# Auto-apply criteria for snagaram3/confXarm64

Gitar may auto-apply only safe, mechanical fixes. Saving this file does not turn auto-apply on; a PR still needs `gitar auto-apply:on` or the `gitar-managed` label.

## Apply

- Unused imports, unused variables, and obvious typos in comments.
- Formatting and lint nits that do not change behavior.
- CI breakage in `.github/workflows/ci.yml` that restores `npm test` / `npm run build` without adding new jobs.
- TypeScript types that match existing behavior.
- Helm YAML indentation that does not change probes, images, or Service `app`.

## Skip

- Secrets, `.env`, kubeconfigs, tokens (`rhc_*`, Dash0, `SONAR_TOKEN`, VAPID, sponsor credentials).
- Authentication, consent checkboxes, and sponsor-portal tenant isolation.
- Ranking / Elasticsearch query paths (`server/` rank handlers, `src/lib/ranking.ts` used as more than labels).
- Homepage routing that would make a 3D map the primary experience.
- Demo-integrity files: `docs/DEMO.md`, `.gitar/review/demo-integrity.md`, official catalog/seed data, SAMPLE 255 wayfinding.
- Adding SonarQube / SonarCloud / `SONAR_TOKEN` CI.
- Privileged, hostPath, hostNetwork, hostPID, or budget-breaking resource bumps.
- GHCR image tag edits in `infra/charts/confxarm64/values-images.yaml` (the deploy Action owns those).
- AuthZ, payments, or any new network destination.

The fixer cannot run shell commands or tests; do not require "tests pass" as a condition for applying a patch.
