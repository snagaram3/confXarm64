# Demo integrity

- Home (`/`) is the trip planner (This-or-That / itinerary preview). Map lives at `/map` and Expo. Do not mount WebGL as the default home.
- SAMPLE 255 wayfinding stays on the Sample schematic and is labeled SAMPLE. Do not merge it into the official Elasticsearch catalog.
- Official sessions, rooms, and expo booth numbers come from seeded official data. Do not invent celebrity attendees, live occupancy, surveyed indoor GPS, or step-free routes presented as fact.
- Must/Maybe/Meh colors on the map come from Elasticsearch rank, not a client-side catalog score.
- `/sponsor-portal` stays tenant-scoped; the demo dashboard is read-only sample data.
- Connect / share-my-details requires an explicit consent checkbox and must not fire from Must/Maybe/Meh.
