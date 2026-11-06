import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  type Camera,
  clamp,
  dist,
  easeOutCubic,
  fitContain,
  focusOn,
  isDrag,
  lerpCamera,
  zoomAtPoint,
} from "@/lib/pan-zoom-math";

type Pointer = { x: number; y: number };

export function usePanZoom({
  containerRef,
  imageSize,
  motion,
  onTap,
}: {
  containerRef: RefObject<HTMLElement | null>;
  imageSize: { w: number; h: number } | null;
  motion: boolean;
  onTap?: (clientX: number, clientY: number, target: EventTarget | null) => void;
}) {
  const cam = useRef<Camera>({ scale: 1, tx: 0, ty: 0 });
  const layerRef = useRef<HTMLDivElement | null>(null);
  const userAdjusted = useRef(false);
  const pointers = useRef<Map<number, Pointer>>(new Map());
  const pinch = useRef<{ dist: number; midX: number; midY: number; cam: Camera } | null>(null);
  const drag = useRef<{ x: number; y: number; cam: Camera; moved: boolean } | null>(null);
  const raf = useRef<number>(0);
  const ignoreClick = useRef(false);

  const apply = useCallback((next: Camera) => {
    cam.current = next;
    const el = layerRef.current;
    const box = containerRef.current;
    if (el) {
      el.style.transform = `translate(${next.tx}px, ${next.ty}px) scale(${next.scale})`;
    }
    if (box) box.style.setProperty("--map-scale", String(next.scale));
  }, [containerRef]);

  const measure = useCallback(() => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return null;
    return { cw: box.width, ch: box.height, left: box.left, top: box.top };
  }, [containerRef]);

  const fit = useCallback(() => {
    const m = measure();
    if (!m || !imageSize || m.cw < 40 || m.ch < 40) return;
    userAdjusted.current = false;
    apply(fitContain(m.cw, m.ch, imageSize.w, imageSize.h));
  }, [apply, imageSize, measure]);

  const zoomBy = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const m = measure();
      if (!m || !imageSize) return;
      const fitCam = fitContain(m.cw, m.ch, imageSize.w, imageSize.h);
      const min = fitCam.scale * 0.92;
      const max = fitCam.scale * 8;
      const originX = cx ?? m.cw / 2;
      const originY = cy ?? m.ch / 2;
      userAdjusted.current = true;
      apply(zoomAtPoint(cam.current, originX, originY, clamp(cam.current.scale * factor, min, max)));
    },
    [apply, imageSize, measure],
  );

  const flyTo = useCallback(
    (next: Camera) => {
      if (!motion) {
        apply(next);
        return;
      }
      const from = cam.current;
      const start = performance.now();
      const dur = 420;
      cancelAnimationFrame(raf.current);
      const tick = (now: number) => {
        const t = easeOutCubic(Math.min(1, (now - start) / dur));
        apply(lerpCamera(from, next, t));
        if (t < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [apply, motion],
  );

  const focusPin = useCallback(
    (nx: number, ny: number, biasY = 0.42) => {
      const m = measure();
      if (!m || !imageSize) return;
      const fitCam = fitContain(m.cw, m.ch, imageSize.w, imageSize.h);
      const scale = clamp(fitCam.scale * 2.15, fitCam.scale * 1.35, fitCam.scale * 4);
      userAdjusted.current = true;
      flyTo(focusOn(nx, ny, imageSize.w, imageSize.h, m.cw, m.ch, scale, 0.5, biasY));
    },
    [flyTo, imageSize, measure],
  );

  useEffect(() => {
    fit();
    const id = requestAnimationFrame(() => fit());
    return () => cancelAnimationFrame(id);
  }, [fit]);

  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => {
      if (!userAdjusted.current) fit();
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, [containerRef, fit]);

  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const m = measure();
      if (!m) return;
      const factor = e.deltaY > 0 ? 0.9 : 1.12;
      zoomBy(factor, e.clientX - m.left, e.clientY - m.top);
    };
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [containerRef, measure, zoomBy]);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: dist(a.x, a.y, b.x, b.y),
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        cam: cam.current,
      };
      drag.current = null;
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, cam: cam.current, moved: false };
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2 && pinch.current) {
        const m = measure();
        if (!m || !imageSize) return;
        const [a, b] = [...pointers.current.values()];
        const d = dist(a.x, a.y, b.x, b.y);
        const midX = (a.x + b.x) / 2 - m.left;
        const midY = (a.y + b.y) / 2 - m.top;
        const fitCam = fitContain(m.cw, m.ch, imageSize.w, imageSize.h);
        const factor = d / Math.max(1, pinch.current.dist);
        const nextScale = clamp(pinch.current.cam.scale * factor, fitCam.scale * 0.92, fitCam.scale * 8);
        userAdjusted.current = true;
        const zoomed = zoomAtPoint(pinch.current.cam, midX, midY, nextScale);
        const pMidX = pinch.current.midX - m.left;
        const pMidY = pinch.current.midY - m.top;
        apply({
          ...zoomed,
          tx: zoomed.tx + (midX - pMidX),
          ty: zoomed.ty + (midY - pMidY),
        });
        return;
      }
      if (drag.current) {
        const dx = e.clientX - drag.current.x;
        const dy = e.clientY - drag.current.y;
        if (isDrag(dx, dy)) drag.current.moved = true;
        if (drag.current.moved) {
          userAdjusted.current = true;
          apply({
            scale: drag.current.cam.scale,
            tx: drag.current.cam.tx + dx,
            ty: drag.current.cam.ty + dy,
          });
        }
      }
    },
    [apply, imageSize, measure],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const start = drag.current;
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      if (pointers.current.size === 0) {
        const moved = start?.moved ?? false;
        drag.current = null;
        ignoreClick.current = moved;
        if (!moved) onTap?.(e.clientX, e.clientY, e.target);
      }
    },
    [onTap],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const m = measure();
      if (!m) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomBy(1.18);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomBy(1 / 1.18);
      } else if (e.key === "0" || e.key.toLowerCase() === "f") {
        e.preventDefault();
        fit();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        userAdjusted.current = true;
        apply({ ...cam.current, tx: cam.current.tx + 36 });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        userAdjusted.current = true;
        apply({ ...cam.current, tx: cam.current.tx - 36 });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        userAdjusted.current = true;
        apply({ ...cam.current, ty: cam.current.ty + 36 });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        userAdjusted.current = true;
        apply({ ...cam.current, ty: cam.current.ty - 36 });
      }
    },
    [apply, fit, measure, zoomBy],
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const consumeIgnoreClick = useCallback(() => {
    const v = ignoreClick.current;
    ignoreClick.current = false;
    return v;
  }, []);

  return { layerRef, fit, zoomBy, focusPin, onPointerDown, onPointerMove, onPointerUp, onKeyDown, consumeIgnoreClick };
}
