import { ExpoBoothPin } from "@/components/map/ExpoBoothPin";
import { PrefBot } from "@/components/sponsor/PrefBot";
import { Button } from "@/components/ui/button";
import type { Booth, Rank } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Locate, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePanZoom } from "./use-pan-zoom";

export interface MapPin {
  id: string;
  nx: number;
  ny: number;
  label: string;
  sublabel?: string;
  booth?: Booth;
  pref?: Rank;
  recommended?: boolean;
  mustGo?: boolean;
}

export function ImageFloorMap({
  src,
  alt,
  pins,
  selectedId,
  onSelect,
  credit,
  motion,
  focusId,
  focusToken,
  recommendedId,
}: {
  src: string;
  alt: string;
  pins: MapPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  credit: string;
  motion: boolean;
  focusId?: string | null;
  focusToken?: number;
  recommendedId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const onTap = useCallback(
    (_x: number, _y: number, target: EventTarget | null) => {
      const el = target instanceof Element ? target.closest("[data-pin-id]") : null;
      const id = el?.getAttribute("data-pin-id");
      if (id) onSelect(id);
    },
    [onSelect],
  );

  const pan = usePanZoom({ containerRef, imageSize, motion, onTap });

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setImageSize(null);
  }, [src]);

  useEffect(() => {
    if (!focusId || !imageSize || !focusToken) return;
    const pin = pins.find((p) => p.id === focusId);
    if (!pin) return;
    const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
    pan.focusPin(pin.nx, pin.ny, narrow ? 0.3 : 0.4, pin.booth ? 1.6 : 2.15);
  }, [focusToken, imageSize]);

  return (
    <div className="absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden">
      <div
        ref={containerRef}
        className="relative min-h-0 min-w-0 flex-1 cursor-grab overflow-hidden touch-none active:cursor-grabbing"
        style={{ ["--map-scale" as string]: "1" }}
        onPointerDown={pan.onPointerDown}
        onPointerMove={pan.onPointerMove}
        onPointerUp={pan.onPointerUp}
        onPointerCancel={pan.onPointerUp}
        role="application"
        aria-label={alt}
        tabIndex={0}
        onKeyDown={pan.onKeyDown}
      >
        {!loaded && !failed && (
          <div className="absolute inset-0 animate-pulse bg-map-canvas" aria-hidden="true" />
        )}
        {failed && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-sm text-muted-foreground">
            Floorplan image failed to load. Fit/pan still work once it does.
          </p>
        )}
        <div
          ref={pan.layerRef}
          className="absolute left-0 top-0 origin-top-left will-change-transform"
        >
          <div className="relative" style={{ width: imageSize?.w, height: imageSize?.h }}>
            <img
              src={src}
              alt=""
              draggable={false}
              className={cn("block max-w-none select-none", loaded ? "opacity-100" : "opacity-0")}
              onLoad={(e) => {
                const img = e.currentTarget;
                setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
                setLoaded(true);
              }}
              onError={() => setFailed(true)}
            />
            {pins.map((pin, i) => {
              const selected = selectedId === pin.id;
              const rec = recommendedId === pin.id;
              if (pin.booth) {
                return (
                  <ExpoBoothPin
                    key={pin.id}
                    pin={pin}
                    selected={selected}
                    mustGo={pin.pref === "must"}
                    motion={motion}
                    onSelect={(id) => {
                      if (pan.consumeIgnoreClick()) return;
                      onSelect(id);
                    }}
                  />
                );
              }
              return (
                <div
                  key={pin.id}
                  data-pin-id={pin.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={pin.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (pan.consumeIgnoreClick()) return;
                    onSelect(pin.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(pin.id);
                    }
                  }}
                  className={cn(
                    "pin-hit absolute z-10 flex items-center justify-center rounded-full",
                    selected && "z-20",
                  )}
                  style={{
                    left: `${pin.nx * 100}%`,
                    top: `${pin.ny * 100}%`,
                    animationDelay: motion && selected ? `${Math.min(i * 55, 480)}ms` : "0ms",
                  }}
                >
                  <span
                    className={cn(
                      "pin-mark relative flex items-center justify-center rounded-full ring-2 ring-white shadow-md",
                      selected && "ring-4 ring-primary pin-selected",
                      rec && !selected && "pin-recommended",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-[10px] font-bold",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : rec
                            ? "bg-must text-must-fg"
                            : "bg-primary/90 text-primary-foreground",
                      )}
                    >
                      {pin.sublabel?.slice(0, 3) ?? "•"}
                    </span>
                    {pin.pref && (
                      <span className="absolute -right-1.5 -top-1.5">
                        <PrefBot pref={pin.pref} delayMs={0} size="sm" showLabel={false} attention={selected || rec} />
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-2 z-30 flex flex-col gap-1">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="pointer-events-auto size-11 bg-card/95 shadow-sm"
          onClick={() => pan.zoomBy(1.2)}
          aria-label="Zoom in"
        >
          <Plus />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="pointer-events-auto size-11 bg-card/95 shadow-sm"
          onClick={() => pan.zoomBy(1 / 1.2)}
          aria-label="Zoom out"
        >
          <Minus />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="pointer-events-auto h-11 gap-1 bg-card/95 px-3 shadow-sm"
          onClick={pan.fit}
          aria-label="Fit map to screen"
        >
          <Locate className="size-4" />
          <span className="text-[11px] font-semibold">Fit</span>
        </Button>
      </div>
      <p className="pointer-events-none absolute bottom-1 left-2 max-w-[min(70%,20rem)] truncate text-[10px] text-foreground/70">
        {credit}
      </p>
    </div>
  );
}
