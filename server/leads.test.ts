import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import express from "express";
import { DuplicateLeadError, LeadsStore, csvCell, leadsToCsv } from "./leads-store.ts";
import { mountLeadRoutes } from "./leads-http.ts";
import { hashToken, provisionSponsor, verifySecret } from "./sponsor-auth.ts";
import { sampleLeads } from "./sample-leads.ts";

const booths = [
  {
    id: "elastic",
    sponsor: "Elastic",
    tagline: "Search",
    boothNumber: "196",
    logo: "/sponsors/elastic.svg",
  },
  {
    id: "grafana",
    sponsor: "Grafana Labs",
    tagline: "LGTM",
    boothNumber: "214",
    logo: "/sponsors/grafana.svg",
  },
];

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "floorwise-leads-"));
}

describe("leads store", () => {
  it("rejects missing unique email per sponsor and isolates tenants", () => {
    const store = new LeadsStore(join(tmp(), "leads.sqlite"));
    const base = {
      name: "Ada",
      email: "ada@example.com",
      company: "",
      role: "",
      interests: "",
      message: "",
      consentText: "text",
      source: "card" as const,
    };
    store.createLead({ ...base, sponsorId: "elastic" });
    assert.throws(
      () => store.createLead({ ...base, sponsorId: "elastic" }),
      DuplicateLeadError,
    );
    store.createLead({ ...base, sponsorId: "grafana" });
    assert.equal(store.listLeads("elastic").length, 1);
    assert.equal(store.listLeads("grafana").length, 1);
    assert.equal(store.getLead("grafana", store.listLeads("elastic")[0].id), null);
    store.close();
  });

  it("persists leads across reopen", () => {
    const file = join(tmp(), "leads.sqlite");
    const first = new LeadsStore(file);
    first.createLead({
      sponsorId: "elastic",
      name: "Ada",
      email: "ada@example.com",
      company: "",
      role: "",
      interests: "",
      message: "",
      consentText: "text",
      source: "card",
    });
    first.close();
    const second = new LeadsStore(file);
    assert.equal(second.listLeads("elastic").length, 1);
    assert.equal(second.listLeads("elastic")[0].email, "ada@example.com");
    second.close();
  });

  it("prefixes csv formula injection", () => {
    assert.equal(csvCell("=CMD()"), `"'=CMD()"`);
    const csv = leadsToCsv([
      {
        id: "1",
        sponsorId: "elastic",
        name: "+Ha",
        email: "a@example.com",
        company: "@x",
        role: "",
        interests: "",
        message: "-1+1",
        status: "new",
        notes: "",
        consentVersion: "floorwise-lead-v1",
        consentText: "t",
        consentedAt: "t",
        source: "card",
        createdAt: "t",
        updatedAt: "t",
      },
    ]);
    assert.match(csv, /"'\+Ha"/);
    assert.match(csv, /"'@x"/);
  });
});

describe("sponsor auth", () => {
  it("fail-closed when unconfigured and verifies only the provisioned sponsor", () => {
    const dir = tmp();
    assert.equal(verifySecret(dir, "elastic", "nope"), false);
    const first = provisionSponsor(dir, "elastic");
    assert.equal(first.created, true);
    const secret = readFileSync(first.secretPath, "utf8").trim();
    assert.equal(verifySecret(dir, "elastic", secret), true);
    assert.equal(verifySecret(dir, "grafana", secret), false);
    const again = provisionSponsor(dir, "elastic");
    assert.equal(again.created, false);
  });
});

describe("lead http", () => {
  it("requires consent, scopes sessions, and hides leads from anonymous users", async () => {
    const dir = tmp();
    const store = new LeadsStore(join(dir, "leads.sqlite"));
    const app = express();
    app.use(express.json());
    mountLeadRoutes(app, { store, dataDir: dir, booths });
    const server = app.listen(0);
    await new Promise<void>((resolve) => server.on("listening", () => resolve()));
    const { port } = server.address() as { port: number };
    const base = `http://127.0.0.1:${port}`;

    const denied = await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sponsorId: "elastic",
        name: "Ada",
        email: "ada@example.com",
        consent: false,
        consentVersion: "floorwise-lead-v1",
        source: "card",
      }),
    });
    assert.equal(denied.status, 400);
    assert.equal(((await denied.json()) as { code: string }).code, "consent_required");

    const created = await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sponsorId: "elastic",
        name: "Ada Lovelace",
        email: "ada@example.com",
        consent: true,
        consentVersion: "floorwise-lead-v1",
        source: "card",
      }),
    });
    assert.equal(created.status, 201);

    const meta = await fetch(`${base}/api/leads/meta/elastic`);
    assert.equal(meta.status, 200);
    assert.equal(((await meta.json()) as { consentVersion: string }).consentVersion, "floorwise-lead-v1");

    const anon = await fetch(`${base}/api/sponsor-portal/leads`);
    assert.equal(anon.status, 401);

    const unconfigured = await fetch(`${base}/api/sponsor-portal/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sponsorId: "elastic", secret: "x" }),
    });
    assert.equal(unconfigured.status, 503);

    const elastic = provisionSponsor(dir, "elastic");
    const grafana = provisionSponsor(dir, "grafana");
    const elasticSecret = readFileSync(elastic.secretPath, "utf8").trim();
    const grafanaSecret = readFileSync(grafana.secretPath, "utf8").trim();

    const loginElastic = await fetch(`${base}/api/sponsor-portal/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sponsorId: "elastic", secret: elasticSecret }),
    });
    assert.equal(loginElastic.status, 200);
    const cookie = loginElastic.headers.get("set-cookie") ?? "";
    assert.match(cookie, /HttpOnly/);

    const listed = await fetch(`${base}/api/sponsor-portal/leads`, {
      headers: { cookie },
    });
    const listedJson = (await listed.json()) as { leads: Array<{ id: string; email: string }> };
    assert.equal(listed.status, 200);
    assert.equal(listedJson.leads.length, 1);
    assert.equal(listedJson.leads[0].email, "ada@example.com");

    await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sponsorId: "grafana",
        name: "Grace",
        email: "grace@example.com",
        consent: true,
        consentVersion: "floorwise-lead-v1",
        source: "link",
      }),
    });

    const stillElastic = await fetch(`${base}/api/sponsor-portal/leads`, {
      headers: { cookie },
    });
    const stillJson = (await stillElastic.json()) as { leads: Array<{ email: string }> };
    assert.equal(stillJson.leads.length, 1);

    const loginGrafana = await fetch(`${base}/api/sponsor-portal/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sponsorId: "grafana", secret: grafanaSecret }),
    });
    const grafanaCookie = loginGrafana.headers.get("set-cookie") ?? "";
    const grafanaList = await fetch(`${base}/api/sponsor-portal/leads`, {
      headers: { cookie: grafanaCookie },
    });
    const grafanaJson = (await grafanaList.json()) as { leads: Array<{ id: string; email: string }> };
    assert.equal(grafanaJson.leads.map((l) => l.email).join(), "grace@example.com");

    const elasticLeadId = listedJson.leads[0].id;
    const grafanaLeadId = grafanaJson.leads[0].id;
    const crossGet = await fetch(`${base}/api/sponsor-portal/leads/${grafanaLeadId}`, {
      headers: { cookie },
    });
    assert.equal(crossGet.status, 404);
    const patched = await fetch(`${base}/api/sponsor-portal/leads/${elasticLeadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ status: "contacted", notes: "Manual status only" }),
    });
    assert.equal(patched.status, 200);
    assert.equal(((await patched.json()) as { lead: { status: string } }).lead.status, "contacted");
    const crossPatch = await fetch(`${base}/api/sponsor-portal/leads/${grafanaLeadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ status: "qualified" }),
    });
    assert.equal(crossPatch.status, 404);
    const filtered = await fetch(`${base}/api/sponsor-portal/leads?status=contacted&q=Ada`, {
      headers: { cookie },
    });
    assert.equal(((await filtered.json()) as { leads: unknown[] }).leads.length, 1);
    const csv = await fetch(`${base}/api/sponsor-portal/leads.csv`, {
      headers: { cookie },
    });
    const csvText = await csv.text();
    assert.match(csvText, /ada@example.com/);
    assert.doesNotMatch(csvText, /grace@example.com/);
    const formulaLead = await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sponsorId: "elastic",
        name: "=1+1",
        email: "formula@example.com",
        company: "+Ha",
        consent: true,
        consentVersion: "floorwise-lead-v1",
        source: "card",
      }),
    });
    assert.equal(formulaLead.status, 201);
    const csv2 = await fetch(`${base}/api/sponsor-portal/leads.csv`, { headers: { cookie } });
    const csv2Text = await csv2.text();
    assert.match(csv2Text, /"'=1\+1"/);
    assert.match(csv2Text, /"'\+Ha"/);
    const crossDelete = await fetch(`${base}/api/sponsor-portal/leads/${grafanaLeadId}`, {
      method: "DELETE",
      headers: { cookie },
    });
    assert.equal(crossDelete.status, 404);
    const removed = await fetch(`${base}/api/sponsor-portal/leads/${elasticLeadId}`, {
      method: "DELETE",
      headers: { cookie },
    });
    assert.equal(removed.status, 200);

    const demo = await fetch(`${base}/api/sponsor-portal/demo/leads?sponsorId=elastic`);
    const demoJson = (await demo.json()) as { demo: boolean; leads: Array<{ email: string }> };
    assert.equal(demoJson.demo, true);
    assert.ok(demoJson.leads.every((l) => l.email.endsWith("example.com") || l.email.endsWith("example.org")));

    assert.ok(hashToken("a") !== hashToken("b"));
    assert.equal(sampleLeads("elastic", "Elastic").length, 2);

    store.close();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });
});
