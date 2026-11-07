import { overlaps, sessionStatus, type SessionTiming } from "./agenda";
import type { Session } from "./types";

export type RescueReason = "sold_out" | "agenda_conflict" | "unplaced_room" | "ended" | "colocated_gate";
export type Partition = "recommended" | "check" | "unavailable";

export interface RoomPlace {
  id: string;
  placed: boolean;
}

export interface RescueContext {
  clock: Date;
  saved: SessionTiming[];
  rooms: RoomPlace[];
}

export interface SessionGate {
  partition: Partition;
  reason: RescueReason | null;
  detail: string;
}

export function sessionGate(session: Session, ctx: RescueContext): SessionGate {
  if (session.access?.soldOut) {
    return {
      partition: "unavailable",
      reason: "sold_out",
      detail: "Official schedule marks this session sold out.",
    };
  }
  if (session.startIso && session.endIso) {
    const timing = { id: session.id, title: session.title, startIso: session.startIso, endIso: session.endIso };
    if (sessionStatus(timing, ctx.clock) === "finished") {
      return {
        partition: "unavailable",
        reason: "ended",
        detail: "Already ended on the planner clock — not a live hall sensor.",
      };
    }
    const clash = ctx.saved.find((item) => item.id !== session.id && overlaps(timing, item));
    if (clash) {
      return {
        partition: "unavailable",
        reason: "agenda_conflict",
        detail: `Overlaps your saved talk “${clash.title}”.`,
      };
    }
  }
  if (session.access?.allAccessColocated) {
    return {
      partition: "check",
      reason: "colocated_gate",
      detail: "All-Access colocated event — confirm pass. Not a crowd count.",
    };
  }
  const room = ctx.rooms.find((r) => r.id === session.roomId);
  if (room && !room.placed) {
    return {
      partition: "check",
      reason: "unplaced_room",
      detail: "Room is on the schematic from the schedule label, not a verified pin on venue.pdf.",
    };
  }
  if (!room) {
    return {
      partition: "check",
      reason: "unplaced_room",
      detail: "No official room pin for this label yet.",
    };
  }
  return { partition: "recommended", reason: null, detail: "" };
}

export function pickBest<T extends { item: Session; rank: "must" | "maybe" | "meh" }>(
  rows: T[],
  ctx: RescueContext,
  stickyId?: string | null,
): { pick: T | null; gate: SessionGate | null; rescuedFrom: T | null; rescuedReason: RescueReason | null } {
  const gated = rows.map((row) => ({ row, gate: sessionGate(row.item, ctx) }));
  const recommended = gated.filter((g) => g.gate.partition === "recommended");
  const check = gated.filter((g) => g.gate.partition === "check");
  const order = [
    ...recommended.filter((g) => g.row.rank === "must"),
    ...recommended.filter((g) => g.row.rank === "maybe"),
    ...check.filter((g) => g.row.rank === "must"),
    ...recommended.filter((g) => g.row.rank === "meh"),
  ];
  const sticky = stickyId ? gated.find((g) => g.row.item.id === stickyId) : undefined;
  if (sticky && sticky.gate.partition === "recommended") {
    return { pick: sticky.row, gate: sticky.gate, rescuedFrom: null, rescuedReason: null };
  }
  const next = order[0] ?? check[0] ?? null;
  if (sticky && sticky.gate.partition === "unavailable" && next && next.row.item.id !== sticky.row.item.id) {
    return { pick: next.row, gate: next.gate, rescuedFrom: sticky.row, rescuedReason: sticky.gate.reason };
  }
  if (sticky && sticky.gate.partition !== "unavailable") {
    return { pick: sticky.row, gate: sticky.gate, rescuedFrom: null, rescuedReason: null };
  }
  return { pick: next?.row ?? null, gate: next?.gate ?? null, rescuedFrom: null, rescuedReason: null };
}

export function rescueCopy(reason: RescueReason | null): string {
  switch (reason) {
    case "sold_out":
      return "That pick is sold out on the official schedule.";
    case "agenda_conflict":
      return "That pick overlaps a talk already on your agenda.";
    case "ended":
      return "That pick already ended on the planner clock.";
    case "colocated_gate":
      return "That pick needs an All-Access colocated pass.";
    case "unplaced_room":
      return "That room is not a verified pin on the official floor plan.";
    default:
      return "Here is the next open pick from your ranking.";
  }
}
