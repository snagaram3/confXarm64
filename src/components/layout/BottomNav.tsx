import { catalog } from "@/lib/catalog";
import { mustGoBooths } from "@/lib/expo-pins";
import type { AppView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { Heart, Home, Map, Search } from "lucide-react";

const ITEMS: { id: "home" | "agenda" | "must" | "map"; label: string; icon: typeof Map }[] = [
  { id: "home", label: "Plan", icon: Home },
  { id: "agenda", label: "Search", icon: Search },
  { id: "must", label: "Must Go", icon: Heart },
  { id: "map", label: "Map", icon: Map },
];

export function BottomNav() {
  const { view, setView, setMapSurface, sponsorPrefs } = useAppState();
  const mustCount = mustGoBooths(catalog.booths, sponsorPrefs).length;

  return (
    <nav
      aria-label="Mobile"
      className="grid grid-cols-4 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {ITEMS.map((item) => {
        const active = item.id === "must" ? false : view === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => {
              if (item.id === "must") {
                setMapSurface("expo");
                setView("map");
                return;
              }
              setView(item.id as AppView);
              if (window.location.pathname.startsWith("/tools")) {
                window.history.pushState({}, "", item.id === "map" ? "/map" : "/");
              }
            }}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
            {item.id === "must" && mustCount > 0 ? <span className="font-mono text-[10px] text-[#a3341c]">{mustCount}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
