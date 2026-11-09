import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHtmlServer, trustedPhoto } from "./html.ts";

function timeHm(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface RawSpeaker {
  id: string;
  fullName: string;
  tagLine?: string;
  bio?: string;
  profilePicture?: string | null;
  isTopSpeaker?: boolean;
}

interface RawSession {
  id: string;
  dataset: string;
  title: string;
  description: string;
  description_html: string;
  start: string;
  end: string;
  iana_timezone: string;
  room_id: string;
  room_label: string;
  tracks: string[];
  speakers: Array<{ id?: string; name?: string; fullName?: string; tagline?: string }>;
  session_url: string;
  session_type_labels: string[];
  categories?: Record<string, string[]>;
  is_service_session: boolean;
  is_plenum_session: boolean;
  access_constraints: {
    sold_out_label?: boolean;
    separate_registration_required?: boolean;
    cncf_colocated_all_access_required?: boolean;
    evidence_labels?: string[];
  };
}

export interface MappedSpeaker {
  id: string;
  fullName: string;
  tagLine: string;
  bio: string;
  photo: string | null;
  isTopSpeaker: boolean;
}

export interface MappedSession {
  id: string;
  dataset: "main";
  title: string;
  speaker: string;
  company: string;
  roomId: string;
  roomLabel: string;
  building: string | null;
  level: number | null;
  floor: number;
  start: string;
  end: string;
  startIso: string;
  endIso: string;
  timezone: string;
  track: string;
  tags: string[];
  abstract: string;
  descriptionHtml: string;
  sessionUrl: string;
  speakers: MappedSpeaker[];
  sessionTypeLabels: string[];
  audienceLevel: string | null;
  crowdTakes: [];
  access: {
    soldOut: boolean;
    separateRegistration: boolean;
    allAccessColocated: boolean;
    notes: string[];
  };
  isServiceSession: boolean;
  isPlenum: boolean;
}

interface RoomRow {
  id: string;
  label: string;
  building: string | null;
  level: number | null;
  room_or_area: string;
  is_offsite_placeholder: boolean;
  is_tbd: boolean;
}

const snapshot = JSON.parse(readFileSync(resolve(root, "official/snapshot.json"), "utf8")) as {
  edition: string;
  timezone: string;
  packGeneratedAt: string;
  mainSessions: number;
  note: string;
  scheduleUrl: string;
  sessionizeAll: string;
};
const rooms = JSON.parse(readFileSync(resolve(root, "official/rooms.json"), "utf8")) as RoomRow[];
const rawSessions = JSON.parse(
  readFileSync(resolve(root, "official/sessions.json"), "utf8"),
) as RawSession[];
const rawSpeakers = JSON.parse(
  readFileSync(resolve(root, "official/speakers.json"), "utf8"),
) as RawSpeaker[];
const featuredFile = JSON.parse(
  readFileSync(resolve(root, "src/data/featured.json"), "utf8"),
) as unknown;
const boothAnchors = JSON.parse(
  readFileSync(resolve(root, "src/data/booth-anchors.json"), "utf8"),
) as unknown;
const roomAnchors = JSON.parse(
  readFileSync(resolve(root, "src/data/room-anchors.json"), "utf8"),
) as unknown;
const relatedFeeds = JSON.parse(
  readFileSync(resolve(root, "official/related-feeds.json"), "utf8"),
) as unknown;

const speakerById = new Map(rawSpeakers.map((s) => [s.id, s]));
const speakerByName = new Map(rawSpeakers.map((s) => [s.fullName.toLowerCase(), s]));
const roomById = new Map(rooms.map((r) => [r.id, r]));

function mapSpeakers(raw: RawSession["speakers"]): MappedSpeaker[] {
  const out: MappedSpeaker[] = [];
  for (const sp of raw) {
    const rec = (sp.id && speakerById.get(sp.id)) || speakerByName.get((sp.name ?? "").toLowerCase());
    const fullName = sp.name || rec?.fullName || "Speaker";
    out.push({
      id: rec?.id ?? sp.id ?? fullName,
      fullName,
      tagLine: rec?.tagLine ?? sp.tagline ?? "",
      bio: rec?.bio ?? "",
      photo: trustedPhoto(rec?.profilePicture),
      isTopSpeaker: Boolean(rec?.isTopSpeaker),
    });
  }
  return out;
}

function companyFrom(speakers: MappedSpeaker[]): string {
  const tag = speakers.find((s) => s.tagLine)?.tagLine ?? "";
  const part = tag.split(",")[0]?.trim();
  return part || "";
}

export const officialSessions: MappedSession[] = rawSessions.map((s) => {
  const room = roomById.get(s.room_id);
  const speakers = mapSpeakers(s.speakers ?? []);
  const tags = [...new Set([...(s.tracks ?? []), ...(s.session_type_labels ?? [])])];
  const tz = s.iana_timezone || "America/Denver";
  return {
    id: s.id,
    dataset: "main",
    title: s.title,
    speaker: speakers.map((sp) => sp.fullName).join(", ") || "—",
    company: companyFrom(speakers),
    roomId: s.room_id,
    roomLabel: s.room_label,
    building: room?.building ?? null,
    level: room?.level ?? null,
    floor: room?.level ?? 1,
    start: timeHm(s.start, tz),
    end: timeHm(s.end, tz),
    startIso: s.start,
    endIso: s.end,
    timezone: tz,
    track: (s.tracks && s.tracks[0]) || (s.session_type_labels && s.session_type_labels[0]) || "Session",
    tags,
    abstract: (s.description || "").trim() || "No description was published for this record.",
    descriptionHtml: sanitizeHtmlServer(s.description_html || ""),
    sessionUrl: s.session_url,
    speakers,
    sessionTypeLabels: s.session_type_labels ?? [],
    audienceLevel: s.categories?.["Audience Level"]?.[0] ?? null,
    crowdTakes: [],
    access: {
      soldOut: Boolean(s.access_constraints?.sold_out_label),
      separateRegistration: Boolean(s.access_constraints?.separate_registration_required),
      allAccessColocated: Boolean(s.access_constraints?.cncf_colocated_all_access_required),
      notes: s.access_constraints?.evidence_labels ?? [],
    },
    isServiceSession: Boolean(s.is_service_session),
    isPlenum: Boolean(s.is_plenum_session),
  };
});

export const sessionById = new Map(officialSessions.map((s) => [s.id, s]));

export const scheduleMeta = {
  catalog: "official" as const,
  edition: snapshot.edition,
  timezone: snapshot.timezone,
  snapshotAt: snapshot.packGeneratedAt,
  sessionCount: officialSessions.length,
  speakerCount: rawSpeakers.length,
  roomCount: rooms.length,
  note: snapshot.note,
  scheduleUrl: snapshot.scheduleUrl,
  sessionizeAll: snapshot.sessionizeAll,
  relatedFeeds,
};

export function listSessions(opts: {
  day?: string;
  building?: string;
  q?: string;
  track?: string;
}): MappedSession[] {
  const q = (opts.q ?? "").trim().toLowerCase();
  return officialSessions.filter((s) => {
    if (opts.day && !s.startIso.startsWith(opts.day)) return false;
    if (opts.building && s.building !== opts.building) return false;
    if (opts.track && s.track !== opts.track) return false;
    if (!q) return true;
    return `${s.title} ${s.speaker} ${s.abstract} ${s.roomLabel} ${s.tags.join(" ")}`
      .toLowerCase()
      .includes(q);
  });
}

export { featuredFile as featured, boothAnchors, roomAnchors, rooms };
