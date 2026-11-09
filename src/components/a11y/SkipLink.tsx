import { useAppState } from "@/state/app-state";

export function SkipLink() {
  const { view } = useAppState();
  const label = view === "map" ? "Skip to map" : "Skip to content";
  return (
    <a href="#main-content" className="skip-link">
      {label}
    </a>
  );
}
