import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export interface PushSubscriptionRow {
  id: string;
  attendeeHash: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export interface ReminderJob {
  id: string;
  attendeeHash: string;
  sessionId: string;
  title: string;
  fireAt: number;
  minutesBefore: number;
  status: "scheduled" | "sent" | "cancelled";
}

export class ReminderStore {
  private readonly db: DatabaseSync;

  constructor(filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        attendee_hash TEXT NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        attendee_hash TEXT NOT NULL,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        fire_at INTEGER NOT NULL,
        minutes_before INTEGER NOT NULL,
        status TEXT NOT NULL,
        UNIQUE (attendee_hash, session_id)
      );
    `);
  }

  static hashAttendee(id: string): string {
    return createHash("sha256").update(id).digest("hex");
  }

  upsertSubscription(input: {
    attendeeId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }): PushSubscriptionRow {
    const attendeeHash = ReminderStore.hashAttendee(input.attendeeId);
    const existing = this.db
      .prepare(`SELECT id FROM subscriptions WHERE endpoint = ?`)
      .get(input.endpoint) as { id?: string } | undefined;
    const id = existing?.id ?? randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO subscriptions (id, attendee_hash, endpoint, p256dh, auth, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET attendee_hash = excluded.attendee_hash, p256dh = excluded.p256dh, auth = excluded.auth`,
      )
      .run(id, attendeeHash, input.endpoint, input.p256dh, input.auth, now);
    return {
      id,
      attendeeHash,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      createdAt: now,
    };
  }

  getSubscription(id: string): PushSubscriptionRow | null {
    const row = this.db.prepare(`SELECT * FROM subscriptions WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toSub(row) : null;
  }

  subscriptionsFor(attendeeId: string): PushSubscriptionRow[] {
    const hash = ReminderStore.hashAttendee(attendeeId);
    const rows = this.db
      .prepare(`SELECT * FROM subscriptions WHERE attendee_hash = ?`)
      .all(hash) as Record<string, unknown>[];
    return rows.map(toSub);
  }

  schedule(input: {
    attendeeId: string;
    sessionId: string;
    title: string;
    fireAt: number;
    minutesBefore: number;
  }): ReminderJob {
    const attendeeHash = ReminderStore.hashAttendee(input.attendeeId);
    const existing = this.db
      .prepare(`SELECT id FROM jobs WHERE attendee_hash = ? AND session_id = ?`)
      .get(attendeeHash, input.sessionId) as { id?: string } | undefined;
    const id = existing?.id ?? randomUUID();
    this.db
      .prepare(
        `INSERT INTO jobs (id, attendee_hash, session_id, title, fire_at, minutes_before, status)
         VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
         ON CONFLICT(attendee_hash, session_id) DO UPDATE SET
           title = excluded.title,
           fire_at = excluded.fire_at,
           minutes_before = excluded.minutes_before,
           status = 'scheduled'`,
      )
      .run(id, attendeeHash, input.sessionId, input.title, input.fireAt, input.minutesBefore);
    return {
      id,
      attendeeHash,
      sessionId: input.sessionId,
      title: input.title,
      fireAt: input.fireAt,
      minutesBefore: input.minutesBefore,
      status: "scheduled",
    };
  }

  cancel(attendeeId: string, sessionId: string): boolean {
    const hash = ReminderStore.hashAttendee(attendeeId);
    const res = this.db
      .prepare(
        `UPDATE jobs SET status = 'cancelled' WHERE attendee_hash = ? AND session_id = ? AND status = 'scheduled'`,
      )
      .run(hash, sessionId);
    return Number(res.changes) > 0;
  }

  listJobs(attendeeId: string): ReminderJob[] {
    const hash = ReminderStore.hashAttendee(attendeeId);
    const rows = this.db
      .prepare(`SELECT * FROM jobs WHERE attendee_hash = ? ORDER BY fire_at`)
      .all(hash) as Record<string, unknown>[];
    return rows.map(toJob);
  }

  dueJobs(now = Date.now()): Array<ReminderJob & { sub: PushSubscriptionRow }> {
    const jobs = this.db
      .prepare(`SELECT * FROM jobs WHERE status = 'scheduled' AND fire_at <= ?`)
      .all(now) as Record<string, unknown>[];
    const out: Array<ReminderJob & { sub: PushSubscriptionRow }> = [];
    for (const raw of jobs) {
      const job = toJob(raw);
      const subs = this.db
        .prepare(`SELECT * FROM subscriptions WHERE attendee_hash = ?`)
        .all(job.attendeeHash) as Record<string, unknown>[];
      for (const sub of subs) out.push({ ...job, sub: toSub(sub) });
      if (subs.length === 0) out.push({ ...job, sub: emptySub(job.attendeeHash) });
    }
    return out;
  }

  markSent(id: string): void {
    this.db.prepare(`UPDATE jobs SET status = 'sent' WHERE id = ?`).run(id);
  }

  close(): void {
    this.db.close();
  }
}

function toSub(row: Record<string, unknown>): PushSubscriptionRow {
  return {
    id: String(row.id),
    attendeeHash: String(row.attendee_hash),
    endpoint: String(row.endpoint),
    p256dh: String(row.p256dh),
    auth: String(row.auth),
    createdAt: String(row.created_at),
  };
}

function toJob(row: Record<string, unknown>): ReminderJob {
  return {
    id: String(row.id),
    attendeeHash: String(row.attendee_hash),
    sessionId: String(row.session_id),
    title: String(row.title),
    fireAt: Number(row.fire_at),
    minutesBefore: Number(row.minutes_before),
    status: row.status === "sent" || row.status === "cancelled" ? row.status : "scheduled",
  };
}

function emptySub(attendeeHash: string): PushSubscriptionRow {
  return {
    id: "",
    attendeeHash,
    endpoint: "",
    p256dh: "",
    auth: "",
    createdAt: "",
  };
}

export function remindersPath(dir: string): string {
  return join(dir, "reminders.sqlite");
}
