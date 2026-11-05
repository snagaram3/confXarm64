import type { Booth, EsHealth, Profile, Ranked, RankMeta, Session, Visitor } from "./types";

export class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string; hint?: string; code?: string };
  if (!res.ok) {
    throw new ApiError(
      data.hint ? `${data.error ?? res.statusText} — ${data.hint}` : (data.error ?? res.statusText),
      data.code,
    );
  }
  return data;
}

export async function fetchHealth(signal?: AbortSignal): Promise<EsHealth> {
  const res = await fetch("/api/health", { signal });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as EsHealth & { error?: string };
    throw new ApiError(data.error ?? res.statusText, "es_not_ready");
  }
  return res.json() as Promise<EsHealth>;
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

export async function fetchScheduleBootstrap(signal?: AbortSignal): Promise<{
  meta: {
    catalog: string;
    edition: string;
    timezone: string;
    snapshotAt: string;
    sessionCount: number;
    note: string;
    relatedFeeds: { notice: string };
  };
  sessions: Session[];
  featured: {
    label: string;
    disclaimer: string;
    picks: Array<{
      sessionId: string;
      title: string;
      start: string;
      end: string;
      roomLabel: string;
      why: string;
      speakers: Array<{ fullName: string; tagLine?: string; photo?: string | null; bio?: string }>;
    }>;
  };
  boothAnchors: unknown;
  roomAnchors: {
    rooms: Array<{
      id: string;
      label: string;
      building: string | null;
      level: number | null;
      placed: boolean;
      nx?: number;
      ny?: number;
      reason?: string;
      roomOrArea?: string;
    }>;
  };
}> {
  const res = await fetch("/api/schedule/bootstrap", { signal });
  return readJson(res);
}

export async function fetchSessionDetail(id: string): Promise<{ session: Session }> {
  return readJson(await fetch(`/api/schedule/sessions/${encodeURIComponent(id)}`));
}

export async function fetchReminderStatus(): Promise<{
  webPushConfigured: boolean;
  publicKey: string | null;
  backgroundDelivery: boolean;
  foregroundOnly: boolean;
  notice: string;
}> {
  return readJson(await fetch("/api/reminders/status"));
}

export async function postReminderSubscribe(attendeeId: string, subscription: PushSubscription) {
  return readJson(
    await fetch("/api/reminders/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attendeeId, subscription }),
    }),
  );
}

export async function postReminderSchedule(
  attendeeId: string,
  sessionId: string,
  minutesBefore: number,
) {
  return readJson(
    await fetch("/api/reminders/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attendeeId, sessionId, minutesBefore }),
    }),
  );
}

export async function postReminderCancel(attendeeId: string, sessionId: string) {
  return readJson(
    await fetch("/api/reminders/cancel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attendeeId, sessionId }),
    }),
  );
}

export async function fetchReminderJobs(attendeeId: string) {
  return readJson<{
    jobs: Array<{
      id: string;
      sessionId: string;
      fireAt: number;
      minutesBefore: number;
      status: string;
    }>;
  }>(await fetch(`/api/reminders/jobs?attendeeId=${encodeURIComponent(attendeeId)}`));
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
