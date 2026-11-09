import { motionEnabled } from "@/lib/motion";
import { useAppState } from "@/state/app-state";
import { type ReactNode, useLayoutEffect, useRef } from "react";

export function AnimatedStack({
  children,
}: {
  children: ReactNode;
}) {
  const { motionPref } = useAppState();
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>("[data-flip-id]")];
    const animate = motionEnabled(motionPref);
    if (animate) {
      for (const el of nodes) {
        const id = el.dataset.flipId;
        if (!id) continue;
        const now = el.getBoundingClientRect().top;
        const last = prev.current.get(id);
        if (last != null) {
          const dy = last - now;
          if (Math.abs(dy) > 2) {
            el.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], {
              duration: 280,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            });
          }
        }
      }
    }
    prev.current = new Map(nodes.map((el) => [el.dataset.flipId ?? "", el.getBoundingClientRect().top]));
  });

  return (
    <div ref={ref} className="flex flex-col gap-3">
      {children}
    </div>
  );
}
