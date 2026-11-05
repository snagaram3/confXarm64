import { venue } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { UserRound } from "lucide-react";

export function TopBar() {
  const { profile, setProfileOpen, esHealth, rankStatus } = useAppState();
  const searchReady = esHealth?.ok && rankStatus === "ready";

  return (
    <header className="flex items-center gap-3 px-3 py-3 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Logo />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-semibold leading-none tracking-tight">
              Floorwise
            </p>
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
              Sample catalog
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {venue.name} · seeded demo, not a live KubeCon schedule
          </p>
        </div>
      </div>
      <p
        className={cn(
          "hidden rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide sm:inline",
          searchReady
            ? "border-must/30 bg-must/10 text-must"
            : "border-border bg-card text-muted-foreground",
        )}
      >
        {searchReady ? "Search ready" : "Search warming"}
      </p>
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        className="flex min-h-11 max-w-[48%] items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-left hover:bg-accent"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground">
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
    <svg viewBox="0 0 32 32" className="size-9 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#21554c" />
      <rect x="7" y="8" width="8" height="5" rx="1.2" fill="#d7eadc" />
      <rect x="7" y="14.5" width="8" height="4" rx="1.1" fill="#f3e4c4" />
      <rect x="7" y="20" width="8" height="4" rx="1.1" fill="#e8e4dc" />
      <path
        d="M18 23 L22 17 L26 12"
        fill="none"
        stroke="#f6f3ee"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="26" cy="11" r="1.8" fill="#f6f3ee" />
    </svg>
  );
}
