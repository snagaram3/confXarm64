import { SuggestionRail } from "@/components/layout/SuggestionRail";
import { ToolsPanel } from "@/components/tools/ToolsPanel";
import { VenueMap } from "@/components/map/VenueMap";
import { HomeDashboard } from "@/components/planner/HomeDashboard";
import { ProfileSheet } from "@/components/profile/ProfileSheet";
import { AgendaPanel } from "@/components/agenda/AgendaPanel";
import { FeaturedPanel } from "@/components/sessions/FeaturedPanel";
import { RankedList } from "@/components/sessions/RankedList";
import { SponsorView } from "@/components/sponsor/SponsorView";
import { SearchStatus } from "@/components/status/SearchStatus";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavigatePanel } from "@/components/wayfinding/NavigatePanel";
import { parseToolsPath, toolsPath, type ToolTab } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

export function AppShell() {
  const { view, setView } = useAppState();
  const [toolTab, setToolTab] = useState<ToolTab>(() => parseToolsPath(window.location.pathname) ?? "elasticsearch");

  useEffect(() => {
    function applyPath() {
      const tab = parseToolsPath(window.location.pathname);
      if (tab) {
        setToolTab(tab);
        setView("tools");
      }
    }
    applyPath();
    window.addEventListener("popstate", applyPath);
    return () => window.removeEventListener("popstate", applyPath);
  }, [setView]);

  useEffect(() => {
    if (view !== "tools") return;
    setToolTab(parseToolsPath(window.location.pathname) ?? "dash0");
  }, [view]);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-clip overflow-y-hidden border-t-[3px] border-primary bg-background">
      <TopBar />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {view === "map" ? (
          <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            <VenueMap />
          </section>
        ) : (
          <ScrollArea className="min-h-0 min-w-0 flex-1">
            <main
              className={cn(
                "min-h-0 w-full",
                view === "tools" && "mx-auto max-w-6xl px-3 py-4 sm:px-5",
              )}
            >
              {view === "home" && <HomeDashboard />}
              {view === "agenda" && (
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5">
                  <SearchStatus />
                  <SuggestionRail />
                  <RankedList />
                  <FeaturedPanel />
                </div>
              )}
              {view === "plan" && (
                <div className="mx-auto w-full max-w-3xl px-4 py-5">
                  <AgendaPanel />
                </div>
              )}
              {view === "sponsor" && (
                <div className="mx-auto w-full max-w-3xl px-4 py-5">
                  <SponsorView />
                </div>
              )}
              {view === "navigate" && (
                <div className="mx-auto w-full max-w-3xl px-4 py-5">
                  <NavigatePanel />
                </div>
              )}
              {view === "tools" && (
                <ToolsPanel
                  tab={toolTab}
                  onTab={(next) => {
                    setToolTab(next);
                    window.history.pushState({}, "", toolsPath(next));
                  }}
                />
              )}
            </main>
          </ScrollArea>
        )}
      </div>
      <BottomNav />
      <ProfileSheet />
    </div>
  );
}
