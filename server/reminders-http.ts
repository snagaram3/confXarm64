import type { Express, Request } from "express";
import webpush from "web-push";
import { ReminderStore } from "./reminders-store.ts";
import { sessionById } from "./schedule.ts";
import { applyVapid, isPushConfigured, type VapidFile } from "./vapid.ts";

const MINUTES = new Set([5, 10, 15]);

function localClient(req: Request): boolean {
  const addr = req.socket.remoteAddress ?? "";
  return addr === "127.0.0.1" || addr === "::1" || addr === ":ffff:127.0.0.1";
}

function safePushEndpoint(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const okHost =
      host.endsWith("googleapis.com") ||
      host.endsWith("mozilla.com") ||
      host.endsWith("mozilla.org") ||
      host.endsWith("push.apple.com") ||
      host.endsWith("notify.windows.com") ||
      host === "127.0.0.1";
    if (!okHost) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && host === "127.0.0.1")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function mountReminderRoutes(
  app: Express,
  opts: { store: ReminderStore; dataDir: string },
): void {
  const vapid = applyVapid(opts.dataDir);

  app.get("/api/reminders/status", (_req, res) => {
    res.json(pushStatus(vapid, opts.dataDir));
  });

  app.post("/api/reminders/subscribe", (req, res) => {
    if (!vapid) {
      res.status(503).json({
        error: "Web Push is not configured.",
        code: "push_unconfigured",
        hint: "Run npm run vapid:provision and restart. Until then, only in-tab reminders work.",
      });
      return;
    }
    const body = req.body as {
      attendeeId?: string;
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    };
    const attendeeId = String(body.attendeeId ?? "").slice(0, 80);
    const endpoint = safePushEndpoint(String(body.subscription?.endpoint ?? ""));
    const p256dh = String(body.subscription?.keys?.p256dh ?? "").slice(0, 200);
    const auth = String(body.subscription?.keys?.auth ?? "").slice(0, 200);
    if (!attendeeId || !endpoint || !p256dh || !auth) {
      res.status(400).json({ error: "attendeeId and a Web Push subscription are required." });
      return;
    }
    opts.store.upsertSubscription({ attendeeId, endpoint, p256dh, auth });
    res.json({ ok: true });
  });

  app.post("/api/reminders/schedule", (req, res) => {
    const body = req.body as {
      attendeeId?: string;
      sessionId?: string;
      minutesBefore?: number;
    };
    const attendeeId = String(body.attendeeId ?? "").slice(0, 80);
    const sessionId = String(body.sessionId ?? "");
    const minutesBefore = Number(body.minutesBefore ?? 10);
    if (!attendeeId || !sessionId || !MINUTES.has(minutesBefore)) {
      res.status(400).json({ error: "attendeeId, sessionId, and 5/10/15 minutes are required." });
      return;
    }
    const session = sessionById.get(sessionId);
    if (!session) {
      res.status(404).json({ error: "Unknown session" });
      return;
    }
    const fireAt = new Date(session.startIso).getTime() - minutesBefore * 60_000;
    if (fireAt <= Date.now() - 60_000) {
      res.status(400).json({ error: "That session has already started." });
      return;
    }
    const job = opts.store.schedule({
      attendeeId,
      sessionId,
      title: session.title.slice(0, 120),
      fireAt,
      minutesBefore,
    });
    res.json({
      ok: true,
      job: { id: job.id, sessionId: job.sessionId, fireAt: job.fireAt, minutesBefore: job.minutesBefore },
    });
  });

  app.post("/api/reminders/cancel", (req, res) => {
    const body = req.body as { attendeeId?: string; sessionId?: string };
    const attendeeId = String(body.attendeeId ?? "");
    const sessionId = String(body.sessionId ?? "");
    if (!attendeeId || !sessionId) {
      res.status(400).json({ error: "attendeeId and sessionId are required." });
      return;
    }
    res.json({ ok: opts.store.cancel(attendeeId, sessionId) });
  });

  app.get("/api/reminders/jobs", (req, res) => {
    const attendeeId = String(req.query.attendeeId ?? "");
    if (!attendeeId) {
      res.status(400).json({ error: "attendeeId is required." });
      return;
    }
    const jobs = opts.store.listJobs(attendeeId).map((j) => ({
      id: j.id,
      sessionId: j.sessionId,
      fireAt: j.fireAt,
      minutesBefore: j.minutesBefore,
      status: j.status,
    }));
    res.json({ jobs });
  });

  app.post("/api/reminders/test-fire", async (req, res) => {
    if (!localClient(req)) {
      res.status(403).json({ error: "Test fire is localhost-only." });
      return;
    }
    const body = req.body as { attendeeId?: string };
    const attendeeId = String(body.attendeeId ?? "");
    if (!attendeeId) {
      res.status(400).json({ error: "attendeeId is required." });
      return;
    }
    const fireAt = Date.now() + 1500;
    const job = opts.store.schedule({
      attendeeId,
      sessionId: "synthetic-reminder-test",
      title: "SAMPLE reminder test (not a real session)",
      fireAt,
      minutesBefore: 5,
    });
    res.json({ ok: true, job: { id: job.id, fireAt: job.fireAt, synthetic: true } });
  });

  setInterval(() => {
    void tick(opts.store, vapid);
  }, 5000).unref();
}

function pushStatus(vapid: VapidFile | null, dir: string) {
  return {
    webPushConfigured: isPushConfigured(dir),
    publicKey: vapid?.publicKey ?? null,
    backgroundDelivery: Boolean(vapid),
    foregroundOnly: !vapid,
    notice: vapid
      ? "Background Web Push is configured for this local API. HTTPS or localhost, a supported browser, and an explicit permission grant are required."
      : "Background Web Push is off until VAPID keys are provisioned. In-tab notifications can still fire while this page is open.",
  };
}

async function tick(store: ReminderStore, vapid: VapidFile | null): Promise<void> {
  const due = store.dueJobs();
  const seen = new Set<string>();
  for (const job of due) {
    if (seen.has(job.id)) continue;
    seen.add(job.id);
    if (vapid && job.sub.endpoint) {
      try {
        await webpush.sendNotification(
          {
            endpoint: job.sub.endpoint,
            keys: { p256dh: job.sub.p256dh, auth: job.sub.auth },
          },
          JSON.stringify({
            title: "confXarm64 reminder",
            body: job.title,
            url: `/?session=${encodeURIComponent(job.sessionId)}`,
          }),
        );
      } catch {
        /* do not log endpoint or PII */
      }
    }
    store.markSent(job.id);
  }
}
