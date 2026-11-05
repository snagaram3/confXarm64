import type { LeadRecord } from "./leads-store.ts";

/** Read-only synthetic rows. Never written to the real lead store. */
export function sampleLeads(sponsorId: string, sponsorName: string): LeadRecord[] {
  const now = "2026-11-05T18:00:00.000Z";
  return [
    {
      id: "sample-1",
      sponsorId,
      name: "Sample Attendee",
      email: "sample.attendee@example.com",
      company: "Example Co",
      role: "Platform Engineer",
      interests: "OpenTelemetry",
      message: "SAMPLE DATA — not a real person.",
      status: "new",
      notes: "Labeled sample only.",
      consentVersion: "floorwise-lead-v1",
      consentText: `Sample consent text for ${sponsorName}`,
      consentedAt: now,
      source: "link",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "sample-2",
      sponsorId,
      name: "Demo Visitor",
      email: "demo.visitor@example.org",
      company: "Example Org",
      role: "SRE",
      interests: "Kubernetes",
      message: "SAMPLE DATA — reserved example domain.",
      status: "qualified",
      notes: "",
      consentVersion: "floorwise-lead-v1",
      consentText: `Sample consent text for ${sponsorName}`,
      consentedAt: now,
      source: "card",
      createdAt: now,
      updatedAt: now,
    },
  ];
}
