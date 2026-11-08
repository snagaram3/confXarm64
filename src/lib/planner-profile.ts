import { CONFERENCE_DAYS, type ConferenceDayId } from "./ask";
import type { Profile } from "./types";

export const PLANNER_PROFILE_KEY_PREFIX = "floorwise.plannerProfile.";

export const PLANNER_GOALS = [
  {
    id: "talks",
    label: "Build a talk shortlist",
    detail: "Official sessions ranked against the topics you pick — not a popularity score.",
    query: "",
  },
  {
    id: "exhibitors",
    label: "Meet exhibitors",
    detail: "Catalog booths whose tags overlap your topics. Not ads, not walking distance.",
    query: "",
  },
  {
    id: "keynotes",
    label: "Catch keynotes",
    detail: "Adds the word “keynote” to your Elasticsearch query over the official schedule.",
    query: "keynote",
  },
  {
    id: "tutorials",
    label: "Tutorials and deep dives",
    detail: "Adds “tutorial” to the same official-schedule query.",
    query: "tutorial",
  },
] as const;

export type PlannerGoalId = (typeof PLANNER_GOALS)[number]["id"];

export const EMPTY_PROFILE: Profile = {
  name: "",
  role: "",
  interests: [],
  goals: [],
  attendanceDays: [],
  onboarded: false,
  demoPersona: false,
};

/** Labeled sample only — never applied unless the visitor chooses it. */
export const DEMO_PROFILE: Profile = {
  name: "Alex Rivera",
  role: "Staff Platform Engineer",
  interests: ["Kubernetes", "observability", "platform engineering", "eBPF", "OpenTelemetry"],
  goals: ["talks", "keynotes"],
  attendanceDays: CONFERENCE_DAYS.map((day) => day.id),
  onboarded: true,
  demoPersona: true,
};

export function profileStorageKey(attendeeId: string): string {
  return `${PLANNER_PROFILE_KEY_PREFIX}${attendeeId}`;
}

export function parsePlannerProfile(raw: string | null): Profile {
  if (!raw) return { ...EMPTY_PROFILE };
  try {
    const parsed = JSON.parse(raw) as Partial<Profile>;
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_PROFILE };
    const attendanceDays = Array.isArray(parsed.attendanceDays)
      ? parsed.attendanceDays.filter((day): day is ConferenceDayId =>
          typeof day === "string" && CONFERENCE_DAYS.some((item) => item.id === day),
        )
      : [];
    const goals = Array.isArray(parsed.goals)
      ? parsed.goals.filter((goal): goal is string => PLANNER_GOALS.some((item) => item.id === goal))
      : [];
    const interests = Array.isArray(parsed.interests) ? parsed.interests.map(String).filter(Boolean) : [];
    return {
      name: typeof parsed.name === "string" ? parsed.name.slice(0, 80) : "",
      role: typeof parsed.role === "string" ? parsed.role.slice(0, 80) : "",
      interests,
      goals,
      attendanceDays,
      onboarded: parsed.onboarded === true,
      demoPersona: parsed.demoPersona === true,
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function readPlannerProfile(attendeeId: string): Profile {
  try {
    return parsePlannerProfile(localStorage.getItem(profileStorageKey(attendeeId)));
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function writePlannerProfile(attendeeId: string, profile: Profile): void {
  try {
    localStorage.setItem(profileStorageKey(attendeeId), JSON.stringify(profile));
  } catch {
    /* private mode */
  }
}

export function composeRankQuery(profile: Profile, searchQuery: string): string {
  const extras = PLANNER_GOALS.filter((goal) => profile.goals.includes(goal.id) && goal.query).map((goal) => goal.query);
  return [searchQuery.trim(), ...extras].filter(Boolean).join(" ").trim();
}

export function profileDisplayName(profile: Profile): string {
  const name = profile.name.trim();
  if (name) return name;
  if (profile.demoPersona) return "Alex Rivera (sample persona)";
  return "Your trip";
}

export function canFinishOnboarding(profile: Profile): { ok: boolean; message: string | null } {
  if (profile.interests.length < 1) {
    return { ok: false, message: "Pick at least one topic so we can rank the official schedule." };
  }
  if (profile.attendanceDays.length < 1) {
    return { ok: false, message: "Pick the conference days you will be on site." };
  }
  return { ok: true, message: null };
}
