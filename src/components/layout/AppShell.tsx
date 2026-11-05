import { SuggestionRail } from "@/components/layout/SuggestionRail";
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
import { useAppState } from "@/state/app-state";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

export function AppShell() {
  const { view } = useAppState();

  return (
    <div className="mx-auto flex h-[100svh] max-w-[1400px] flex-col bg-background">
      <TopBar />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative flex min-h-[46vh] flex-[1.4] flex-col p-3 pb-0 lg:min-h-0 lg:p-5 lg:pr-2">
          <VenueMap />
        </section>
        <aside className="flex min-h-0 flex-[0.95] flex-col border-t border-border lg:border-l lg:border-t-0">
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-4 p-4 pb-8 lg:p-6">
              <SearchStatus />
              {view !== "navigate" && <SuggestionRail />}
              {view === "map" && <SessionDetail />}
              {view === "agenda" && (
                <>
                  <FeaturedPanel />
                  <RankedList />
                </>
              )}
              {view === "plan" && <AgendaPanel />}
              {view === "navigate" && <NavigatePanel />}
              {view === "sponsor" && <SponsorView />}
            </div>
          </ScrollArea>
        </aside>
      </div>
      <BottomNav />
      <ProfileSheet />
    </div>
  );
}
