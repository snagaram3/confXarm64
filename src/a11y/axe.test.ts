import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JSDOM } from "jsdom";

const FIXTURE = `<!doctype html>
<html lang="en">
  <head><title>confXarm64 · Plan</title></head>
  <body>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header>
      <button type="button" aria-label="confXarm64 home">confXarm64</button>
      <nav aria-label="Primary">
        <button type="button" aria-current="page">Plan</button>
        <button type="button">Search</button>
        <button type="button">Must Go<span>1</span></button>
        <button type="button">Map</button>
        <button type="button">Health</button>
      </nav>
      <button type="button" aria-haspopup="dialog">saved in this browser</button>
    </header>
    <main id="main-content">
      <section aria-labelledby="tasteH">
        <h2 id="tasteH">This or that</h2>
        <div role="group" aria-label="Taste deck. Use left and right arrow keys to pick, or the buttons." tabindex="0">
          <button type="button" aria-label="Pick this: Debugging a cluster at 3am">Debugging a cluster at 3am</button>
          <button type="button" aria-label="Pick that: Designing a platform for 400 devs">Designing a platform for 400 devs</button>
        </div>
        <button type="button" aria-label="Back to previous pair">Back</button>
        <button type="button">Skip</button>
        <div role="group" aria-label="Vibe dials">
          <label>
            Depth
            <input type="range" min="0" max="100" value="72" aria-valuetext="72, deep" />
          </label>
        </div>
      </section>
      <section aria-labelledby="hero">
        <h1 id="hero">Your KubeCon, ranked by taste.</h1>
        <div role="search">
          <label for="q">Search official sessions and exhibitors</label>
          <input id="q" type="search" aria-label="Search official sessions and exhibitors" />
          <span tabindex="0" aria-describedby="modeTip">HYBRID · BM25 + kNN</span>
          <div id="modeTip" role="tooltip">index sessions, exhibitors · fusion RRF</div>
        </div>
        <article aria-labelledby="pick-1">
          <h2 id="pick-1">Sample: eBPF tracing without code changes</h2>
          <p>Because you like eBPF</p>
          <button type="button" aria-pressed="true">Added to Tue</button>
        </article>
        <div aria-label="Try a search">
          <button type="button">eBPF</button>
        </div>
      </section>
      <aside aria-label="Your day and Must Go booths">
        <h2>Your day</h2>
        <div role="tablist" aria-label="Conference day">
          <button type="button" role="tab" aria-selected="true">Tue</button>
        </div>
        <ol>
          <li>
            <p>Keynotes</p>
            <p>Main hall · Sample</p>
          </li>
        </ol>
        <h2>Must Go booths</h2>
        <ul>
          <li>Runtime security Sample</li>
        </ul>
      </aside>
    </main>
    <nav aria-label="Mobile">
      <button type="button" aria-current="page">Plan</button>
      <button type="button">Search</button>
      <button type="button">Must Go</button>
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
