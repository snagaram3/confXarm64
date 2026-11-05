import { useCallback, useRef, useState, type PointerEvent as PE, type WheelEvent } from "react";

export function usePanZoom() {
  const [scale, setScale] = useState(1.15);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const zoomAt = useCallback((next: number) => {
    setScale(Math.min(4, Math.max(0.7, next)));
  }, []);

  const onWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    setScale((s) => Math.min(4, Math.max(0.7, s * delta)));
  }, []);

  const onPointerDown = useCallback((e: PE<HTMLDivElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, tx, ty };
  }, [tx, ty]);

  const onPointerMove = useCallback((e: PE<HTMLDivElement>) => {
    if (!drag.current) return;
    setTx(drag.current.tx + (e.clientX - drag.current.x));
    setTy(drag.current.ty + (e.clientY - drag.current.y));
  }, []);

  const onPointerUp = useCallback(() => {
    drag.current = null;
  }, []);

  const nudge = useCallback((dx: number, dy: number) => {
    setTx((v) => v + dx);
    setTy((v) => v + dy);
  }, []);

  const reset = useCallback(() => {
    setScale(1.15);
    setTx(0);
    setTy(0);
  }, []);

  return { scale, tx, ty, zoomAt, nudge, onWheel, onPointerDown, onPointerMove, onPointerUp, reset };
}
