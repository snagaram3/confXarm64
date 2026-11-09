import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

const FIXTURE = `<!doctype html>
<html lang="en">
  <head><title>Floorwise · KCNA26 companion</title></head>
  <body>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header>
      <button type="button">Floorwise</button>
      <button type="button" aria-haspopup="dialog">Accessibility</button>
    </header>
    <main id="main-content">
      <section aria-labelledby="talk-search-heading">
        <h1 id="talk-search-heading">Search the official schedule</h1>
        <label>
          Ask for a talk
          <input type="search" aria-label="Search official sessions with natural language" />
        </label>
        <div role="tablist" aria-label="Conference day">
          <button type="button" role="tab" aria-selected="true">All days</button>
        </div>
        <div role="radiogroup" aria-label="Elasticsearch query mode">
          <button type="button" role="radio" aria-checked="true">Hybrid</button>
        </div>
      </section>
      <article aria-labelledby="talk-1" aria-describedby="talk-why-1">
        <h2 id="talk-1">Runtime security with eBPF</h2>
        <p id="talk-why-1">Why · ES hybrid RRF of BM25 + kNN</p>
        <p>Matched fields · abstract</p>
        <button type="button">Add to itinerary</button>
      </article>
      <section aria-labelledby="itinerary-heading">
        <h2 id="itinerary-heading">Day by day</h2>
        <article aria-labelledby="itinerary-a">
          <p id="itinerary-a">Opening keynote</p>
          <p><span class="sr-only">Room </span>Hall DE</p>
          <button type="button">Remove</button>
        </article>
      </section>
    </main>
    <nav aria-label="Primary">
      <button type="button" aria-current="page">Home</button>
      <button type="button">For you</button>
      <button type="button">Itinerary</button>
      <button type="button">Map</button>
    </nav>
  </body>
</html>`;

describe("axe-core landmarks and labels", () => {
  it("has no serious/critical issues on the planner fixture", async () => {
    const dom = new JSDOM(FIXTURE, { pretendToBeVisual: true, url: "http://127.0.0.1:43180/" });
    const { window } = dom;
    const prior = {
      window: Object.getOwnPropertyDescriptor(globalThis, "window"),
      document: Object.getOwnPropertyDescriptor(globalThis, "document"),
      Node: Object.getOwnPropertyDescriptor(globalThis, "Node"),
    };
    Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: window });
    Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: window.document });
    Object.defineProperty(globalThis, "Node", { configurable: true, writable: true, value: window.Node });
    try {
      const { default: axe } = await import("axe-core");
      const results = await axe.run(window.document.documentElement, {
        rules: {
          "color-contrast": { enabled: false },
        },
      });
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      assert.deepEqual(
        blocking.map((v) => v.id),
        [],
        blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.failureSummary).join(" | ")}`).join("\n"),
      );
    } finally {
      if (prior.window) Object.defineProperty(globalThis, "window", prior.window);
      else Reflect.deleteProperty(globalThis, "window");
      if (prior.document) Object.defineProperty(globalThis, "document", prior.document);
      else Reflect.deleteProperty(globalThis, "document");
      if (prior.Node) Object.defineProperty(globalThis, "Node", prior.Node);
      else Reflect.deleteProperty(globalThis, "Node");
    }
  });
});
