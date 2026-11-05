import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dataDir } from "../server/leads-store.ts";
import { provisionVapid } from "../server/vapid.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = provisionVapid(dataDir(root));
if (!result.created) {
  console.log("VAPID already provisioned.");
  console.log(`Gitignored file: ${result.path}`);
  process.exit(0);
}
console.log("Provisioned VAPID keys for local Web Push.");
console.log(`Gitignored file: ${result.path}`);
console.log("The private key is not printed. Restart the API after this.");
