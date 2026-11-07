import { SuggestionRail } from "@/components/layout/SuggestionRail";
import { ToolsPanel } from "@/components/tools/ToolsPanel";
import { VenueMap } from "@/components/map/VenueMap";
import { ProfileSheet } from "@/components/profile/ProfileSheet";
import { AgendaPanel } from "@/components/agenda/AgendaPanel";
import { FeaturedPanel } from "@/components/sessions/FeaturedPanel";
import { RankedList } from "@/components/sessions/RankedList";
import { SessionDetail } from "@/components/sessions/SessionDetail";
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
  const { view, setView, mapFocus } = useAppState();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toolTab, setToolTab] = useState<ToolTab>(() => parseToolsPath(window.location.pathname) ?? "elasticsearch");

  useEffect(() => {
    function applyPath() {
      const tab = parseToolsPath(window.location.pathname);
      if (tab) {
        setToolTab(tab);
        setView("tools");
        setSheetOpen(true);
      }
    }
    applyPath();
    window.addEventListener("popstate", applyPath);
    return () => window.removeEventListener("popstate", applyPath);
  }, [setView]);

  useEffect(() => {
    if (view !== "tools") return;
    setToolTab(parseToolsPath(window.location.pathname) ?? "dash0");
    setSheetOpen(true);
  }, [view]);

  useEffect(() => {
    if (view === "map" || view === "sponsor") setSheetOpen(false);
  }, [view, mapFocus?.token]);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-clip overflow-y-hidden border-t-[3px] border-primary bg-background">
      <TopBar />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <VenueMap />
        </section>
        <aside
          className={cn(
            "flex min-h-0 min-w-0 flex-col bg-card/95",
            "max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:max-w-full max-lg:rounded-t-3xl max-lg:border-t max-lg:border-border max-lg:shadow-[0_-16px_40px_rgba(28,25,23,0.14)]",
            view === "tools" || sheetOpen
              ? view === "tools"
                ? "max-lg:h-[min(82vh,46rem)]"
                : "max-lg:h-[min(38vh,20rem)]"
              : "max-lg:h-[5.75rem] max-lg:landscape:h-0 max-lg:landscape:overflow-hidden max-lg:landscape:border-0 max-lg:landscape:shadow-none",
            view === "tools"
              ? "lg:h-full lg:w-[min(56vw,44rem)] lg:shrink-0 lg:border-l lg:border-border"
              : "lg:h-full lg:w-[min(38vw,26rem)] lg:shrink-0 lg:border-l lg:border-border",
            "overflow-x-hidden",
          )}
        >
          <button
            type="button"
            className="flex min-h-11 w-full flex-col items-center justify-center lg:hidden"
            onClick={() => setSheetOpen((v) => !v)}
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? "Collapse details" : "Expand details"}
          >
            <span className="mt-2 h-1.5 w-12 rounded-full bg-border" />
            <span className="sr-only">Resize details sheet</span>
          </button>
          <ScrollArea className="min-h-0 min-w-0 w-full flex-1">
            <div className="flex w-full min-w-0 max-w-full flex-col gap-3 overflow-x-clip p-3 pb-4 lg:gap-4 lg:p-5">
              {view !== "tools" && <SearchStatus />}
              {view !== "navigate" && view !== "tools" && view !== "agenda" && <SuggestionRail />}
              {view === "map" && <SessionDetail />}
              {view === "agenda" && (
                <>
                  <RankedList />
                  <FeaturedPanel />
                </>
              )}
              {view === "plan" && <AgendaPanel />}
              {view === "navigate" && <NavigatePanel />}
              {view === "sponsor" && <SponsorView />}
              {view === "tools" && (
                <ToolsPanel
                  tab={toolTab}
                  onTab={(next) => {
                    setToolTab(next);
                    window.history.pushState({}, "", toolsPath(next));
                  }}
                />
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>
      <BottomNav />
      <ProfileSheet />
    </div>
  );
}
