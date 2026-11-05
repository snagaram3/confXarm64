import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dataDir } from "../server/leads-store.ts";
import { provisionSponsor, secretFilePath } from "../server/sponsor-auth.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(readFileSync(resolve(root, "src/data/catalog.json"), "utf8")) as {
  booths: Array<{ id: string }>;
};

const args = process.argv.slice(2).filter((a) => a !== "--");
const rotate = args.includes("--rotate");
const sponsorId = args.find((a) => !a.startsWith("-"));

if (!sponsorId) {
  console.error("Usage: npm run sponsor:provision -- <exhibitor-id> [--rotate]");
  console.error(`Known ids: ${catalog.booths.map((b) => b.id).join(", ")}`);
  process.exit(1);
}

if (!catalog.booths.some((b) => b.id === sponsorId)) {
  console.error(`Unknown exhibitor id: ${sponsorId}`);
  process.exit(1);
}

const dir = dataDir(root);
const result = provisionSponsor(dir, sponsorId, { rotate });
if (!result.created) {
  console.log(`Already provisioned for ${sponsorId}. Pass --rotate to replace.`);
  console.log(`Secret file (gitignored): ${secretFilePath(dir, sponsorId)}`);
  process.exit(0);
}
console.log(`Provisioned ${sponsorId}.`);
console.log(`Secret written to gitignored file: ${result.secretPath}`);
console.log("Open that file locally. It is not printed here.");
