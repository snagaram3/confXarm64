import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import express from "express";
import type { Server } from "node:http";
import { mountToolRoutes } from "../tools-http.ts";

describe("tools HTTP boundaries", () => {
  let server: Server;
  let base = "";

  before(async () => {
    const app = express();
    app.use(express.json());
    mountToolRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no addr");
    base = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it("rejects client-supplied upstream URLs", async () => {
    const res = await fetch(`${base}/api/tools/dash0?url=https://evil.example`);
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.match(body.error, /rejected/i);
  });

  it("requires Radar consent and ignores lookup on GET", async () => {
    const denied = await fetch(`${base}/api/tools/radar/lookup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ latitude: 40.76, longitude: -111.89 }),
    });
    assert.equal(denied.status, 400);
    const get = await fetch(`${base}/api/tools/radar`);
    const radar = (await get.json()) as { lookup: unknown; window: string };
    assert.equal(radar.lookup, null);
    assert.match(radar.window, /does not locate/i);
  });

  it("returns needs-setup Sonar without inventing a gate", async () => {
    const prev = { ...process.env };
    delete process.env.SONAR_HOST_URL;
    delete process.env.SONAR_TOKEN;
    delete process.env.SONAR_PROJECT_KEY;
    const res = await fetch(`${base}/api/tools/sonar`);
    const body = (await res.json()) as { state: string; qualityGate: { status: string | null }; missingEnv: string[] };
    assert.equal(body.state, "not_configured");
    assert.equal(body.qualityGate.status, null);
    assert.ok(body.missingEnv.includes("SONAR_TOKEN"));
    Object.assign(process.env, prev);
  });

  it("isolates live engagement from synthetic totals", async () => {
    const live = await fetch(`${base}/api/tools/dash0/engagement?mode=live`);
    const liveBody = (await live.json()) as { mode: string; data: null; available: boolean };
    const syn = await fetch(`${base}/api/tools/dash0/engagement?mode=synthetic`);
    const synBody = (await syn.json()) as { mode: string; totals: { participants: number }; label: string };
    assert.equal(liveBody.mode, "live");
    assert.equal(liveBody.available, false);
    assert.equal(liveBody.data, null);
    assert.equal(synBody.mode, "synthetic");
    assert.ok(synBody.totals.participants > 0);
    assert.match(synBody.label, /Synthetic/);
  });

  it("serves the Perses dashboard definition without secrets", async () => {
    const res = await fetch(`${base}/api/tools/dash0/dashboard.json`);
    const body = (await res.json()) as { kind: string; spec: { display: { name: string } } };
    assert.equal(body.kind, "Dashboard");
    assert.match(body.spec.display.name, /synthetic/i);
    const text = JSON.stringify(body);
    assert.doesNotMatch(text, /Bearer /);
    assert.doesNotMatch(text, /SONAR_TOKEN/);
  });
});
