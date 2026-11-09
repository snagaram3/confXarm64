export const CONSENT_VERSION = "floorwise-lead-v1";

export const CONSENT_NOTICE =
  "confXarm64 collects this for the exhibitor you choose. It is not an official Linux Foundation, CNCF, or sponsor-owned website, and it is not organizer registration.";

export function consentText(sponsorName: string): string {
  return (
    `I agree that confXarm64 may share the name, email, and any optional details I type ` +
    `with ${sponsorName} so they can contact me about their products or services after this event. ` +
    `Saving a booth as Must go, Maybe, or Meh, or being nearby, is not consent and does not create a lead.`
  );
}

export const LEAD_SOURCES = ["card", "link"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = ["new", "qualified", "contacted"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function isLeadSource(value: string): value is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(value);
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}
