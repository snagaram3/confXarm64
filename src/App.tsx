import { AppShell } from "@/components/layout/AppShell";
import { ConnectPage } from "@/pages/ConnectPage";
import { SponsorPortalApp } from "@/pages/SponsorPortalApp";
import { AppStateProvider } from "@/state/app-state";

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/sponsor-portal" || path.startsWith("/sponsor-portal/")) {
    return <SponsorPortalApp path={path} />;
  }
  const connect = /^\/connect\/([^/]+)$/.exec(path);
  if (connect) {
    return <ConnectPage sponsorId={decodeURIComponent(connect[1])} />;
  }
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}
