import { useAppState } from "@/state/app-state";

export function SkipLink() {
  const { view } = useAppState();
  const href = view === "map" ? "#map-surface" : "#main-content";
  const label = view === "map" ? "Skip to map" : "Skip to content";
  return (
    <a href={href} className="skip-link">
      {label}
    </a>
  );
}
