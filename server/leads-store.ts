import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import {
  CONSENT_VERSION,
  isLeadStatus,
  type LeadSource,
  type LeadStatus,
} from "./consent.ts";

export interface LeadRecord {
  id: string;
  sponsorId: string;
  name: string;
  email: string;
  company: string;
  role: string;
  interests: string;
  message: string;
  status: LeadStatus;
  notes: string;
  consentVersion: string;
  consentText: string;
  consentedAt: string;
  source: LeadSource;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeadInput {
  sponsorId: string;
  name: string;
  email: string;
  company: string;
  role: string;
  interests: string;
  message: string;
  consentText: string;
  source: LeadSource;
}

export class DuplicateLeadError extends Error {
  constructor() {
    super("duplicate");
    this.name = "DuplicateLeadError";
  }
}

export class LeadsStore {
  private readonly db: DatabaseSync;

  constructor(filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        sponsor_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        email_key TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT '',
        interests TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        consent_version TEXT NOT NULL,
        consent_text TEXT NOT NULL,
        consented_at TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (sponsor_id, email_key)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        sponsor_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
  }

  createLead(input: CreateLeadInput): LeadRecord {
    const now = new Date().toISOString();
    const id = randomUUID();
    const emailKey = input.email.trim().toLowerCase();
    try {
      this.db
        .prepare(
          `INSERT INTO leads (
            id, sponsor_id, name, email, email_key, company, role, interests, message,
            status, notes, consent_version, consent_text, consented_at, source, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', '', ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          input.sponsorId,
          input.name,
          input.email.trim(),
          emailKey,
          input.company,
          input.role,
          input.interests,
          input.message,
          CONSENT_VERSION,
          input.consentText,
          now,
          input.source,
          now,
          now,
        );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("UNIQUE")) throw new DuplicateLeadError();
      throw err;
    }
    const row = this.getLead(input.sponsorId, id);
    if (!row) throw new Error("lead insert missing");
    return row;
  }

  getLead(sponsorId: string, id: string): LeadRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM leads WHERE id = ? AND sponsor_id = ?`)
      .get(id, sponsorId);
    return row ? toLead(row) : null;
  }

  listLeads(
    sponsorId: string,
    opts: { q?: string; status?: LeadStatus } = {},
  ): LeadRecord[] {
    const q = opts.q?.trim().toLowerCase() ?? "";
    const rows = this.db
      .prepare(
        `SELECT * FROM leads WHERE sponsor_id = ? ORDER BY created_at DESC`,
      )
      .all(sponsorId) as Record<string, unknown>[];
    return rows
      .map(toLead)
      .filter((lead) => {
        if (opts.status && lead.status !== opts.status) return false;
        if (!q) return true;
        const blob = `${lead.name} ${lead.email} ${lead.company} ${lead.role} ${lead.interests} ${lead.message}`.toLowerCase();
        return blob.includes(q);
      });
  }

  updateLead(
    sponsorId: string,
    id: string,
    patch: { status?: LeadStatus; notes?: string },
  ): LeadRecord | null {
    const current = this.getLead(sponsorId, id);
    if (!current) return null;
    const status = patch.status ?? current.status;
    const notes = patch.notes ?? current.notes;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE leads SET status = ?, notes = ?, updated_at = ? WHERE id = ? AND sponsor_id = ?`,
      )
      .run(status, notes, now, id, sponsorId);
    return this.getLead(sponsorId, id);
  }

  deleteLead(sponsorId: string, id: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM leads WHERE id = ? AND sponsor_id = ?`)
      .run(id, sponsorId);
    return Number(result.changes) > 0;
  }

  count(sponsorId: string): { total: number; byStatus: Record<LeadStatus, number> } {
    const leads = this.listLeads(sponsorId);
    const byStatus: Record<LeadStatus, number> = { new: 0, qualified: 0, contacted: 0 };
    for (const lead of leads) byStatus[lead.status] += 1;
    return { total: leads.length, byStatus };
  }

  createSession(tokenHash: string, sponsorId: string, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.db
      .prepare(`INSERT INTO sessions (token_hash, sponsor_id, expires_at) VALUES (?, ?, ?)`)
      .run(tokenHash, sponsorId, expiresAt);
  }

  getSession(tokenHash: string): { sponsorId: string } | null {
    const row = this.db
      .prepare(`SELECT sponsor_id, expires_at FROM sessions WHERE token_hash = ?`)
      .get(tokenHash) as { sponsor_id?: string; expires_at?: number } | undefined;
    if (!row?.sponsor_id) return null;
    if (Number(row.expires_at) < Date.now()) {
      this.db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(tokenHash);
      return null;
    }
    return { sponsorId: String(row.sponsor_id) };
  }

  deleteSession(tokenHash: string): void {
    this.db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(tokenHash);
  }

  close(): void {
    this.db.close();
  }
}

function toLead(row: Record<string, unknown>): LeadRecord {
  const status = String(row.status);
  return {
    id: String(row.id),
    sponsorId: String(row.sponsor_id),
    name: String(row.name),
    email: String(row.email),
    company: String(row.company ?? ""),
    role: String(row.role ?? ""),
    interests: String(row.interests ?? ""),
    message: String(row.message ?? ""),
    status: isLeadStatus(status) ? status : "new",
    notes: String(row.notes ?? ""),
    consentVersion: String(row.consent_version),
    consentText: String(row.consent_text),
    consentedAt: String(row.consented_at),
    source: row.source === "link" ? "link" : "card",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function csvCell(value: string): string {
  let v = value.replaceAll('"', '""');
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v}"`;
}

export function leadsToCsv(leads: LeadRecord[]): string {
  const header = [
    "id",
    "name",
    "email",
    "company",
    "role",
    "interests",
    "message",
    "status",
    "notes",
    "consented_at",
    "source",
    "consent_version",
  ];
  const lines = [header.join(",")];
  for (const lead of leads) {
    lines.push(
      [
        lead.id,
        lead.name,
        lead.email,
        lead.company,
        lead.role,
        lead.interests,
        lead.message,
        lead.status,
        lead.notes,
        lead.consentedAt,
        lead.source,
        lead.consentVersion,
      ]
        .map((v) => csvCell(String(v)))
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function dataDir(root: string): string {
  return process.env.FLOORWISE_DATA_DIR ?? resolve(root, "data");
}
