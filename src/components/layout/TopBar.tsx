import { catalog } from "@/lib/catalog";
import { mustGoBooths } from "@/lib/expo-pins";
import { toolsPath } from "@/lib/tools";
import { useAppState } from "@/state/app-state";
import { useLayoutEffect, useRef } from "react";

type NavId = "home" | "agenda" | "must" | "map" | "tools";

const NAV: Array<{ id: NavId; label: string }> = [
  { id: "home", label: "Plan" },
  { id: "agenda", label: "Search" },
  { id: "must", label: "Must Go" },
  { id: "map", label: "Map" },
  { id: "tools", label: "Health" },
];

export function TopBar() {
  const { view, setView, setMapSurface, setProfileOpen, sponsorPrefs } = useAppState();
  const navRef = useRef<HTMLElement>(null);
  const inkRef = useRef<HTMLSpanElement>(null);
  const mustCount = mustGoBooths(catalog.booths, sponsorPrefs).length;
  const current: NavId =
    view === "agenda" ? "agenda" : view === "map" ? "map" : view === "tools" ? "tools" : "home";

  const go = (id: NavId) => {
    if (id === "must") {
      setMapSurface("expo");
      setView("map");
      if (window.location.pathname.startsWith("/tools")) window.history.pushState({}, "", "/map");
      return;
    }
    if (id === "tools") {
      setView("tools");
      window.history.pushState({}, "", toolsPath("elasticsearch"));
      return;
    }
    setView(id === "agenda" ? "agenda" : id === "map" ? "map" : "home");
    if (window.location.pathname.startsWith("/tools")) {
      window.history.pushState({}, "", id === "map" ? "/map" : "/");
    }
  };

  const placeInk = (el: HTMLElement | null) => {
    const nav = navRef.current;
    const ink = inkRef.current;
    if (!nav || !ink || !el) return;
    const r = el.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    ink.style.transform = `translateX(${r.left - n.left + 14}px) scaleX(${Math.max((r.width - 28) / 100, 0.2)})`;
  };

  useLayoutEffect(() => {
    placeInk(navRef.current?.querySelector("[aria-current='page']") ?? null);
  }, [view, mustCount]);

  return (
    <header className="fg-header fg-shell">
      <button type="button" className="fg-logo" onClick={() => go("home")} aria-label="confXarm64 home">
        conf<b>X</b>arm64
      </button>
      <nav
        className="fg-nav"
        aria-label="Primary"
        ref={navRef}
        onMouseLeave={() => placeInk(navRef.current?.querySelector("[aria-current='page']") ?? null)}
      >
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={item.id === current ? "page" : undefined}
            onClick={() => go(item.id)}
            onMouseEnter={(event) => placeInk(event.currentTarget)}
            onFocus={(event) => placeInk(event.currentTarget)}
          >
            {item.label}
            {item.id === "must" && mustCount > 0 ? <span className="fg-count">{mustCount}</span> : null}
          </button>
        ))}
        <span className="fg-ink" ref={inkRef} aria-hidden="true" />
      </nav>
      <button type="button" className="fg-saved" onClick={() => setProfileOpen(true)} aria-haspopup="dialog">
        saved in this browser
      </button>
    </header>
  );
}
