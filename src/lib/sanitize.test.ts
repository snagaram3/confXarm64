import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeHtmlServer } from "./sanitize.ts";

describe("sanitizeHtmlServer", () => {
  it("strips scripts and event handlers", () => {
    const raw = `<p onclick="alert(1)">Hi</p><script>steal()</script><a href="javascript:alert(1)">x</a>`;
    const out = sanitizeHtmlServer(raw);
    assert.equal(out.includes("script"), false);
    assert.equal(out.includes("onclick"), false);
    assert.equal(out.includes("javascript:"), false);
    assert.match(out, /<p>Hi<\/p>/);
  });
});
