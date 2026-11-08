import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { cn } from "@/lib/utils";
import type { Booth } from "@/lib/types";
import { Star } from "lucide-react";
import { useState } from "react";
import type { MapPin } from "./ImageFloorMap";

export function ExpoBoothMark({
  booth,
  selected,
  mustGo,
  motion,
  hot,
  compact = false,
}: {
  booth: Booth;
  selected: boolean;
  mustGo: boolean;
  motion: boolean;
  hot: boolean;
  compact?: boolean;
}) {
  const showName = selected || hot;
  const showMustCopy = selected || hot;

  return (
    <span
      className={cn(
        "pin-mark relative flex items-center justify-center rounded-full bg-card shadow-md ring-2 ring-white",
        compact ? "size-11" : "size-12 sm:size-[3.15rem]",
        selected && "ring-4 ring-primary",
        mustGo && "pin-must-ring",
        selected && motion && "pin-selected",
        mustGo && motion && !selected && "pin-must-halo",
      )}
    >
      <SponsorLogo booth={booth} className={compact ? "size-9" : "size-10 sm:size-11"} />
      {mustGo && (
        <span className="absolute -right-2 -top-2 inline-flex min-h-6 items-center gap-0.5 rounded-full bg-highlight px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-highlight-fg shadow">
          <Star className="size-3 fill-current" aria-hidden="true" />
          {showMustCopy ? "Must go" : <span className="sr-only">Must go</span>}
        </span>
      )}
      {showName && (
        <span
          className={cn(
            "pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-40 w-max max-w-[9.5rem] -translate-x-1/2 rounded-md px-1.5 py-0.5 text-center text-[10px] font-semibold leading-tight shadow",
            selected ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
          )}
        >
          {booth.sponsor.replace(/,.*/, "")}
          <span className="block font-mono text-[9px] opacity-80">#{booth.boothNumber}</span>
        </span>
      )}
    </span>
  );
}

export function ExpoBoothHtmlPin({
  booth,
  selected,
  mustGo,
  motion,
  onSelect,
}: {
  booth: Booth;
  selected: boolean;
  mustGo: boolean;
  motion: boolean;
  onSelect: (id: string) => void;
}) {
  const [hot, setHot] = useState(false);
  return (
    <button
      type="button"
      data-booth-id={booth.id}
      data-must-go={mustGo ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
      aria-pressed={selected}
      aria-label={`${booth.sponsor}, booth ${booth.boothNumber}${mustGo ? ", Must go" : ""}${selected ? ", selected" : ""}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(booth.id);
      }}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      className={cn("relative flex items-center justify-center rounded-full", selected ? "z-30" : mustGo ? "z-20" : "z-10")}
    >
      <ExpoBoothMark booth={booth} selected={selected} mustGo={mustGo} motion={motion} hot={hot} compact />
    </button>
  );
}

export function ExpoBoothPin({
  pin,
  selected,
  mustGo,
  motion,
  onSelect,
}: {
  pin: MapPin;
  selected: boolean;
  mustGo: boolean;
  motion: boolean;
  onSelect: (id: string) => void;
}) {
  const [hot, setHot] = useState(false);
  const booth = pin.booth;
  if (!booth) return null;

  return (
    <div
      data-pin-id={pin.id}
      data-booth-id={pin.id}
      data-must-go={mustGo ? "true" : "false"}
      data-selected={selected ? "true" : "false"}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${booth.sponsor}, booth ${booth.boothNumber}${mustGo ? ", Must go" : ""}${selected ? ", selected" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(pin.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(pin.id);
        }
      }}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      className={cn(
        "pin-hit absolute flex items-center justify-center rounded-full",
        selected ? "z-30" : mustGo ? "z-20" : "z-10",
      )}
      style={{
        left: `${pin.nx * 100}%`,
        top: `${pin.ny * 100}%`,
      }}
    >
      <ExpoBoothMark booth={booth} selected={selected} mustGo={mustGo} motion={motion} hot={hot} />
    </div>
  );
}
