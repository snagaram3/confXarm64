import type { Booth, EsHealth, Profile, Ranked, RankMeta, Session, Visitor } from "./types";

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string; hint?: string };
  if (!res.ok) {
    throw new Error(data.hint ? `${data.error ?? res.statusText} — ${data.hint}` : (data.error ?? res.statusText));
  }
  return data;
}

export async function fetchHealth(signal?: AbortSignal): Promise<EsHealth> {
  const res = await fetch("/api/health", { signal });
  return readJson<EsHealth>(res);
}

export async function fetchRank(
  profile: Profile,
  q: string,
  signal?: AbortSignal,
): Promise<{ sessions: Ranked<Session>[]; booths: Ranked<Booth>[]; meta: RankMeta }> {
  const res = await fetch("/api/rank", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal,
    body: JSON.stringify({
      interests: profile.interests,
      role: profile.role,
      q,
    }),
  });
  return readJson(res);
}

export async function fetchVisitors(
  boothId: string,
  signal?: AbortSignal,
): Promise<{ visitors: Ranked<Visitor>[]; meta: RankMeta }> {
  const res = await fetch(`/api/sponsor/${boothId}/visitors`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal,
  });
  return readJson(res);
}
