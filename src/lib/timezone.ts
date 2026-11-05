export const CONFERENCE_TZ = "America/Denver";
export const DISPLAY_TIMEZONES = ["America/Denver", "America/Chicago"] as const;
export type DisplayTimeZone = (typeof DISPLAY_TIMEZONES)[number];

export const TZ_LABEL: Record<DisplayTimeZone, string> = {
  "America/Denver": "America/Denver · conference MST (UTC−7 in Nov 2026)",
  "America/Chicago": "America/Chicago · local CST (UTC−6 in Nov 2026)",
};

export function parseInstant(iso: string): Date {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp: ${iso}`);
  return date;
}

export function formatInZone(
  iso: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(parseInstant(iso));
}

export function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parseInstant(iso));
}

export function timeHm(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(parseInstant(iso));
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(parseInstant(iso).getTime() + minutes * 60_000).toISOString();
}
