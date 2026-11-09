import { PALETTE } from "@/theme/tokens";

export function MapLegend() {
  return (
    <div className="fg-chrome-pill flex flex-wrap items-center gap-3 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[color:var(--fg-muted)]">
      <LegendDot color={PALETTE.must} label="Must go" />
      <LegendDot color={PALETTE.maybe} label="Maybe" />
      <LegendDot color={PALETTE.meh} label="Meh" />
      <LegendDot color={PALETTE.unrated} label="Unrated" />
      <LegendDot color={PALETTE.path} label="Path" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
