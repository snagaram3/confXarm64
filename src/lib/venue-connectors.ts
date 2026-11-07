import connectorsJson from "@/data/venue-connectors.json" with { type: "json" };

export type ConnectorKind = "elevator" | "escalator" | "stairs" | "elevator-lobby" | "instruction";

export interface VenueConnector {
  id: string;
  kind: ConnectorKind;
  matchedText: string;
  building: string;
  level: number | null;
  nx: number;
  ny: number;
  pdfX: number;
  pdfY: number;
  nearbyLabels: string[];
  stepFreeVerified: false;
  note: string;
}

const raw = connectorsJson as {
  map: string;
  image: string;
  source: {
    id: string;
    file: string;
    page: number;
    url: string;
    retrieved: string;
    authority: string;
    sha256: string;
    method: string;
  };
  pdfSize: [number, number];
  note: string;
  connectors: VenueConnector[];
};

export const VENUE_CONNECTOR_SOURCE = raw.source;
export const VENUE_CONNECTOR_NOTE = raw.note;
export const VENUE_CONNECTORS: VenueConnector[] = raw.connectors;

export function connectorTitle(connector: VenueConnector): string {
  if (connector.kind === "instruction") return "Printed instruction (not a machine)";
  if (connector.kind === "elevator-lobby") {
    return connector.level
      ? `Elevator lobby · ${connector.building} L${connector.level}`
      : `Elevator lobby · ${connector.building}`;
  }
  if (connector.kind === "elevator") return `Elevator label · ${connector.building}`;
  if (connector.kind === "escalator") return `Escalator label · ${connector.building}`;
  return `Stairs label · ${connector.building}`;
}

export function isWalkableConnector(_connector: VenueConnector): boolean {
  return false;
}

export function stepFreeMayUse(connector: VenueConnector): boolean {
  if (connector.kind === "stairs" || connector.kind === "escalator") return false;
  return false;
}
