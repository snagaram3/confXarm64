import type { AppView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { CalendarDays, Compass, Home, Map } from "lucide-react";

const ITEMS: { id: AppView; label: string; icon: typeof Map }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "agenda", label: "For you", icon: Compass },
  { id: "plan", label: "Itinerary", icon: CalendarDays },
  { id: "map", label: "Map", icon: Map },
];

export function BottomNav() {
  const { view, setView } = useAppState();

  return (
    <nav
      aria-label="Primary"
      className="grid grid-cols-4 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)]"
    >
      {ITEMS.map((item) => {
        const active = view === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => {
              setView(item.id);
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
          </button>
        );
      })}
    </nav>
  );
}
