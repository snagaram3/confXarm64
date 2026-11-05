import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { embed, VECTOR_DIMS } from "./embed.ts";
import { es, INDEX, waitForElasticsearch } from "./es.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type Catalog = {
  sessions: Array<{
    id: string;
    title: string;
    speaker: string;
    company: string;
    roomId: string;
    floor: number;
    track: string;
    tags: string[];
    abstract: string;
  }>;
  booths: Array<{
    id: string;
    sponsor: string;
    tagline: string;
    locationLabel?: string;
    boothNumber?: string;
    floor: number;
    tags: string[];
    pitch: string;
    visitors: Array<{
      id: string;
      name: string;
      role: string;
      company: string;
      interests: string[];
      metersAway: number;
    }>;
  }>;
};

export async function seedIndex(): Promise<{ documents: number }> {
  await waitForElasticsearch();
  const catalog = JSON.parse(
    readFileSync(resolve(root, "src/data/catalog.json"), "utf8"),
  ) as Catalog;

  const exists = await es.indices.exists({ index: INDEX });
  if (exists) {
    await es.indices.delete({ index: INDEX });
  }

  await es.indices.create({
    index: INDEX,
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
    mappings: {
      properties: {
        kind: { type: "keyword" },
        id: { type: "keyword" },
        boothId: { type: "keyword" },
        roomId: { type: "keyword" },
        floor: { type: "integer" },
        title: { type: "text", analyzer: "english" },
        abstract: { type: "text", analyzer: "english" },
        tags: {
          type: "text",
          analyzer: "english",
          fields: { raw: { type: "keyword" } },
        },
        speaker: { type: "text" },
        track: { type: "text", fields: { raw: { type: "keyword" } } },
        role: { type: "text" },
        company: { type: "text" },
        embedding: {
          type: "dense_vector",
          dims: VECTOR_DIMS,
          index: true,
          similarity: "cosine",
        },
      },
    },
  });

  const ops: unknown[] = [];

  for (const session of catalog.sessions) {
    ops.push({ index: { _index: INDEX, _id: `session:${session.id}` } });
    ops.push({
      kind: "session",
      id: session.id,
      roomId: session.roomId,
      floor: session.floor,
      title: session.title,
      abstract: session.abstract,
      tags: session.tags,
      speaker: `${session.speaker} ${session.company}`,
      track: session.track,
      embedding: embed([session.title, session.abstract, ...session.tags, session.track]),
    });
  }

  for (const booth of catalog.booths) {
    ops.push({ index: { _index: INDEX, _id: `booth:${booth.id}` } });
    ops.push({
      kind: "booth",
      id: booth.id,
      roomId: booth.locationLabel ?? booth.boothNumber ?? booth.id,
      floor: booth.floor,
      title: `${booth.sponsor} ${booth.tagline}`,
      abstract: booth.pitch,
      tags: booth.tags,
      speaker: booth.sponsor,
      track: "sponsor",
      embedding: embed([booth.sponsor, booth.tagline, booth.pitch, ...booth.tags]),
    });
    for (const visitor of booth.visitors) {
      ops.push({ index: { _index: INDEX, _id: `visitor:${booth.id}:${visitor.id}` } });
      ops.push({
        kind: "visitor",
        id: visitor.id,
        boothId: booth.id,
        title: `${visitor.name} ${visitor.role}`,
        abstract: visitor.interests.join(" "),
        tags: visitor.interests,
        speaker: visitor.company,
        role: visitor.role,
        company: visitor.company,
        embedding: embed([visitor.role, ...visitor.interests]),
      });
    }
  }

  const bulk = await es.bulk({ refresh: true, operations: ops });
  if (bulk.errors) {
    const first = bulk.items.find((item) => item.index?.error);
    throw new Error(
      `Bulk index failed: ${JSON.stringify(first?.index?.error ?? bulk.items[0])}`,
    );
  }

  return { documents: ops.length / 2 };
}

const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry.endsWith("seed.ts") || entry.endsWith("seed.js")) {
  seedIndex()
    .then((r) => {
      console.log(`Indexed ${r.documents} docs into ${INDEX}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
