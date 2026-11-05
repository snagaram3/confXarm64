import { AppShell } from "@/components/layout/AppShell";
import { AppStateProvider } from "@/state/app-state";

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}
