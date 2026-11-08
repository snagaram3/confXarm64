import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cycleSponsorPref,
  parseSponsorPrefs,
  prefLabel,
  prefStorageKey,
  readAttendeeSponsorPrefs,
  PREF_STORAGE_KEY,
} from "./sponsor-prefs.ts";

describe("sponsor prefs", () => {
  it("treats missing keys as unrated, not Meh", () => {
    const prefs = parseSponsorPrefs(JSON.stringify({ elastic: "must" }));
    assert.equal(prefs.elastic, "must");
    assert.equal(prefs.grafana, undefined);
    assert.equal(prefLabel(prefs.grafana), "Unrated");
    assert.notEqual(prefLabel(undefined), "Meh");
  });

  it("ignores invalid stored values", () => {
    const prefs = parseSponsorPrefs(JSON.stringify({ elastic: "MUST", dash0: 1, radar: "meh" }));
    assert.deepEqual(prefs, { radar: "meh" });
  });

  it("scopes stored prefs to an attendee id so two visitors do not share Must go", () => {
    assert.notEqual(prefStorageKey("att-a"), prefStorageKey("att-b"));
    assert.match(prefStorageKey("att-a"), /\.att-a$/);
    const a = parseSponsorPrefs(JSON.stringify({ elastic: "must" }));
    const b = parseSponsorPrefs(null);
    assert.equal(a.elastic, "must");
    assert.equal(b.elastic, undefined);
  });

  it("migrates legacy prefs once, then keeps empty bags from leaking across attendees", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    store.set(PREF_STORAGE_KEY, JSON.stringify({ elastic: "must" }));
    const first = readAttendeeSponsorPrefs(storage, "att-a");
    assert.equal(first.elastic, "must");
    assert.equal(store.get(PREF_STORAGE_KEY), undefined);
    assert.equal(store.get(prefStorageKey("att-a")), JSON.stringify({ elastic: "must" }));
    const second = readAttendeeSponsorPrefs(storage, "att-b");
    assert.equal(second.elastic, undefined);
    storage.setItem(prefStorageKey("att-a"), JSON.stringify({}));
    const cleared = readAttendeeSponsorPrefs(storage, "att-a");
    assert.equal(cleared.elastic, undefined);
  });

  it("clears a rank when the same option is chosen again", () => {
    assert.equal(cycleSponsorPref("maybe", "maybe"), undefined);
    assert.equal(cycleSponsorPref(undefined, "must"), "must");
    assert.equal(cycleSponsorPref("must", "meh"), "meh");
  });
});
