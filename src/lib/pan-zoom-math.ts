export const DRAG_THRESHOLD_PX = 8;

export type Camera = {
  scale: number;
  tx: number;
  ty: number;
};

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Contain-and-center: entire image visible, aspect preserved. */
export function fitContain(
  cw: number,
  ch: number,
  iw: number,
  ih: number,
  padding = 12,
): Camera {
  if (cw <= 0 || ch <= 0 || iw <= 0 || ih <= 0) {
    return { scale: 1, tx: 0, ty: 0 };
  }
  const scale = Math.min((cw - padding * 2) / iw, (ch - padding * 2) / ih);
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    scale: s,
    tx: (cw - iw * s) / 2,
    ty: (ch - ih * s) / 2,
  };
}

/** Keep the world point under (cx, cy) stationary while scaling. */
export function zoomAtPoint(
  cam: Camera,
  cx: number,
  cy: number,
  nextScale: number,
): Camera {
  const wx = (cx - cam.tx) / cam.scale;
  const wy = (cy - cam.ty) / cam.scale;
  return {
    scale: nextScale,
    tx: cx - wx * nextScale,
    ty: cy - wy * nextScale,
  };
}

/** Place a normalized image point at a container bias (0.5, 0.5 = center). */
export function focusOn(
  nx: number,
  ny: number,
  iw: number,
  ih: number,
  cw: number,
  ch: number,
  scale: number,
  biasX = 0.5,
  biasY = 0.42,
): Camera {
  return {
    scale,
    tx: cw * biasX - nx * iw * scale,
    ty: ch * biasY - ny * ih * scale,
  };
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

export function isDrag(dx: number, dy: number, threshold = DRAG_THRESHOLD_PX): boolean {
  return Math.hypot(dx, dy) >= threshold;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpCamera(from: Camera, to: Camera, t: number): Camera {
  return {
    scale: lerp(from.scale, to.scale, t),
    tx: lerp(from.tx, to.tx, t),
    ty: lerp(from.ty, to.ty, t),
  };
}
