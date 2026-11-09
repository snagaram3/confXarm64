import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dash0DashboardUrl } from "./dash0.ts";
import { publicToolUrl } from "./public-url.ts";
import { radarStatus } from "./radar.ts";

describe("publicToolUrl", () => {
  it("allows http nip.io for in-cluster UIs and rejects credentials or metadata hosts", () => {
    assert.equal(publicToolUrl("http://radar.192.168.49.2.nip.io"), "http://radar.192.168.49.2.nip.io");
    assert.equal(publicToolUrl("http://127.0.0.1:9280"), "http://127.0.0.1:9280");
    assert.equal(publicToolUrl("https://app.dash0.com", { httpsOnly: true, hostSuffix: "dash0.com" }), "https://app.dash0.com");
    assert.equal(publicToolUrl("http://app.dash0.com", { httpsOnly: true, hostSuffix: "dash0.com" }), null);
    assert.equal(publicToolUrl("https://evil.example", { httpsOnly: true, hostSuffix: "dash0.com" }), null);
    assert.equal(publicToolUrl("https://user:pass@app.dash0.com"), null);
    assert.equal(publicToolUrl("http://169.254.169.254/latest"), null);
  });
});

describe("Dash0 dashboard URL", () => {
  it("is hidden without query credentials and defaults to app.dash0.com when they exist", () => {
    const prev = process.env.DASH0_DASHBOARD_URL;
    delete process.env.DASH0_DASHBOARD_URL;
    assert.equal(dash0DashboardUrl(false), null);
    assert.equal(dash0DashboardUrl(true), "https://app.dash0.com");
    process.env.DASH0_DASHBOARD_URL = "https://app.dash0.com/goto/settings";
    assert.equal(dash0DashboardUrl(true), "https://app.dash0.com");
    if (prev === undefined) delete process.env.DASH0_DASHBOARD_URL;
    else process.env.DASH0_DASHBOARD_URL = prev;
  });
});

describe("Skyhook Radar UI env", () => {
  it("exposes RADAR_UI_URL without pretending api.radar.io is Skyhook", () => {
    const prev = process.env.RADAR_UI_URL;
    process.env.RADAR_UI_URL = "http://radar.192.168.49.2.nip.io";
    const snap = radarStatus();
    assert.equal(snap.skyhook.uiUrl, "http://radar.192.168.49.2.nip.io");
    assert.equal(snap.state, "not_configured");
    assert.doesNotMatch(snap.source, /api\.radar\.io/);
    assert.equal(snap.apiHost, "radar.192.168.49.2.nip.io");
    process.env.RADAR_UI_URL = "https://confxarm64.cnh.radarhq.io";
    assert.equal(radarStatus().skyhook.uiUrl, null);
    if (prev === undefined) delete process.env.RADAR_UI_URL;
    else process.env.RADAR_UI_URL = prev;
  });
});
