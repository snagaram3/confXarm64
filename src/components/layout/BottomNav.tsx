import type { AppView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { Building2, CalendarDays, ListOrdered, Map, Navigation } from "lucide-react";

const ITEMS: { id: AppView; label: string; icon: typeof Map }[] = [
  { id: "map", label: "Map", icon: Map },
  { id: "agenda", label: "For you", icon: ListOrdered },
  { id: "plan", label: "Agenda", icon: CalendarDays },
  { id: "sponsor", label: "Booths", icon: Building2 },
  { id: "navigate", label: "255", icon: Navigation },
];

export function BottomNav() {
  const { view, setView, startNavTo255, navigating, selectBooth, sponsorBoothId, setFloor } =
    useAppState();

  return (
    <nav
      aria-label="Primary"
      className="grid grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)]"
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
              if (item.id === "navigate") {
                if (!navigating) startNavTo255();
                else setView("navigate");
                return;
              }
              if (item.id === "sponsor") {
                selectBooth(sponsorBoothId);
                setFloor(1);
              }
              setView(item.id);
              if (window.location.pathname.startsWith("/tools")) {
                window.history.pushState({}, "", "/");
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
