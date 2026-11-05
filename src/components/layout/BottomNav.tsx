import type { AppView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { Building2, ListOrdered, Map, Navigation } from "lucide-react";

const ITEMS: { id: AppView; label: string; icon: typeof Map }[] = [
  { id: "map", label: "Map", icon: Map },
  { id: "agenda", label: "Agenda", icon: ListOrdered },
  { id: "navigate", label: "Go", icon: Navigation },
  { id: "sponsor", label: "Sponsor", icon: Building2 },
];

export function BottomNav() {
  const { view, setView, startNavTo255, navigating, selectBooth, sponsorBoothId, setFloor } =
    useAppState();

  return (
    <nav className="grid grid-cols-4 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map((item) => {
        const active = view === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
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
            }}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
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
