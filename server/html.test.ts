import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeHtmlServer, trustedPhoto } from "./html.ts";

describe("html sanitizer", () => {
  it("strips scripts and keeps trusted sessionize photos", () => {
    const html = `<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>`;
    const out = sanitizeHtmlServer(html);
    assert.equal(out.includes("script"), false);
    assert.equal(trustedPhoto("https://cdn.sessionize.com/image/x.jpg")?.includes("sessionize.com"), true);
    assert.equal(trustedPhoto("https://evil.example/x.jpg"), null);
  });
});
