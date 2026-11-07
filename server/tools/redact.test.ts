import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dash0ApiBase } from "./dash0.ts";
import { parseCoords } from "./radar.ts";
import { headerNameLooksSecret, redactText } from "./redact.ts";
import { sonarMissingEnv } from "./sonar.ts";

describe("tool redaction and auth boundaries", () => {
  it("strips bearer tokens and Radar/Sonar key material", () => {
    const raw =
      "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb and prj_live_sk_abc123xyz";
    const out = redactText(raw);
    assert.doesNotMatch(out, /eyJhbGciOi/);
    assert.doesNotMatch(out, /prj_live_sk_abc123xyz/);
    assert.match(out, /\[redacted\]/);
  });

  it("flags secret header names", () => {
    assert.equal(headerNameLooksSecret("Authorization"), true);
    assert.equal(headerNameLooksSecret("Content-Type"), false);
  });
});

describe("provider URL and coordinate guards", () => {
  it("rejects a client-forged Dash0 host via env validation", () => {
    const prev = process.env.DASH0_API_BASE_URL;
    process.env.DASH0_API_BASE_URL = "https://evil.example/api";
    assert.equal(dash0ApiBase(), null);
    process.env.DASH0_API_BASE_URL = "https://api.us-west-2.aws.dash0.com";
    assert.equal(dash0ApiBase(), "https://api.us-west-2.aws.dash0.com");
    if (prev === undefined) delete process.env.DASH0_API_BASE_URL;
    else process.env.DASH0_API_BASE_URL = prev;
  });

  it("rejects invalid Radar coordinates", () => {
    assert.equal(parseCoords(999, 0), null);
    assert.equal(parseCoords("x", "y"), null);
    assert.deepEqual(parseCoords(40.76, -111.89), { latitude: 40.76, longitude: -111.89 });
  });
});

describe("not-configured adapters", () => {
  it("lists Sonar env names without inventing a token", () => {
    const prev = {
      url: process.env.SONAR_HOST_URL,
      token: process.env.SONAR_TOKEN,
      key: process.env.SONAR_PROJECT_KEY,
    };
    delete process.env.SONAR_HOST_URL;
    delete process.env.SONAR_TOKEN;
    delete process.env.SONAR_PROJECT_KEY;
    const missing = sonarMissingEnv();
    assert.ok(missing.includes("SONAR_TOKEN"));
    assert.ok(missing.includes("SONAR_PROJECT_KEY"));
    if (prev.url) process.env.SONAR_HOST_URL = prev.url;
    if (prev.token) process.env.SONAR_TOKEN = prev.token;
    if (prev.key) process.env.SONAR_PROJECT_KEY = prev.key;
  });
});
