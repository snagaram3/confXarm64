import { toolsPath } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";
import { UserRound } from "lucide-react";

export function TopBar() {
  const { profile, setProfileOpen, esHealth, rankStatus, motionPref, setMotionPref, view, setView } =
    useAppState();
  const searchReady = esHealth?.ok && rankStatus === "ready";

  return (
    <header className="flex shrink-0 items-center gap-2 overflow-x-clip px-2 py-2 max-[500px]:py-1 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Logo />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-semibold leading-none tracking-tight">
              Floorwise
            </p>
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
              Private companion
            </span>
          </div>
          <p className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">
            KCNA26 Salt Palace + Hyatt · official schedule snapshot, not an LF/CNCF app
          </p>
        </div>
      </div>
      <button
        type="button"
        className={cn(
          "inline-flex min-h-11 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-semibold uppercase tracking-wide sm:px-3",
          view === "tools"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground hover:bg-accent",
        )}
        onClick={() => {
          setView("tools");
          window.history.pushState({}, "", toolsPath("dash0"));
        }}
      >
        Tools
      </button>
      <button
        type="button"
        className="hidden min-h-11 shrink-0 items-center rounded-full border border-border px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-accent sm:inline-flex sm:px-3"
        onClick={() => setMotionPref(motionPref === "full" ? "reduced" : "full")}
        aria-pressed={motionPref === "full"}
        title="Motion: full respects OS reduced-motion. Reduced skips camera flight and pin pops."
      >
        Motion {motionPref === "full" ? "on" : "off"}
      </button>
      <a
        href="/sponsor-portal"
        className="hidden min-h-11 items-center rounded-full border border-border px-3 text-xs font-medium text-primary hover:bg-accent md:inline-flex"
      >
        Exhibitor portal
      </a>
      <p
        className={cn(
          "hidden rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide lg:inline",
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
      <rect width="32" height="32" rx="9" fill="#113e82" />
      <rect x="7" y="8" width="8" height="5" rx="1.2" fill="#d7eadc" />
      <rect x="7" y="14.5" width="8" height="4" rx="1.1" fill="#f3e4c4" />
      <rect x="7" y="20" width="8" height="4" rx="1.1" fill="#e4e6ea" />
      <path
        d="M18 23 L22 17 L26 12"
        fill="none"
        stroke="#fefefe"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="26" cy="11" r="1.8" fill="#fefefe" />
    </svg>
  );
}
