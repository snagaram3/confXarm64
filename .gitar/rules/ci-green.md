# Keep CI green

When a pull request's GitHub Actions `CI` workflow fails on `npm test` or `npm run build`, Gitar should diagnose the logs and propose a minimal fix on the PR branch.

Do not add SonarQube, SonarCloud, or `SONAR_TOKEN` jobs while repairing CI.
Do not revert the homepage to a 3D map.
Do not replace Elasticsearch ranking with in-memory scoring.
