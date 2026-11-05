import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export interface SponsorCredentialFile {
  version: 1;
  sponsors: Record<string, { kdf: "scrypt"; salt: string; hash: string; updatedAt: string }>;
}

export function credentialsPath(dir: string): string {
  return join(dir, "sponsor-credentials.json");
}

export function secretFilePath(dir: string, sponsorId: string): string {
  return join(dir, `sponsor-secret-${sponsorId}.txt`);
}

export function loadCredentials(dir: string): SponsorCredentialFile | null {
  const path = credentialsPath(dir);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as SponsorCredentialFile;
    if (parsed.version !== 1 || !parsed.sponsors || typeof parsed.sponsors !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isAuthConfigured(dir: string): boolean {
  const file = loadCredentials(dir);
  return Boolean(file && Object.keys(file.sponsors).length > 0);
}

export function verifySecret(dir: string, sponsorId: string, secret: string): boolean {
  const file = loadCredentials(dir);
  const rec = file?.sponsors[sponsorId];
  if (!rec || rec.kdf !== "scrypt") return false;
  const salt = Buffer.from(rec.salt, "base64");
  const expected = Buffer.from(rec.hash, "base64");
  const actual = scryptSync(secret, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function provisionSponsor(
  dir: string,
  sponsorId: string,
  opts: { rotate?: boolean } = {},
): { secretPath: string; created: boolean } {
  mkdirSync(dir, { recursive: true });
  const file = loadCredentials(dir) ?? { version: 1 as const, sponsors: {} };
  if (file.sponsors[sponsorId] && !opts.rotate) {
    return { secretPath: secretFilePath(dir, sponsorId), created: false };
  }
  const secret = randomBytes(24).toString("base64url");
  const salt = randomBytes(16);
  const hash = scryptSync(secret, salt, 32);
  file.sponsors[sponsorId] = {
    kdf: "scrypt",
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(credentialsPath(dir), `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
  const secretPath = secretFilePath(dir, sponsorId);
  writeFileSync(secretPath, `${secret}\n`, { mode: 0o600 });
  return { secretPath, created: true };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}
