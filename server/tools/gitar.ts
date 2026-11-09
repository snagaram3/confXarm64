import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REPO = "snagaram3/confXarm64";
const REPO_URL = `https://github.com/${REPO}`;
const PULLS_URL = `${REPO_URL}/pulls`;
const CONNECT_URL = "https://docs.gitar.ai/connecting-code/github";

const TRACKED_FILES = [
  ".gitar.md",
  ".gitar/review/README.md",
  ".gitar/review/demo-integrity.md",
  ".gitar/config/apply.md",
  ".gitar/instructions/product.md",
  ".gitar/rules/ci-green.md",
  ".github/workflows/ci.yml",
] as const;

export type GitarSnapshot = {
  tool: "gitar";
  state: "not_configured" | "ok" | "error" | "empty";
  configured: boolean;
  fetchedAt: string | null;
  source: string;
  window: string | null;
  error: string | null;
  missingEnv: string[];
  repo: string;
  repoUrl: string;
  pullsUrl: string;
  connectUrl: string;
  files: Array<{ path: string; present: boolean }>;
  autoApply: { how: string; note: string };
  ci: { workflow: string; jobs: string; note: string };
  notice: string;
};

function filePresent(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}

export function gitarStatus(): GitarSnapshot {
  const files = TRACKED_FILES.map((path) => ({ path, present: filePresent(path) }));
  const reviewReady = files.find((f) => f.path === ".gitar/review/README.md")?.present === true;
  const applyReady = files.find((f) => f.path === ".gitar/config/apply.md")?.present === true;
  const configured = reviewReady && applyReady;
  return {
    tool: "gitar",
    state: configured ? "ok" : "empty",
    configured,
    fetchedAt: new Date().toISOString(),
    source: "Repo-side Gitar config (.gitar/) — this process does not call a Gitar API",
    window: `review instructions committed on ${REPO}`,
    error: configured
      ? null
      : "Gitar review files are missing from this checkout. This pane does not invent a GitHub App install or review scores.",
    missingEnv: [],
    repo: REPO,
    repoUrl: REPO_URL,
    pullsUrl: PULLS_URL,
    connectUrl: CONNECT_URL,
    files,
    autoApply: {
      how: "On a pull request, comment `gitar auto-apply:on` or add the `gitar-managed` label.",
      note: "Saving .gitar/config/apply.md does not turn auto-apply on. Connecting the GitHub App is a human step.",
    },
    ci: {
      workflow: ".github/workflows/ci.yml",
      jobs: "npm test and npm run build",
      note: "Gitar diagnoses those GitHub Actions jobs. This app does not add Sonar CI.",
    },
    notice:
      "Gitar reviews pull requests on this GitHub repo. This pane lists committed review instructions and real URLs. It does not invent review scores, open PR lists, quality gates, or a GitHub App install status.",
  };
}
