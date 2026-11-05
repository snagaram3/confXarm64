import { Button } from "@/components/ui/button";
import { venue } from "@/lib/catalog";
import { useAppState } from "@/state/app-state";
import { Navigation, UserRound } from "lucide-react";

export function TopBar() {
  const { profile, setProfileOpen, startNavTo255, navigating, view, esHealth, rankStatus } =
    useAppState();
  const esOk = esHealth?.ok && rankStatus !== "error";

  return (
    <header className="flex items-center gap-3 border-b border-border bg-card/80 px-3 py-2.5 backdrop-blur sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Logo />
        <div className="min-w-0">
          <p className="font-display text-base font-semibold leading-none tracking-tight sm:text-lg">
            Floorwise
          </p>
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
            {venue.name} · {venue.address}
          </p>
          <p
            className={
              esOk
                ? "truncate font-mono text-[10px] text-must"
                : "truncate font-mono text-[10px] text-maybe"
            }
          >
            {esOk
              ? `Elasticsearch hybrid · ${esHealth?.elasticsearch?.cluster ?? "floorwise"}`
              : "Elasticsearch offline — docker compose up -d"}
          </p>
        </div>
      </div>
      {view !== "navigate" && !navigating && (
        <Button size="sm" onClick={startNavTo255} className="hidden sm:inline-flex">
          <Navigation />
          I’m late for 255
        </Button>
      )}
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        className="flex max-w-[46%] items-center gap-2 rounded-full border border-border bg-muted/50 py-1 pl-1 pr-3 text-left hover:bg-accent"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary">
          <UserRound className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold leading-tight">
            {profile.name}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {profile.role}
          </span>
        </span>
      </button>
    </header>
  );
}

function Logo() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="size-9 shrink-0"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#134e4a" />
      <rect x="6" y="7" width="9" height="6" rx="1.5" fill="#34d399" />
      <rect x="6" y="15" width="9" height="4.5" rx="1.2" fill="#fbbf24" />
      <rect x="6" y="21.5" width="9" height="4" rx="1.2" fill="#64748b" />
      <path
        d="M18 24 L22 18 L26 12"
        fill="none"
        stroke="#5eead4"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="26" cy="11" r="2" fill="#38bdf8" />
    </svg>
  );
}
