import { redactError } from "./redact.ts";

export class ProviderHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function fetchJson(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ status: number; json: unknown }> {
  const timeoutMs = init.timeoutMs ?? 8_000;
  const { timeoutMs: _omit, ...rest } = init;
  void _omit;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: ac.signal });
    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        json = { raw: text.slice(0, 120) };
      }
    }
    return { status: res.status, json };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ProviderHttpError(504, "Provider timed out");
    }
    throw new ProviderHttpError(502, redactError(err));
  } finally {
    clearTimeout(timer);
  }
}

export type CacheEntry<T> = { at: number; value: T };

export function readCache<T>(store: Map<string, CacheEntry<T>>, key: string, ttlMs: number): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttlMs) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function writeCache<T>(store: Map<string, CacheEntry<T>>, key: string, value: T): T {
  store.set(key, { at: Date.now(), value });
  return value;
}
