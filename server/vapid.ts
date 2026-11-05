import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import webpush from "web-push";

export interface VapidFile {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function vapidPath(dir: string): string {
  return join(dir, "vapid.json");
}

export function loadVapid(dir: string): VapidFile | null {
  const path = vapidPath(dir);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as VapidFile;
    if (!parsed.publicKey || !parsed.privateKey || !parsed.subject) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isPushConfigured(dir: string): boolean {
  return loadVapid(dir) !== null;
}

export function provisionVapid(dir: string): { path: string; created: boolean; publicKey: string } {
  mkdirSync(dir, { recursive: true });
  const existing = loadVapid(dir);
  if (existing) {
    return { path: vapidPath(dir), created: false, publicKey: existing.publicKey };
  }
  const keys = webpush.generateVAPIDKeys();
  const file: VapidFile = {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    subject: process.env.VAPID_SUBJECT || "mailto:floorwise-local@example.com",
  };
  writeFileSync(vapidPath(dir), `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
  return { path: vapidPath(dir), created: true, publicKey: file.publicKey };
}

export function applyVapid(dir: string): VapidFile | null {
  const file = loadVapid(dir);
  if (!file) return null;
  webpush.setVapidDetails(file.subject, file.publicKey, file.privateKey);
  return file;
}
