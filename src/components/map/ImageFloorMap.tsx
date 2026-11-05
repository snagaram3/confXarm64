import { PrefBot } from "@/components/sponsor/PrefBot";
import { PrefPicker } from "@/components/sponsor/PrefPicker";
import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { Button } from "@/components/ui/button";
import type { Booth, Rank } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { usePanZoom } from "./use-pan-zoom";

export interface MapPin {
  id: string;
  nx: number;
  ny: number;
  label: string;
  sublabel?: string;
  booth?: Booth;
  pref?: Rank;
}

export function ImageFloorMap({
  src,
  alt,
  pins,
  selectedId,
  onSelect,
  onOpenDetails,
  credit,
  onPrefChange,
}: {
  src: string;
  alt: string;
  pins: MapPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenDetails?: (id: string) => void;
  credit: string;
  onPrefChange?: (boothId: string, pref: Rank | undefined) => void;
}) {
  const pan = usePanZoom();
  const selected = pins.find((p) => p.id === selectedId) ?? null;
  const logoScale = Math.min(1.35, Math.max(0.85, 1 / pan.scale));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className="relative min-h-0 flex-1 cursor-grab overflow-hidden touch-none active:cursor-grabbing"
        onWheel={pan.onWheel}
        onPointerDown={pan.onPointerDown}
        onPointerMove={pan.onPointerMove}
        onPointerUp={pan.onPointerUp}
        onPointerCancel={pan.onPointerUp}
        role="application"
        aria-label={alt}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            pan.zoomAt(pan.scale * 1.15);
          }
          if (e.key === "-" || e.key === "_") {
            e.preventDefault();
            pan.zoomAt(pan.scale / 1.15);
          }
          if (e.key === "0") {
            e.preventDefault();
            pan.reset();
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            pan.nudge(-28, 0);
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            pan.nudge(28, 0);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            pan.nudge(0, -28);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            pan.nudge(0, 28);
          }
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 origin-center"
          style={{
            transform: `translate(-50%, -50%) translate(${pan.tx}px, ${pan.ty}px) scale(${pan.scale})`,
          }}
        >
          <div className="relative">
            <img
              src={src}
              alt=""
              className="max-h-[70vh] w-auto max-w-[min(920px,92vw)] select-none"
              draggable={false}
            />
            {pins.map((pin, i) => (
              <button
                key={pin.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(pin.id);
                }}
                aria-pressed={selectedId === pin.id}
                aria-label={pin.label}
                className={cn(
                  "absolute z-10 flex items-center justify-center rounded-full shadow-md ring-2 ring-white",
                  selectedId === pin.id ? "z-20 ring-primary" : "",
                )}
                style={{
                  left: `${pin.nx * 100}%`,
                  top: `${pin.ny * 100}%`,
                  transform: `translate(-50%, -50%) scale(${logoScale})`,
                }}
              >
                {pin.booth ? (
                  <span className="relative">
                    <SponsorLogo booth={pin.booth} className="size-9 sm:size-11" />
                    <span className="absolute -right-2 -top-2">
                      <PrefBot
                        pref={pin.pref}
                        delayMs={Math.min(i * 90, 720)}
                        size="sm"
                        showLabel={false}
                      />
                    </span>
                  </span>
                ) : (
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {pin.sublabel?.slice(0, 3) ?? "•"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute right-2 top-2 z-30 flex flex-col gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="pointer-events-auto"
          onClick={() => pan.zoomAt(pan.scale * 1.2)}
          aria-label="Zoom in"
        >
          <Plus />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="pointer-events-auto"
          onClick={() => pan.zoomAt(pan.scale / 1.2)}
          aria-label="Zoom out"
        >
          <Minus />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="pointer-events-auto"
          onClick={pan.reset}
          aria-label="Reset map"
        >
          <RotateCcw />
        </Button>
      </div>
      {selected && (
        <div className="pointer-events-auto absolute bottom-8 left-3 right-3 z-30 mx-auto max-w-sm rounded-2xl border border-border bg-card/95 p-3 shadow-lg">
          {selected.booth ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <SponsorLogo booth={selected.booth} className="size-10" />
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold">
                    {selected.booth.sponsor}
                  </p>
                  <p className="font-mono text-[11px] text-primary">
                    Booth {selected.booth.boothNumber} · image-relative PDF pin
                  </p>
                </div>
                <PrefBot pref={selected.pref} size="sm" showLabel={false} />
              </div>
              <p className="text-xs text-muted-foreground">{selected.booth.tagline}</p>
              {onPrefChange && (
                <PrefPicker
                  name={selected.booth.sponsor}
                  value={selected.pref}
                  onChange={(next) => onPrefChange(selected.booth!.id, next)}
                />
              )}
              <Button type="button" onClick={() => (onOpenDetails ?? onSelect)(selected.id)}>
                Open booth details
              </Button>
            </div>
          ) : (
            <div>
              <p className="font-display text-base font-semibold">{selected.label}</p>
              {selected.sublabel && (
                <p className="text-xs text-muted-foreground">{selected.sublabel}</p>
              )}
              <Button type="button" className="mt-2" onClick={() => onSelect(selected.id)}>
                Open sessions in this room
              </Button>
            </div>
          )}
        </div>
      )}
      <p className="px-3 pb-1 text-[10px] text-muted-foreground">{credit}</p>
    </div>
  );
}
