import type { Express, NextFunction, Request, Response } from "express";
import { join } from "node:path";
import {
  CONSENT_NOTICE,
  CONSENT_VERSION,
  consentText,
  isLeadSource,
  isLeadStatus,
} from "./consent.ts";
import { DuplicateLeadError, LeadsStore, leadsToCsv } from "./leads-store.ts";
import { sampleLeads } from "./sample-leads.ts";
import {
  hashToken,
  isAuthConfigured,
  newSessionToken,
  verifySecret,
} from "./sponsor-auth.ts";

interface BoothPublic {
  id: string;
  sponsor: string;
  tagline: string;
  boothNumber: string;
  logo: string | null;
  logoOnDark?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const COOKIE = "floorwise_sponsor";

type AuthedRequest = Request & { sponsorId?: string };

export function mountLeadRoutes(
  app: Express,
  opts: { store: LeadsStore; dataDir: string; booths: BoothPublic[] },
): void {
  const boothById = new Map(opts.booths.map((b) => [b.id, b]));
  const buckets = new Map<string, number[]>();

  function limited(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
    if (hits.length >= max) {
      buckets.set(key, hits);
      return false;
    }
    hits.push(now);
    buckets.set(key, hits);
    return true;
  }

  function clientKey(req: Request): string {
    return req.socket.remoteAddress ?? "unknown";
  }

  app.get("/api/leads/meta/:sponsorId", (req, res) => {
    const booth = boothById.get(String(req.params.sponsorId));
    if (!booth) {
      res.status(404).json({ error: "Unknown exhibitor" });
      return;
    }
    res.json({
      sponsorId: booth.id,
      name: booth.sponsor,
      tagline: booth.tagline,
      boothNumber: booth.boothNumber,
      logo: booth.logo,
      logoOnDark: booth.logoOnDark ?? false,
      consentVersion: CONSENT_VERSION,
      consentText: consentText(booth.sponsor),
      notice: CONSENT_NOTICE,
    });
  });

  app.post("/api/leads", (req, res) => {
    if (!limited(`lead:${clientKey(req)}`, 8, 10 * 60 * 1000)) {
      res.status(429).json({ error: "Too many submissions. Try again later." });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const sponsorId = String(body.sponsorId ?? "");
    const booth = boothById.get(sponsorId);
    if (!booth) {
      res.status(404).json({ error: "Unknown exhibitor" });
      return;
    }
    if (body.consent !== true) {
      res.status(400).json({
        error: "Consent is required. Must go / Maybe / Meh is not consent.",
        code: "consent_required",
      });
      return;
    }
    if (String(body.consentVersion ?? "") !== CONSENT_VERSION) {
      res.status(400).json({ error: "Consent text changed. Refresh and try again." });
      return;
    }
    const sourceRaw = String(body.source ?? "card");
    if (!isLeadSource(sourceRaw)) {
      res.status(400).json({ error: "Invalid source" });
      return;
    }
    const name = clip(body.name, 80);
    const email = clip(body.email, 120);
    if (name.length < 1 || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: "Name and a valid email are required." });
      return;
    }
    try {
      const lead = opts.store.createLead({
        sponsorId,
        name,
        email,
        company: clip(body.company, 80),
        role: clip(body.role, 80),
        interests: clip(body.interests, 200),
        message: clip(body.message, 500),
        consentText: consentText(booth.sponsor),
        source: sourceRaw,
      });
      res.status(201).json({
        ok: true,
        id: lead.id,
        sponsorName: booth.sponsor,
        duplicate: false,
      });
    } catch (err) {
      if (err instanceof DuplicateLeadError) {
        res.status(409).json({
          error: "You already shared details with this exhibitor.",
          code: "duplicate",
        });
        return;
      }
      console.error("[floorwise] lead_create_failed");
      res.status(500).json({ error: "Could not save this request." });
    }
  });

  app.get("/api/sponsor-portal/status", (_req, res) => {
    res.json({
      configured: isAuthConfigured(opts.dataDir),
      demoAvailable: true,
    });
  });

  app.get("/api/sponsor-portal/demo/leads", (req, res) => {
    const sponsorId = String(req.query.sponsorId ?? "elastic");
    const booth = boothById.get(sponsorId) ?? opts.booths[0];
    if (!booth) {
      res.status(404).json({ error: "Unknown exhibitor" });
      return;
    }
    const leads = sampleLeads(booth.id, booth.sponsor);
    res.json({
      demo: true,
      label: "SAMPLE DATA",
      notice: "Read-only synthetic leads on reserved example domains. Not the real lead store.",
      sponsor: publicBooth(booth),
      counts: { total: leads.length, byStatus: { new: 1, qualified: 1, contacted: 0 } },
      leads,
    });
  });

  app.post("/api/sponsor-portal/login", (req, res) => {
    if (!limited(`login:${clientKey(req)}`, 5, 15 * 60 * 1000)) {
      res.status(429).json({ error: "Too many sign-in attempts." });
      return;
    }
    if (!isAuthConfigured(opts.dataDir)) {
      res.status(503).json({
        error: "Sponsor portal is not configured.",
        code: "sponsor_auth_unconfigured",
        hint: "An operator must run npm run sponsor:provision -- <exhibitor-id>",
      });
      return;
    }
    const sponsorId = String((req.body as { sponsorId?: string }).sponsorId ?? "");
    const secret = String((req.body as { secret?: string }).secret ?? "");
    const booth = boothById.get(sponsorId);
    if (!booth || !secret || !verifySecret(opts.dataDir, sponsorId, secret)) {
      res.status(401).json({ error: "Unknown exhibitor or secret." });
      return;
    }
    const token = newSessionToken();
    opts.store.createSession(hashToken(token), sponsorId, SESSION_TTL_MS);
    res.setHeader("Set-Cookie", cookieHeader(token, SESSION_TTL_MS / 1000));
    res.json({ ok: true, sponsor: publicBooth(booth) });
  });

  app.post("/api/sponsor-portal/logout", (req, res) => {
    const token = readCookie(req, COOKIE);
    if (token) opts.store.deleteSession(hashToken(token));
    res.setHeader("Set-Cookie", cookieHeader("", 0));
    res.json({ ok: true });
  });

  function requireSponsor(req: AuthedRequest, res: Response, next: NextFunction): void {
    const token = readCookie(req, COOKIE);
    if (!token) {
      res.status(401).json({ error: "Sign in required.", code: "unauthorized" });
      return;
    }
    const session = opts.store.getSession(hashToken(token));
    if (!session) {
      res.status(401).json({ error: "Sign in required.", code: "unauthorized" });
      return;
    }
    req.sponsorId = session.sponsorId;
    next();
  }

  app.get("/api/sponsor-portal/me", requireSponsor, (req: AuthedRequest, res) => {
    const booth = boothById.get(req.sponsorId ?? "");
    if (!booth) {
      res.status(401).json({ error: "Sign in required." });
      return;
    }
    res.json({
      sponsor: publicBooth(booth),
      counts: opts.store.count(booth.id),
    });
  });

  app.get("/api/sponsor-portal/leads", requireSponsor, (req: AuthedRequest, res) => {
    const sponsorId = req.sponsorId ?? "";
    const q = String(req.query.q ?? "");
    const statusRaw = String(req.query.status ?? "");
    const status = isLeadStatus(statusRaw) ? statusRaw : undefined;
    const leads = opts.store.listLeads(sponsorId, { q, status });
    res.json({
      sponsorId,
      counts: opts.store.count(sponsorId),
      leads,
    });
  });

  app.get("/api/sponsor-portal/leads.csv", requireSponsor, (req: AuthedRequest, res) => {
    const sponsorId = req.sponsorId ?? "";
    const csv = leadsToCsv(opts.store.listLeads(sponsorId));
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", 'attachment; filename="floorwise-leads.csv"');
    res.send(csv);
  });

  app.get("/api/sponsor-portal/leads/:id", requireSponsor, (req: AuthedRequest, res) => {
    const lead = opts.store.getLead(req.sponsorId ?? "", String(req.params.id));
    if (!lead) {
      res.status(404).json({ error: "Lead not found." });
      return;
    }
    res.json({ lead });
  });

  app.patch("/api/sponsor-portal/leads/:id", requireSponsor, (req: AuthedRequest, res) => {
    const body = req.body as { status?: string; notes?: string };
    const patch: { status?: "new" | "qualified" | "contacted"; notes?: string } = {};
    if (body.status !== undefined) {
      if (!isLeadStatus(String(body.status))) {
        res.status(400).json({ error: "Invalid status." });
        return;
      }
      patch.status = String(body.status) as "new" | "qualified" | "contacted";
    }
    if (body.notes !== undefined) patch.notes = clip(body.notes, 2000);
    const lead = opts.store.updateLead(req.sponsorId ?? "", String(req.params.id), patch);
    if (!lead) {
      res.status(404).json({ error: "Lead not found." });
      return;
    }
    res.json({ lead });
  });

  app.delete("/api/sponsor-portal/leads/:id", requireSponsor, (req: AuthedRequest, res) => {
    const ok = opts.store.deleteLead(req.sponsorId ?? "", String(req.params.id));
    if (!ok) {
      res.status(404).json({ error: "Lead not found." });
      return;
    }
    res.json({ ok: true });
  });
}

function publicBooth(booth: BoothPublic) {
  return {
    id: booth.id,
    name: booth.sponsor,
    tagline: booth.tagline,
    boothNumber: booth.boothNumber,
    logo: booth.logo,
    logoOnDark: booth.logoOnDark ?? false,
  };
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function cookieHeader(token: string, maxAgeSec: number): string {
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`,
  ];
  return parts.join("; ");
}

export function sqlitePath(dir: string): string {
  return join(dir, "leads.sqlite");
}
