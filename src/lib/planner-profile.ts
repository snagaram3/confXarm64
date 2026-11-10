import { CONFERENCE_DAYS, type ConferenceDayId } from "./ask";
import { emptyTaste, ensureTaste, parseTaste, tasteFromInterests, vibeQueryExtras, withTaste } from "./taste";
import type { Profile, TasteProfile } from "./types";

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
  taste: emptyTaste(),
  accessibilityNeeds: [],
};

const DEMO_INTERESTS = ["Kubernetes", "observability", "platform engineering", "eBPF", "OpenTelemetry"];
const DEMO_GOALS = ["talks", "keynotes"];

/** Labeled sample only — never applied unless the visitor chooses it. */
export const DEMO_PROFILE: Profile = {
  name: "Alex Rivera",
  role: "Staff Platform Engineer",
  interests: DEMO_INTERESTS,
  goals: DEMO_GOALS,
  attendanceDays: CONFERENCE_DAYS.map((day) => day.id),
  onboarded: true,
  demoPersona: true,
  taste: tasteFromInterests(DEMO_INTERESTS, DEMO_GOALS),
  accessibilityNeeds: [],
};

/** Accessibility-focused sample persona for Merge Forward demo. */
export const ACCESSIBILITY_DEMO_PROFILE: Profile = {
  name: "Jordan Chen",
  role: "Senior SRE",
  interests: ["Kubernetes", "CI/CD", "platform engineering"],
  goals: ["talks"],
  attendanceDays: CONFERENCE_DAYS.map((day) => day.id),
  onboarded: true,
  demoPersona: true,
  taste: tasteFromInterests(["Kubernetes", "CI/CD", "platform engineering"], ["talks"]),
  accessibilityNeeds: ["sensory", "mobility"],
};

export function profileStorageKey(attendeeId: string): string {
  return `${PLANNER_PROFILE_KEY_PREFIX}${attendeeId}`;
}

function hydrateTaste(interests: string[], goals: string[], rawTaste: unknown): TasteProfile {
  const parsed = parseTaste(rawTaste);
  if (parsed) {
    if (Object.keys(parsed.topicWeights).length === 0 && interests.length > 0) {
      const derived = tasteFromInterests(interests, goals);
      return {
        ...parsed,
        topicWeights: derived.topicWeights,
        formatWeights: {
          talks: Math.max(parsed.formatWeights.talks, derived.formatWeights.talks),
          handsOn: Math.max(parsed.formatWeights.handsOn, derived.formatWeights.handsOn),
        },
      };
    }
    return parsed;
  }
  if (interests.length > 0) return tasteFromInterests(interests, goals);
  return emptyTaste();
}

export function parsePlannerProfile(raw: string | null): Profile {
  if (!raw) return { ...EMPTY_PROFILE, taste: emptyTaste() };
  try {
    const parsed = JSON.parse(raw) as Partial<Profile> & { taste?: unknown };
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_PROFILE, taste: emptyTaste() };
    const attendanceDays = Array.isArray(parsed.attendanceDays)
      ? parsed.attendanceDays.filter((day): day is ConferenceDayId =>
          typeof day === "string" && CONFERENCE_DAYS.some((item) => item.id === day),
        )
      : [];
    const goals = Array.isArray(parsed.goals)
      ? parsed.goals.filter((goal): goal is string => PLANNER_GOALS.some((item) => item.id === goal))
      : [];
    const interests = Array.isArray(parsed.interests) ? parsed.interests.map(String).filter(Boolean) : [];
    const VALID_NEEDS = ["mobility", "deaf-hoh", "sensory", "other"] as const;
    const accessibilityNeeds = Array.isArray(parsed.accessibilityNeeds)
      ? (parsed.accessibilityNeeds.filter((need) => 
          typeof need === "string" && VALID_NEEDS.includes(need as any)
        ) as import("./types").AccessibilityNeed[])
      : [];
    const taste = hydrateTaste(interests, goals, parsed.taste);
    return {
      name: typeof parsed.name === "string" ? parsed.name.slice(0, 80) : "",
      role: typeof parsed.role === "string" ? parsed.role.slice(0, 80) : "",
      interests,
      goals,
      attendanceDays,
      onboarded: parsed.onboarded === true,
      demoPersona: parsed.demoPersona === true,
      taste,
      accessibilityNeeds,
    };
  } catch {
    return { ...EMPTY_PROFILE, taste: emptyTaste() };
  }
}

export function readPlannerProfile(attendeeId: string): Profile {
  try {
    return parsePlannerProfile(localStorage.getItem(profileStorageKey(attendeeId)));
  } catch {
    return { ...EMPTY_PROFILE, taste: emptyTaste() };
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
  const vibe = searchQuery.trim() ? [] : vibeQueryExtras(ensureTaste(profile));
  return [searchQuery.trim(), ...extras, ...vibe].filter(Boolean).join(" ").trim();
}

export function profileDisplayName(profile: Profile): string {
  const name = profile.name.trim();
  if (name) return name;
  if (profile.demoPersona) return "Alex Rivera (sample persona)";
  return "Your trip";
}

export function canFinishOnboarding(profile: Profile): { ok: boolean; message: string | null } {
  if (profile.attendanceDays.length < 1) {
    return { ok: false, message: "Pick the conference days you will be on site." };
  }
  return { ok: true, message: null };
}

export { withTaste };
