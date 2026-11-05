import { VenueMap } from "@/components/map/VenueMap";
import { ProfileSheet } from "@/components/profile/ProfileSheet";
import { RankedList } from "@/components/sessions/RankedList";
import { SessionDetail } from "@/components/sessions/SessionDetail";
import { SponsorView } from "@/components/sponsor/SponsorView";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavigatePanel } from "@/components/wayfinding/NavigatePanel";
import { useAppState } from "@/state/app-state";
import { Navigation } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

export function AppShell() {
  const { view, startNavTo255, navigating, rankStatus, rankError } = useAppState();

  return (
    <div className="mx-auto flex h-[100svh] max-w-7xl flex-col bg-background">
      <TopBar />
      {rankStatus === "error" && (
        <div className="border-b border-maybe/40 bg-maybe/10 px-4 py-2 text-sm text-maybe">
          {rankError ?? "Cannot reach Elasticsearch."} Start it with{" "}
          <code className="font-mono">docker compose up -d</code>, then reload.
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative flex min-h-[42vh] flex-[1.15] flex-col p-3 pb-0 lg:min-h-0 lg:p-4 lg:pr-2">
          <VenueMap />
          {view !== "navigate" && !navigating && (
            <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 sm:hidden">
              <Button size="sm" onClick={startNavTo255} className="shadow-lg">
                <Navigation />
                I’m late for 255
              </Button>
            </div>
          )}
        </section>
        <aside className="flex min-h-0 flex-1 flex-col border-t border-border lg:border-l lg:border-t-0">
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-4 pb-6">
              {view === "map" && <SessionDetail />}
              {view === "agenda" && <RankedList />}
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
