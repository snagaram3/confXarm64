import type { Express } from "express";
import {
  boothAnchors,
  featured,
  listSessions,
  officialSessions,
  roomAnchors,
  rooms,
  scheduleMeta,
  sessionById,
} from "./schedule.ts";

export function mountScheduleRoutes(app: Express): void {
  app.get("/api/schedule/meta", (_req, res) => {
    res.json(scheduleMeta);
  });

  app.get("/api/schedule/bootstrap", (_req, res) => {
    res.json({
      meta: scheduleMeta,
      sessions: officialSessions.map(compactSession),
      rooms,
      featured,
      boothAnchors,
      roomAnchors,
    });
  });

  app.get("/api/schedule/sessions", (req, res) => {
    const day = String(req.query.day ?? "");
    const building = String(req.query.building ?? "");
    const q = String(req.query.q ?? "");
    const track = String(req.query.track ?? "");
    const rows = listSessions({
      day: day || undefined,
      building: building || undefined,
      q: q || undefined,
      track: track || undefined,
    });
    res.json({ sessions: rows.map(compactSession), total: rows.length });
  });

  app.get("/api/schedule/sessions/:id", (req, res) => {
    const row = sessionById.get(String(req.params.id));
    if (!row) {
      res.status(404).json({ error: "Unknown session" });
      return;
    }
    res.json({ session: row });
  });
}

function compactSession(s: (typeof officialSessions)[number]) {
  return {
    ...s,
    descriptionHtml: undefined,
    abstract: s.abstract.slice(0, 400),
    speakers: s.speakers.map((sp) => ({
      ...sp,
      bio: sp.bio.slice(0, 280),
    })),
  };
}
